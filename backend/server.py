import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from core import db, hash_password, verify_password, now_iso

logger = logging.getLogger("dopame")

from routes_auth import router as auth_router
from routes_tracking import router as tracking_router
from routes_finance import router as finance_router
from routes_fitness import router as fitness_router
from routes_nutrition import router as nutrition_router
from routes_comm import router as comm_router
from routes_coach import router as coach_router

app = FastAPI(title="Dopame API")


@app.get("/api/")
async def root():
    return {"message": "Dopame API running", "version": "2.0"}


for r in (auth_router, tracking_router, finance_router, fitness_router,
          nutrition_router, comm_router, coach_router):
    app.include_router(r)

def cors_origins():
    origins = os.environ.get("FRONTEND_URLS") or os.environ.get("FRONTEND_URL", "http://localhost:3000")
    return [origin.strip().rstrip("/") for origin in origins.split(",") if origin.strip()]


_cors_kwargs = dict(
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
_origin_regex = os.environ.get("FRONTEND_ORIGIN_REGEX")
if _origin_regex:
    _cors_kwargs["allow_origin_regex"] = _origin_regex

app.add_middleware(CORSMiddleware, **_cors_kwargs)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.habit_logs.create_index([("habit_id", 1), ("date", 1)])
    await db.transactions.create_index("txn_id", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_pw = os.environ.get("ADMIN_PASSWORD")
    if not admin_email or not admin_pw:
        logger.warning("ADMIN_EMAIL / ADMIN_PASSWORD not set — demo account not seeded.")
    else:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({"name": "Alex Demo", "email": admin_email,
                                       "password_hash": hash_password(admin_pw), "role": "admin",
                                       "bio": "Building better systems, one day at a time.", "xp": 0,
                                       "created_at": now_iso()})
        elif not verify_password(admin_pw, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})


@app.on_event("shutdown")
async def shutdown():
    db.client.close() if hasattr(db, "client") else None
