from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from bson import ObjectId
import base64, json
from core import db, CurrentUser, now_iso, today_str, clean, add_xp, groq_vision, oid

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

ALLOWED_PHOTO_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 10 * 1024 * 1024  # 10 MB


class FoodIn(BaseModel):
    name: str
    calories: float
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    date: str | None = None

class GoalIn(BaseModel):
    goal: str = "Maintain weight"
    calories: float = 2200
    protein: float = 150
    carbs: float = 220
    fat: float = 70


@router.get("/log")
async def list_log(date: str = Query(None), user: dict = CurrentUser):
    q = {"user_id": user["id"]}
    if date:
        q["date"] = date
    items = await db.food_logs.find(q).sort("created_at", -1).to_list(500)
    return [clean(i) for i in items]


@router.post("/log")
async def add_food(body: FoodIn, user: dict = CurrentUser):
    doc = {"user_id": user["id"], **body.model_dump(exclude={"date"}),
           "date": body.date or today_str(), "created_at": now_iso()}
    res = await db.food_logs.insert_one(doc)
    await add_xp(user["id"], 5)
    return clean({**doc, "_id": res.inserted_id})


@router.delete("/log/{fid}")
async def del_food(fid: str, user: dict = CurrentUser):
    await db.food_logs.delete_one({"_id": oid(fid), "user_id": user["id"]})
    return {"ok": True}


@router.post("/analyze-photo")
async def analyze_photo(file: UploadFile = File(...), user: dict = CurrentUser):
    data = await file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Image too large. Maximum size is 10 MB.")
    mime = file.content_type or "image/jpeg"
    if mime not in ALLOWED_PHOTO_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported image type '{mime}'. Use JPEG, PNG, or WebP.")
    b64 = base64.b64encode(data).decode()
    prompt = ('Analyze this meal photo. Estimate nutrition. Return ONLY JSON with keys: '
              '"name" (short dish name), "calories" (number), "protein" (grams number), '
              '"carbs" (grams number), "fat" (grams number), "confidence" (low/medium/high). '
              'Estimate realistic per-serving values. If unsure, give best estimate.')
    raw = groq_vision(prompt, b64, mime=mime, json_mode=True, max_tokens=400)
    try:
        est = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not analyze the photo. Try again or log manually.")
    return {
        "name": est.get("name", "Meal"),
        "calories": float(est.get("calories", 0) or 0),
        "protein": float(est.get("protein", 0) or 0),
        "carbs": float(est.get("carbs", 0) or 0),
        "fat": float(est.get("fat", 0) or 0),
        "confidence": est.get("confidence", "medium"),
    }


@router.get("/goal")
async def get_goal(user: dict = CurrentUser):
    g = await db.nutrition_goals.find_one({"user_id": user["id"]})
    if not g:
        return {"goal": "Maintain weight", "calories": 2200, "protein": 150, "carbs": 220, "fat": 70}
    return clean(g)


@router.post("/goal")
async def set_goal(body: GoalIn, user: dict = CurrentUser):
    await db.nutrition_goals.update_one({"user_id": user["id"]},
                                        {"$set": {"user_id": user["id"], **body.model_dump()}}, upsert=True)
    g = await db.nutrition_goals.find_one({"user_id": user["id"]})
    return clean(g)


async def nutrition_summary(user_id: str):
    today = today_str()
    items = await db.food_logs.find({"user_id": user_id, "date": today}).to_list(200)
    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for i in items:
        for k in totals:
            totals[k] += i.get(k, 0)
    g = await db.nutrition_goals.find_one({"user_id": user_id}) or {"calories": 2200, "protein": 150, "carbs": 220, "fat": 70, "goal": "Maintain weight"}
    return {
        "today": {k: round(v, 1) for k, v in totals.items()},
        "goal": {"goal": g.get("goal", "Maintain weight"), "calories": g.get("calories", 2200),
                 "protein": g.get("protein", 150), "carbs": g.get("carbs", 220), "fat": g.get("fat", 70)},
        "meals_logged": len(items),
    }


@router.get("/summary")
async def summary(user: dict = CurrentUser):
    return await nutrition_summary(user["id"])
