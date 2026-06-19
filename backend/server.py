from core import (db, hash_password, verify_password, now_iso, logger, GROQ_API_KEY)
import os
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.habit_logs.create_index([("habit_id", 1), ("date", 1)])
    await db.transactions.create_index("txn_id", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "demo@dopame.app")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Dopame123!")
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
