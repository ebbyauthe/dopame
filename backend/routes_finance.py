from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
from collections import defaultdict
import os
from core import db, CurrentUser, now_iso, today_str, clean, add_xp

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest

router = APIRouter(prefix="/api/finance", tags=["finance"])

_env = {"sandbox": plaid.Environment.Sandbox, "production": plaid.Environment.Production}
_config = plaid.Configuration(
    host=_env.get(os.environ.get("PLAID_ENV", "sandbox"), plaid.Environment.Sandbox),
    api_key={"clientId": os.environ["PLAID_CLIENT_ID"], "secret": os.environ["PLAID_SECRET"]},
)
plaid_client = plaid_api.PlaidApi(plaid.ApiClient(_config))


class ExchangeIn(BaseModel):
    public_token: str

class ManualTxn(BaseModel):
    name: str
    amount: float
    flow: str  # income | expense
    category: str = "Other"
    date: str | None = None

class AssetIn(BaseModel):
    name: str
    value: float
    kind: str  # asset | liability
    category: str = "Cash"


@router.post("/plaid/link-token")
async def create_link_token(user: dict = CurrentUser):
    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=user["id"]),
        client_name="Dopame",
        products=[Products("transactions")],
        country_codes=[CountryCode("US")],
        language="en",
    )
    try:
        resp = plaid_client.link_token_create(req)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Plaid error: {e}")
    return {"link_token": resp["link_token"]}


@router.post("/plaid/exchange")
async def exchange_public_token(body: ExchangeIn, user: dict = CurrentUser):
    try:
        resp = plaid_client.item_public_token_exchange(ItemPublicTokenExchangeRequest(public_token=body.public_token))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Plaid error: {e}")
    access_token = resp["access_token"]; item_id = resp["item_id"]
    inst = None
    try:
        acc = plaid_client.accounts_get(AccountsGetRequest(access_token=access_token))
        inst = acc.get("item", {}).get("institution_id")
    except Exception:
        pass
    await db.plaid_items.update_one(
        {"user_id": user["id"], "item_id": item_id},
        {"$set": {"user_id": user["id"], "access_token": access_token, "item_id": item_id,
                  "institution": inst, "cursor": None, "created_at": now_iso()}}, upsert=True)
    await add_xp(user["id"], 50)
    await _sync_user(user["id"])
    return {"ok": True, "item_id": item_id}


async def _sync_user(user_id: str):
    items = await db.plaid_items.find({"user_id": user_id}).to_list(50)
    total_added = 0
    for item in items:
        cursor = item.get("cursor")
        has_more = True
        while has_more:
            try:
                req = TransactionsSyncRequest(access_token=item["access_token"], cursor=cursor or "", count=200)
                resp = plaid_client.transactions_sync(req)
            except Exception:
                break
            for tx in resp["added"]:
                amt = float(tx["amount"])
                flow = "income" if amt < 0 else "expense"
                pfc = tx.get("personal_finance_category") or {}
                cat = (pfc.get("primary") or (tx.get("category") or ["Other"])[0]).replace("_", " ").title()
                d = tx["date"]
                d = d.isoformat() if hasattr(d, "isoformat") else str(d)
                await db.transactions.update_one(
                    {"txn_id": tx["transaction_id"]},
                    {"$set": {"txn_id": tx["transaction_id"], "user_id": user_id, "account_id": tx["account_id"],
                              "name": tx["name"], "amount": abs(amt), "flow": flow, "category": cat,
                              "date": d, "source": "plaid", "pending": tx.get("pending", False)}}, upsert=True)
                total_added += 1
            for tx in resp["removed"]:
                await db.transactions.delete_one({"txn_id": tx["transaction_id"]})
            cursor = resp["next_cursor"]; has_more = resp["has_more"]
        await db.plaid_items.update_one({"_id": item["_id"]}, {"$set": {"cursor": cursor}})
    return total_added


@router.post("/sync")
async def sync(user: dict = CurrentUser):
    n = await _sync_user(user["id"])
    return {"synced": n}


@router.get("/accounts")
async def accounts(user: dict = CurrentUser):
    items = await db.plaid_items.find({"user_id": user["id"]}).to_list(50)
    out = []
    for item in items:
        try:
            resp = plaid_client.accounts_get(AccountsGetRequest(access_token=item["access_token"]))
        except Exception:
            continue
        for a in resp["accounts"]:
            b = a["balances"]
            out.append({"account_id": a["account_id"], "name": a.get("name"),
                        "official_name": a.get("official_name"), "type": str(a.get("type")),
                        "subtype": str(a.get("subtype")), "mask": a.get("mask"),
                        "current": b.get("current"), "available": b.get("available"),
                        "currency": b.get("iso_currency_code") or "USD"})
    return out


@router.get("/transactions")
async def transactions(user: dict = CurrentUser):
    txns = await db.transactions.find({"user_id": user["id"]}).sort("date", -1).to_list(300)
    return [clean(t) for t in txns]


@router.post("/transactions")
async def add_transaction(body: ManualTxn, user: dict = CurrentUser):
    doc = {"user_id": user["id"], "txn_id": f"manual_{ObjectId()}", "name": body.name,
           "amount": abs(body.amount), "flow": body.flow, "category": body.category,
           "date": body.date or today_str(), "source": "manual", "pending": False}
    res = await db.transactions.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@router.delete("/transactions/{txn_id}")
async def del_transaction(txn_id: str, user: dict = CurrentUser):
    await db.transactions.delete_one({"_id": ObjectId(txn_id), "user_id": user["id"]})
    return {"ok": True}


# ---------- Net worth assets ----------
@router.get("/assets")
async def list_assets(user: dict = CurrentUser):
    items = await db.assets.find({"user_id": user["id"]}).to_list(200)
    return [clean(a) for a in items]


@router.post("/assets")
async def add_asset(body: AssetIn, user: dict = CurrentUser):
    doc = {"user_id": user["id"], **body.model_dump(), "created_at": now_iso()}
    res = await db.assets.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@router.delete("/assets/{asset_id}")
async def del_asset(asset_id: str, user: dict = CurrentUser):
    await db.assets.delete_one({"_id": ObjectId(asset_id), "user_id": user["id"]})
    return {"ok": True}


async def finance_summary(user_id: str):
    txns = await db.transactions.find({"user_id": user_id}).to_list(5000)
    month = today_str()[:7]
    m_income = sum(t["amount"] for t in txns if t["flow"] == "income" and t["date"][:7] == month)
    m_expense = sum(t["amount"] for t in txns if t["flow"] == "expense" and t["date"][:7] == month)
    savings_rate = round(((m_income - m_expense) / m_income) * 100) if m_income > 0 else 0

    cat = defaultdict(float)
    for t in txns:
        if t["flow"] == "expense" and t["date"][:7] == month:
            cat[t["category"]] += t["amount"]
    categories = sorted([{"category": k, "amount": round(v, 2)} for k, v in cat.items()], key=lambda x: -x["amount"])[:8]

    # 6-month trend
    months = {}
    for t in txns:
        mk = t["date"][:7]
        months.setdefault(mk, {"income": 0, "expense": 0})
        months[mk][t["flow"]] += t["amount"]
    trend = []
    for mk in sorted(months.keys())[-6:]:
        v = months[mk]
        trend.append({"month": mk, "income": round(v["income"], 2), "expense": round(v["expense"], 2)})

    # net worth
    assets = await db.assets.find({"user_id": user_id}).to_list(500)
    manual_assets = sum(a["value"] for a in assets if a["kind"] == "asset")
    liabilities = sum(a["value"] for a in assets if a["kind"] == "liability")
    bank_total = 0.0
    items = await db.plaid_items.find({"user_id": user_id}).to_list(50)
    for item in items:
        try:
            resp = plaid_client.accounts_get(AccountsGetRequest(access_token=item["access_token"]))
            for a in resp["accounts"]:
                st = str(a.get("type"))
                cur = a["balances"].get("current") or 0
                if st in ("depository", "investment"):
                    bank_total += cur
                elif st in ("credit", "loan"):
                    liabilities += cur
        except Exception:
            pass
    net_worth = round(bank_total + manual_assets - liabilities, 2)

    return {
        "month_income": round(m_income, 2), "month_expense": round(m_expense, 2),
        "savings_rate": savings_rate, "net_worth": net_worth, "bank_total": round(bank_total, 2),
        "assets_total": round(manual_assets + bank_total, 2), "liabilities_total": round(liabilities, 2),
        "categories": categories, "trend": trend,
        "connected": len(items) > 0, "txn_count": len(txns),
    }


@router.get("/summary")
async def summary(user: dict = CurrentUser):
    return await finance_summary(user["id"])
