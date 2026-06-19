from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import List, Optional, Annotated
from datetime import datetime, timezone, timedelta, date
from bson import ObjectId
import bcrypt
import jwt
import logging
from groq import Groq

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Dopame API")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dopame")

# ---------- Helpers ----------
PyObjectId = Annotated[str, BeforeValidator(str)]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=False, samesite="lax", max_age=604800, path="/")


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Schemas ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class HabitIn(BaseModel):
    name: str
    icon: str = "Target"
    color: str = "orange"


class GoalMilestone(BaseModel):
    id: str
    title: str
    done: bool = False


class GoalIn(BaseModel):
    title: str
    description: str = ""
    category: str = "Personal"
    target_date: Optional[str] = None
    milestones: List[dict] = []


class JournalIn(BaseModel):
    mood: int = 3
    content: str
    date: Optional[str] = None


class ChatIn(BaseModel):
    message: str


def clean(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"name": body.name, "email": email,
           "password_hash": hash_password(body.password),
           "role": "user", "bio": "", "avatar": "",
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    return {"id": uid, "name": body.name, "email": email, "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    return {"id": uid, "name": user["name"], "email": email, "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


class ProfileIn(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None


@api.put("/auth/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    fresh["id"] = str(fresh.pop("_id"))
    fresh.pop("password_hash", None)
    return fresh


# ---------- Streak util ----------
async def compute_streak(habit_id: str, user_id: str) -> int:
    logs = await db.habit_logs.find(
        {"habit_id": habit_id, "user_id": user_id, "completed": True}
    ).to_list(1000)
    done_dates = {l["date"] for l in logs}
    streak = 0
    d = datetime.now(timezone.utc).date()
    # allow streak to count from today or yesterday
    if today_str() not in done_dates:
        d = d - timedelta(days=1)
    while d.strftime("%Y-%m-%d") in done_dates:
        streak += 1
        d = d - timedelta(days=1)
    return streak


# ---------- Habits ----------
@api.get("/habits")
async def list_habits(user: dict = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user["id"], "archived": {"$ne": True}}).to_list(500)
    today = today_str()
    out = []
    for h in habits:
        h = clean(h)
        log = await db.habit_logs.find_one({"habit_id": h["id"], "user_id": user["id"], "date": today})
        h["done_today"] = bool(log and log.get("completed"))
        h["streak"] = await compute_streak(h["id"], user["id"])
        logs = await db.habit_logs.find({"habit_id": h["id"], "user_id": user["id"], "completed": True}).to_list(1000)
        h["history"] = sorted([l["date"] for l in logs])
        h["total_completions"] = len(logs)
        out.append(h)
    return out


@api.post("/habits")
async def create_habit(body: HabitIn, user: dict = Depends(get_current_user)):
    doc = {"user_id": user["id"], "name": body.name, "icon": body.icon,
           "color": body.color, "archived": False,
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.habits.insert_one(doc)
    return {"id": str(res.inserted_id), "done_today": False, "streak": 0, "history": [], "total_completions": 0, **{k: doc[k] for k in ("name", "icon", "color")}}


@api.post("/habits/{habit_id}/toggle")
async def toggle_habit(habit_id: str, user: dict = Depends(get_current_user)):
    today = today_str()
    log = await db.habit_logs.find_one({"habit_id": habit_id, "user_id": user["id"], "date": today})
    if log:
        new_val = not log.get("completed", False)
        await db.habit_logs.update_one({"_id": log["_id"]}, {"$set": {"completed": new_val}})
    else:
        await db.habit_logs.insert_one({"habit_id": habit_id, "user_id": user["id"], "date": today, "completed": True})
    streak = await compute_streak(habit_id, user["id"])
    log2 = await db.habit_logs.find_one({"habit_id": habit_id, "user_id": user["id"], "date": today})
    return {"done_today": bool(log2 and log2.get("completed")), "streak": streak}


@api.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user: dict = Depends(get_current_user)):
    await db.habits.update_one({"_id": ObjectId(habit_id), "user_id": user["id"]}, {"$set": {"archived": True}})
    return {"ok": True}


# ---------- Goals ----------
@api.get("/goals")
async def list_goals(user: dict = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    out = []
    for g in goals:
        g = clean(g)
        ms = g.get("milestones", [])
        total = len(ms)
        done = len([m for m in ms if m.get("done")])
        g["progress"] = round((done / total) * 100) if total else 0
        g["completed"] = total > 0 and done == total
        out.append(g)
    return out


@api.post("/goals")
async def create_goal(body: GoalIn, user: dict = Depends(get_current_user)):
    doc = {"user_id": user["id"], "title": body.title, "description": body.description,
           "category": body.category, "target_date": body.target_date,
           "milestones": body.milestones,
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.goals.insert_one(doc)
    g = clean({**doc, "_id": res.inserted_id})
    g["progress"] = 0
    g["completed"] = False
    return g


@api.put("/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalIn, user: dict = Depends(get_current_user)):
    await db.goals.update_one(
        {"_id": ObjectId(goal_id), "user_id": user["id"]},
        {"$set": body.model_dump()})
    g = await db.goals.find_one({"_id": ObjectId(goal_id)})
    g = clean(g)
    ms = g.get("milestones", [])
    total = len(ms); done = len([m for m in ms if m.get("done")])
    g["progress"] = round((done / total) * 100) if total else 0
    g["completed"] = total > 0 and done == total
    return g


@api.post("/goals/{goal_id}/milestone/{ms_id}/toggle")
async def toggle_milestone(goal_id: str, ms_id: str, user: dict = Depends(get_current_user)):
    g = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    ms = g.get("milestones", [])
    for m in ms:
        if m.get("id") == ms_id:
            m["done"] = not m.get("done", False)
    await db.goals.update_one({"_id": g["_id"]}, {"$set": {"milestones": ms}})
    g = clean({**g, "milestones": ms})
    total = len(ms); done = len([m for m in ms if m.get("done")])
    g["progress"] = round((done / total) * 100) if total else 0
    g["completed"] = total > 0 and done == total
    return g


@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    await db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    return {"ok": True}


# ---------- Journal ----------
@api.get("/journal")
async def list_journal(user: dict = Depends(get_current_user)):
    entries = await db.journal_entries.find({"user_id": user["id"]}).sort("date", -1).to_list(500)
    return [clean(e) for e in entries]


@api.post("/journal")
async def create_journal(body: JournalIn, user: dict = Depends(get_current_user)):
    doc = {"user_id": user["id"], "mood": body.mood, "content": body.content,
           "date": body.date or today_str(),
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.journal_entries.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@api.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, user: dict = Depends(get_current_user)):
    await db.journal_entries.delete_one({"_id": ObjectId(entry_id), "user_id": user["id"]})
    return {"ok": True}


# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    uid = user["id"]
    habits = await db.habits.find({"user_id": uid, "archived": {"$ne": True}}).to_list(500)
    today = today_str()
    completed_today = 0
    best_streak = 0
    streaks = []
    for h in habits:
        hid = str(h["_id"])
        log = await db.habit_logs.find_one({"habit_id": hid, "user_id": uid, "date": today})
        if log and log.get("completed"):
            completed_today += 1
        s = await compute_streak(hid, uid)
        streaks.append(s)
        best_streak = max(best_streak, s)
    goals = await db.goals.find({"user_id": uid}).to_list(500)
    goal_progress = []
    for g in goals:
        ms = g.get("milestones", [])
        total = len(ms); done = len([m for m in ms if m.get("done")])
        goal_progress.append(round((done / total) * 100) if total else 0)
    avg_goal = round(sum(goal_progress) / len(goal_progress)) if goal_progress else 0
    journal_count = await db.journal_entries.count_documents({"user_id": uid})

    # weekly completion chart (last 7 days)
    week = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).strftime("%Y-%m-%d")
        cnt = await db.habit_logs.count_documents({"user_id": uid, "date": d, "completed": True})
        label = (datetime.now(timezone.utc).date() - timedelta(days=i)).strftime("%a")
        week.append({"day": label, "date": d, "completed": cnt})

    # mood trend (last 7 entries)
    moods = await db.journal_entries.find({"user_id": uid}).sort("date", -1).to_list(7)
    mood_trend = [{"date": m["date"], "mood": m.get("mood", 3)} for m in reversed(moods)]

    # achievements
    achievements = []
    def badge(id_, title, desc, icon, earned):
        achievements.append({"id": id_, "title": title, "desc": desc, "icon": icon, "earned": earned})
    badge("first_habit", "First Step", "Create your first habit", "Footprints", len(habits) >= 1)
    badge("streak_3", "On Fire", "Reach a 3-day streak", "Flame", best_streak >= 3)
    badge("streak_7", "Unstoppable", "Reach a 7-day streak", "Zap", best_streak >= 7)
    badge("streak_30", "Iron Will", "Reach a 30-day streak", "Trophy", best_streak >= 30)
    badge("first_goal", "Visionary", "Set your first goal", "Compass", len(goals) >= 1)
    badge("goal_done", "Achiever", "Complete a goal", "Award", any(p == 100 for p in goal_progress))
    badge("journal_5", "Reflective", "Write 5 journal entries", "BookOpen", journal_count >= 5)
    badge("perfect_day", "Perfect Day", "Complete all habits in a day", "Sun", len(habits) > 0 and completed_today == len(habits))

    return {
        "name": user["name"],
        "total_habits": len(habits),
        "completed_today": completed_today,
        "best_streak": best_streak,
        "avg_goal_progress": avg_goal,
        "total_goals": len(goals),
        "journal_count": journal_count,
        "weekly": week,
        "mood_trend": mood_trend,
        "achievements": achievements,
        "earned_count": len([a for a in achievements if a["earned"]]),
    }


# ---------- AI Coach (Groq) ----------
@api.get("/coach/history")
async def coach_history(user: dict = Depends(get_current_user)):
    msgs = await db.chat_messages.find({"user_id": user["id"]}).sort("created_at", 1).to_list(200)
    return [{"role": m["role"], "content": m["content"]} for m in msgs]


@api.delete("/coach/history")
async def clear_coach(user: dict = Depends(get_current_user)):
    await db.chat_messages.delete_many({"user_id": user["id"]})
    return {"ok": True}


async def build_context(uid: str) -> str:
    habits = await db.habits.find({"user_id": uid, "archived": {"$ne": True}}).to_list(100)
    goals = await db.goals.find({"user_id": uid}).to_list(100)
    parts = []
    if habits:
        hs = []
        for h in habits:
            s = await compute_streak(str(h["_id"]), uid)
            hs.append(f"{h['name']} ({s}-day streak)")
        parts.append("Current habits: " + ", ".join(hs) + ".")
    if goals:
        parts.append("Active goals: " + ", ".join(g["title"] for g in goals[:5]) + ".")
    return " ".join(parts) if parts else "The user has not set up habits or goals yet."


@api.post("/coach/chat")
async def coach_chat(body: ChatIn, user: dict = Depends(get_current_user)):
    uid = user["id"]
    await db.chat_messages.insert_one({"user_id": uid, "role": "user", "content": body.message,
                                       "created_at": datetime.now(timezone.utc).isoformat()})
    history = await db.chat_messages.find({"user_id": uid}).sort("created_at", 1).to_list(20)
    ctx = await build_context(uid)
    system = (
        f"You are Dopame Coach, an elite personal development AI coach inside the Dopame app. "
        f"The user's name is {user['name']}. Be warm, motivating, concise and practical. "
        f"Use the user's data to give specific, actionable advice. Keep replies focused (2-5 short paragraphs max). "
        f"Context about the user: {ctx}"
    )
    messages = [{"role": "system", "content": system}]
    for m in history[-12:]:
        messages.append({"role": m["role"], "content": m["content"]})

    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL, messages=messages, temperature=0.7, max_tokens=900)
        reply = completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq error: {e}")
        raise HTTPException(status_code=502, detail="AI coach is temporarily unavailable. Please try again.")

    await db.chat_messages.insert_one({"user_id": uid, "role": "assistant", "content": reply,
                                       "created_at": datetime.now(timezone.utc).isoformat()})
    return {"reply": reply}


# ---------- Startup ----------
@api.get("/")
async def root():
    return {"message": "Dopame API running"}


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.habit_logs.create_index([("habit_id", 1), ("date", 1)])
    admin_email = os.environ.get("ADMIN_EMAIL", "demo@dopame.app")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Dopame123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"name": "Alex Demo", "email": admin_email,
                                   "password_hash": hash_password(admin_pw), "role": "admin",
                                   "bio": "Building better habits, one day at a time.", "avatar": "",
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
