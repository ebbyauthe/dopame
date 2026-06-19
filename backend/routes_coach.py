from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from core import db, CurrentUser, now_iso, today_str, groq_chat, level_from_xp
from routes_tracking import compute_streak
from routes_finance import finance_summary
from routes_fitness import fitness_summary
from routes_nutrition import nutrition_summary
from routes_comm import comm_progress

router = APIRouter(prefix="/api", tags=["coach"])


class ChatIn(BaseModel):
    message: str


async def gather(user_id: str, name: str):
    fin = await finance_summary(user_id)
    fit = await fitness_summary(user_id)
    nut = await nutrition_summary(user_id)
    comm = await comm_progress(user_id)
    habits = await db.habits.find({"user_id": user_id, "archived": {"$ne": True}}).to_list(500)
    goals = await db.goals.find({"user_id": user_id}).to_list(500)
    today = today_str()
    completed_today = 0
    best_streak = 0
    for h in habits:
        log = await db.habit_logs.find_one({"habit_id": str(h["_id"]), "user_id": user_id, "date": today})
        if log and log.get("completed"):
            completed_today += 1
        best_streak = max(best_streak, await compute_streak(str(h["_id"]), user_id))
    goal_progs = []
    for g in goals:
        ms = g.get("milestones", [])
        total = len(ms); done = len([m for m in ms if m.get("done")])
        goal_progs.append(round((done / total) * 100) if total else 0)
    avg_goal = round(sum(goal_progs) / len(goal_progs)) if goal_progs else 0
    return {"fin": fin, "fit": fit, "nut": nut, "comm": comm,
            "habits": habits, "goals": goals, "completed_today": completed_today,
            "total_habits": len(habits), "best_streak": best_streak, "avg_goal": avg_goal,
            "goal_progs": goal_progs}


def life_score(d):
    fin = d["fin"]; fit = d["fit"]; nut = d["nut"]; comm = d["comm"]
    financial = max(0, min(100, fin["savings_rate"])) if fin["txn_count"] else 0
    fitness = min(100, round((fit["weekly_workouts"] / 5) * 100)) if fit["total_workouts"] else 0
    cal = nut["today"]["calories"]; goal_cal = nut["goal"]["calories"] or 2200
    nutrition = 0
    if nut["meals_logged"]:
        nutrition = max(0, round(100 - (abs(cal - goal_cal) / goal_cal) * 100))
    communication = comm["overall"]
    habit = round((d["completed_today"] / d["total_habits"]) * 100) if d["total_habits"] else 0
    goals = d["avg_goal"]
    parts = {"financial": financial, "fitness": fitness, "nutrition": nutrition,
             "communication": communication, "habits": habit, "goals": goals}
    active = [v for v in parts.values()]
    overall = round(sum(active) / len(active)) if active else 0
    return {"overall": overall, "breakdown": parts}


def build_achievements(d, xp):
    a = []
    def b(id_, t, desc, icon, earned):
        a.append({"id": id_, "title": t, "desc": desc, "icon": icon, "earned": bool(earned)})
    b("first_habit", "First Step", "Create a habit", "Footprints", len(d["habits"]) >= 1)
    b("streak_7", "Unstoppable", "7-day habit streak", "Zap", d["best_streak"] >= 7)
    b("streak_30", "Iron Will", "30-day habit streak", "Trophy", d["best_streak"] >= 30)
    b("bank_linked", "Money Mind", "Connect a bank or log finances", "Landmark", d["fin"]["txn_count"] >= 1)
    b("saver", "Smart Saver", "Reach 20% savings rate", "PiggyBank", d["fin"]["savings_rate"] >= 20)
    b("first_workout", "Iron Started", "Log a workout", "Dumbbell", d["fit"]["total_workouts"] >= 1)
    b("workout_10", "Consistent", "Log 10 workouts", "Activity", d["fit"]["total_workouts"] >= 10)
    b("nutrition_log", "Fueled", "Log a meal", "Apple", d["nut"]["meals_logged"] >= 1)
    b("communicator", "Smooth Talker", "Reach 70 communication score", "MessageCircle", d["comm"]["overall"] >= 70)
    b("goal_done", "Achiever", "Complete a goal", "Award", any(p == 100 for p in d["goal_progs"]))
    b("level_5", "Rising", "Reach level 5", "Star", level_from_xp(xp)["level"] >= 5)
    b("xp_500", "Momentum", "Earn 500 XP", "Flame", xp >= 500)
    return a


@router.get("/dashboard")
async def dashboard(user: dict = CurrentUser):
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    xp = u.get("xp", 0)
    d = await gather(user["id"], user["name"])
    ls = life_score(d)
    ach = build_achievements(d, xp)

    # weekly habit momentum
    week = []
    for i in range(6, -1, -1):
        dt = datetime.now(timezone.utc).date() - timedelta(days=i)
        ds = dt.strftime("%Y-%m-%d")
        cnt = await db.habit_logs.count_documents({"user_id": user["id"], "date": ds, "completed": True})
        week.append({"day": dt.strftime("%a"), "completed": cnt})

    return {
        "name": user["name"],
        "level": level_from_xp(xp),
        "life_score": ls,
        "finance": {"net_worth": d["fin"]["net_worth"], "month_income": d["fin"]["month_income"],
                    "month_expense": d["fin"]["month_expense"], "savings_rate": d["fin"]["savings_rate"],
                    "connected": d["fin"]["connected"], "trend": d["fin"]["trend"], "categories": d["fin"]["categories"]},
        "fitness": {"current_weight": d["fit"]["current_weight"], "weekly_workouts": d["fit"]["weekly_workouts"],
                    "week_volume": d["fit"]["week_volume"], "prs": d["fit"]["prs"], "weight_trend": d["fit"]["weight_trend"]},
        "nutrition": d["nut"],
        "communication": d["comm"],
        "habits": {"completed_today": d["completed_today"], "total": d["total_habits"], "best_streak": d["best_streak"]},
        "goals": {"avg_progress": d["avg_goal"], "total": len(d["goals"]),
                  "active": [{"title": g["title"], "category": g.get("category", "")} for g in d["goals"][:4]]},
        "weekly": week,
        "achievements": ach,
        "earned_count": len([x for x in ach if x["earned"]]),
    }


# ---------- AI Coach ----------
@router.get("/coach/history")
async def coach_history(user: dict = CurrentUser):
    msgs = await db.chat_messages.find({"user_id": user["id"]}).sort("created_at", 1).to_list(200)
    return [{"role": m["role"], "content": m["content"]} for m in msgs]


@router.delete("/coach/history")
async def clear_coach(user: dict = CurrentUser):
    await db.chat_messages.delete_many({"user_id": user["id"]})
    return {"ok": True}


async def coach_context(user_id: str, name: str):
    d = await gather(user_id, name)
    fin = d["fin"]; fit = d["fit"]; nut = d["nut"]; comm = d["comm"]
    parts = [
        f"Net worth ${fin['net_worth']}, this month income ${fin['month_income']}, expenses ${fin['month_expense']}, savings rate {fin['savings_rate']}%.",
        f"Workouts this week: {fit['weekly_workouts']}, total {fit['total_workouts']}, current weight {fit['current_weight']}.",
        f"Today nutrition: {nut['today']['calories']}/{nut['goal']['calories']} kcal, {nut['today']['protein']}g protein (goal {nut['goal']['protein']}g).",
        f"Communication overall score {comm['overall']} ({comm['level']}).",
        f"Habits done today {d['completed_today']}/{d['total_habits']}, best streak {d['best_streak']} days.",
        f"Goals: {len(d['goals'])} active, avg progress {d['avg_goal']}%.",
    ]
    return " ".join(parts)


@router.post("/coach/chat")
async def coach_chat(body: ChatIn, user: dict = CurrentUser):
    uid = user["id"]
    await db.chat_messages.insert_one({"user_id": uid, "role": "user", "content": body.message, "created_at": now_iso()})
    history = await db.chat_messages.find({"user_id": uid}).sort("created_at", 1).to_list(20)
    ctx = await coach_context(uid, user["name"])
    system = (f"You are Dopame Coach, an elite holistic life coach with access to {user['name']}'s real data across "
              f"finance, fitness, nutrition, communication, habits and goals. Give specific, data-driven, motivating advice. "
              f"Reference their actual numbers when relevant. Keep replies concise (2-5 short paragraphs). "
              f"USER DATA: {ctx}")
    messages = [{"role": "system", "content": system}]
    for m in history[-12:]:
        messages.append({"role": m["role"], "content": m["content"]})
    reply = groq_chat(messages, max_tokens=900)
    await db.chat_messages.insert_one({"user_id": uid, "role": "assistant", "content": reply, "created_at": now_iso()})
    return {"reply": reply}


# ---------- Reports ----------
@router.get("/reports/{period}")
async def report(period: str, user: dict = CurrentUser):
    if period not in ("weekly", "monthly"):
        raise HTTPException(status_code=400, detail="period must be weekly or monthly")
    ctx = await coach_context(user["id"], user["name"])
    prompt = (f"Generate a {period} personal growth report for {user['name']} based on this data: {ctx}\n\n"
              f"Structure with these sections using markdown headers (##): Overview, Wins, Areas for Improvement, "
              f"Key Trends, and Recommendations (3-4 specific action items). Be motivating, specific and concise.")
    text = groq_chat([{"role": "user", "content": prompt}], max_tokens=1100, temperature=0.7)
    return {"period": period, "generated_at": now_iso(), "report": text}
