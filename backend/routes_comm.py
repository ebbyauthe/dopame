from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
import json
from datetime import datetime, timezone, timedelta
from core import db, CurrentUser, now_iso, today_str, clean, add_xp, groq_chat

router = APIRouter(prefix="/api/comm", tags=["communication"])

MODES = [
    {"id": "job_interview", "name": "Job Interview", "desc": "Practice answering tough interview questions.", "icon": "Briefcase"},
    {"id": "workplace", "name": "Workplace", "desc": "Everyday professional workplace communication.", "icon": "Building2"},
    {"id": "networking", "name": "Networking", "desc": "Make a great impression at events.", "icon": "Users"},
    {"id": "negotiation", "name": "Negotiation", "desc": "Negotiate salary, deals and terms.", "icon": "Handshake"},
    {"id": "conflict", "name": "Conflict Resolution", "desc": "Navigate difficult conversations calmly.", "icon": "Shield"},
    {"id": "customer_service", "name": "Customer Service", "desc": "Handle demanding customers with grace.", "icon": "Headset"},
    {"id": "leadership", "name": "Leadership", "desc": "Communicate as a confident leader.", "icon": "Crown"},
    {"id": "casual", "name": "Casual Chat", "desc": "Build rapport in informal conversation.", "icon": "Coffee"},
]
MODE_MAP = {m["id"]: m for m in MODES}

SCORE_KEYS = ["grammar", "vocabulary", "clarity", "confidence", "professionalism", "tone"]


class StartIn(BaseModel):
    mode: str

class ReplyIn(BaseModel):
    message: str


@router.get("/modes")
async def modes(user: dict = CurrentUser):
    return MODES


@router.get("/sessions")
async def sessions(user: dict = CurrentUser):
    ss = await db.comm_sessions.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    out = []
    for s in ss:
        c = clean(s)
        c["msg_count"] = len([m for m in s.get("messages", []) if m["role"] == "user"])
        out.append(c)
    return out


@router.get("/session/{sid}")
async def get_session(sid: str, user: dict = CurrentUser):
    s = await db.comm_sessions.find_one({"_id": ObjectId(sid), "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return clean(s)


@router.post("/session")
async def start_session(body: StartIn, user: dict = CurrentUser):
    mode = MODE_MAP.get(body.mode)
    if not mode:
        raise HTTPException(status_code=400, detail="Invalid mode")
    prompt = (f"You are role-playing a realistic '{mode['name']}' scenario to help {user['name']} practice communication. "
              f"Start the conversation by setting the scene in ONE short sentence (italicized context), then say your opening line "
              f"as the other person. Keep it under 60 words. Do not evaluate yet, just open naturally.")
    opener = groq_chat([{"role": "user", "content": prompt}], max_tokens=200, temperature=0.8)
    doc = {"user_id": user["id"], "mode": body.mode, "mode_name": mode["name"],
           "messages": [{"role": "assistant", "content": opener}],
           "scores": [], "created_at": now_iso()}
    res = await db.comm_sessions.insert_one(doc)
    return clean({**doc, "_id": res.inserted_id})


@router.post("/session/{sid}/reply")
async def reply(sid: str, body: ReplyIn, user: dict = CurrentUser):
    s = await db.comm_sessions.find_one({"_id": ObjectId(sid), "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    mode = MODE_MAP.get(s["mode"], {"name": "conversation"})
    history = s.get("messages", [])
    convo = "\n".join(f"{'Coach' if m['role']=='assistant' else 'User'}: {m['content']}" for m in history[-8:])

    eval_prompt = (
        f"You are an expert communication coach evaluating a user's message in a '{mode['name']}' role-play. "
        f"Conversation so far:\n{convo}\nUser just said: \"{body.message}\"\n\n"
        "Return ONLY JSON with keys: "
        '"scores": {"grammar":0-100,"vocabulary":0-100,"clarity":0-100,"confidence":0-100,"professionalism":0-100,"tone":0-100}, '
        '"feedback": "1-2 sentence specific feedback", '
        '"correction": "an improved/polished version of the user message", '
        '"tip": "one actionable communication tip", '
        '"reply": "your natural in-character next line continuing the conversation (under 50 words)". '
        "Be encouraging but honest."
    )
    raw = groq_chat([{"role": "user", "content": eval_prompt}], json_mode=True, max_tokens=600, temperature=0.6)
    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=502, detail="Evaluation failed, please try again.")

    scores = {k: int(data.get("scores", {}).get(k, 70)) for k in SCORE_KEYS}
    user_msg = {"role": "user", "content": body.message, "feedback": data.get("feedback", ""),
                "correction": data.get("correction", ""), "tip": data.get("tip", ""), "scores": scores}
    ai_msg = {"role": "assistant", "content": data.get("reply", "Tell me more.")}
    await db.comm_sessions.update_one({"_id": s["_id"]}, {
        "$push": {"messages": {"$each": [user_msg, ai_msg]}, "scores": scores}})
    await add_xp(user["id"], 15)
    return {"evaluation": user_msg, "reply": ai_msg["content"]}


@router.delete("/session/{sid}")
async def del_session(sid: str, user: dict = CurrentUser):
    await db.comm_sessions.delete_one({"_id": ObjectId(sid), "user_id": user["id"]})
    return {"ok": True}


async def comm_progress(user_id: str):
    sessions = await db.comm_sessions.find({"user_id": user_id}).to_list(500)
    all_scores = []
    dates = set()
    total_msgs = 0
    for s in sessions:
        for sc in s.get("scores", []):
            all_scores.append(sc)
        for m in s.get("messages", []):
            if m["role"] == "user":
                total_msgs += 1
        dates.add(s.get("created_at", "")[:10])
    avg = {}
    for k in SCORE_KEYS:
        vals = [sc[k] for sc in all_scores if k in sc]
        avg[k] = round(sum(vals) / len(vals)) if vals else 0
    overall = round(sum(avg.values()) / len(SCORE_KEYS)) if all_scores else 0
    # streak of consecutive days with a session
    streak = 0
    d = datetime.now(timezone.utc).date()
    if today_str() not in dates:
        d = d - timedelta(days=1)
    while d.strftime("%Y-%m-%d") in dates:
        streak += 1
        d = d - timedelta(days=1)
    # level label
    level = ("Beginner" if overall < 40 else "Developing" if overall < 60 else
             "Proficient" if overall < 80 else "Advanced")
    return {"scores": avg, "overall": overall, "level": level, "streak": streak,
            "sessions": len(sessions), "messages_evaluated": total_msgs}


@router.get("/progress")
async def progress(user: dict = CurrentUser):
    return await comm_progress(user["id"])
