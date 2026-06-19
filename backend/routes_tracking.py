from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from core import db, CurrentUser, now_iso, today_str, clean, add_xp

router = APIRouter(prefix="/api", tags=["tracking"])


# ---------- Habits ----------
class HabitIn(BaseModel):
    name: str
    icon: str = "Repeat"
    color: str = "orange"


async def compute_streak(habit_id: str, user_id: str) -> int:
    logs = await db.habit_logs.find({"habit_id": habit_id, "user_id": user_id, "completed": True}).to_list(2000)
    done = {l["date"] for l in logs}
    streak = 0
    d = datetime.now(timezone.utc).date()
    if today_str() not in done:
        d = d - timedelta(days=1)
    while d.strftime("%Y-%m-%d") in done:
        streak += 1
        d = d - timedelta(days=1)
    return streak


@router.get("/habits")
async def list_habits(user: dict = CurrentUser):
    habits = await db.habits.find({"user_id": user["id"], "archived": {"$ne": True}}).to_list(500)
    today = today_str()
    out = []
    for h in habits:
        c = clean(h)
        log = await db.habit_logs.find_one({"habit_id": c["id"], "user_id": user["id"], "date": today})
        c["done_today"] = bool(log and log.get("completed"))
        c["streak"] = await compute_streak(c["id"], user["id"])
        logs = await db.habit_logs.find({"habit_id": c["id"], "user_id": user["id"], "completed": True}).to_list(2000)
        c["history"] = sorted([l["date"] for l in logs])
        out.append(c)
    return out


@router.post("/habits")
async def create_habit(body: HabitIn, user: dict = CurrentUser):
    doc = {"user_id": user["id"], "name": body.name, "icon": body.icon, "color": body.color,
           "archived": False, "created_at": now_iso()}
    res = await db.habits.insert_one(doc)
    return {"id": str(res.inserted_id), "name": body.name, "icon": body.icon, "color": body.color,
            "done_today": False, "streak": 0, "history": []}


@router.post("/habits/{habit_id}/toggle")
async def toggle_habit(habit_id: str, user: dict = CurrentUser):
    today = today_str()
    log = await db.habit_logs.find_one({"habit_id": habit_id, "user_id": user["id"], "date": today})
    if log:
        await db.habit_logs.update_one({"_id": log["_id"]}, {"$set": {"completed": not log.get("completed", False)}})
    else:
        await db.habit_logs.insert_one({"habit_id": habit_id, "user_id": user["id"], "date": today, "completed": True})
        await add_xp(user["id"], 10)
    log2 = await db.habit_logs.find_one({"habit_id": habit_id, "user_id": user["id"], "date": today})
    return {"done_today": bool(log2 and log2.get("completed")), "streak": await compute_streak(habit_id, user["id"])}


@router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user: dict = CurrentUser):
    await db.habits.update_one({"_id": ObjectId(habit_id), "user_id": user["id"]}, {"$set": {"archived": True}})
    return {"ok": True}


# ---------- Goals ----------
class GoalIn(BaseModel):
    title: str
    description: str = ""
    category: str = "Personal"
    target_date: str | None = None
    milestones: list[dict] = []


def goal_progress(g):
    ms = g.get("milestones", [])
    total = len(ms); done = len([m for m in ms if m.get("done")])
    g["progress"] = round((done / total) * 100) if total else 0
    g["completed"] = total > 0 and done == total
    return g


@router.get("/goals")
async def list_goals(user: dict = CurrentUser):
    goals = await db.goals.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [goal_progress(clean(g)) for g in goals]


@router.post("/goals")
async def create_goal(body: GoalIn, user: dict = CurrentUser):
    doc = {"user_id": user["id"], **body.model_dump(), "created_at": now_iso()}
    res = await db.goals.insert_one(doc)
    await add_xp(user["id"], 20)
    return goal_progress(clean({**doc, "_id": res.inserted_id}))


@router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalIn, user: dict = CurrentUser):
    await db.goals.update_one({"_id": ObjectId(goal_id), "user_id": user["id"]}, {"$set": body.model_dump()})
    g = await db.goals.find_one({"_id": ObjectId(goal_id)})
    return goal_progress(clean(g))


@router.post("/goals/{goal_id}/milestone/{ms_id}/toggle")
async def toggle_milestone(goal_id: str, ms_id: str, user: dict = CurrentUser):
    g = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    ms = g.get("milestones", [])
    for m in ms:
        if m.get("id") == ms_id:
            m["done"] = not m.get("done", False)
            if m["done"]:
                await add_xp(user["id"], 15)
    await db.goals.update_one({"_id": g["_id"]}, {"$set": {"milestones": ms}})
    return goal_progress(clean({**g, "milestones": ms}))


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: dict = CurrentUser):
    await db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": user["id"]})
    return {"ok": True}


# ---------- Journal ----------
class JournalIn(BaseModel):
    mood: int = 3
    content: str
    date: str | None = None


@router.get("/journal")
async def list_journal(user: dict = CurrentUser):
    entries = await db.journal_entries.find({"user_id": user["id"]}).sort("date", -1).to_list(500)
    return [clean(e) for e in entries]


@router.post("/journal")
async def create_journal(body: JournalIn, user: dict = CurrentUser):
    doc = {"user_id": user["id"], "mood": body.mood, "content": body.content,
           "date": body.date or today_str(), "created_at": now_iso()}
    res = await db.journal_entries.insert_one(doc)
    await add_xp(user["id"], 10)
    return clean({**doc, "_id": res.inserted_id})


@router.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, user: dict = CurrentUser):
    await db.journal_entries.delete_one({"_id": ObjectId(entry_id), "user_id": user["id"]})
    return {"ok": True}
