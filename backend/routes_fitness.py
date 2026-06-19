from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Request
from pydantic import BaseModel
from bson import ObjectId
import base64, json
from datetime import datetime, timezone, timedelta
from core import (db, CurrentUser, now_iso, today_str, clean, add_xp, groq_chat,
                  groq_vision, get_current_user)

router = APIRouter(prefix="/api/fitness", tags=["fitness"])


class ExerciseSet(BaseModel):
    reps: int
    weight: float

class WorkoutIn(BaseModel):
    name: str
    type: str = "Strength"
    duration_min: int = 0
    exercises: list[dict] = []  # [{name, sets:[{reps,weight}]}]
    date: str | None = None

class WeightIn(BaseModel):
    weight: float
    date: str | None = None


@router.get("/workouts")
async def list_workouts(user: dict = CurrentUser):
    ws = await db.workouts.find({"user_id": user["id"]}).sort("date", -1).to_list(300)
    return [clean(w) for w in ws]


@router.post("/workouts")
async def add_workout(body: WorkoutIn, user: dict = CurrentUser):
    volume = 0.0
    for ex in body.exercises:
        for s in ex.get("sets", []):
            volume += float(s.get("reps", 0)) * float(s.get("weight", 0))
    doc = {"user_id": user["id"], "name": body.name, "type": body.type,
           "duration_min": body.duration_min, "exercises": body.exercises,
           "volume": round(volume, 1), "date": body.date or today_str(), "created_at": now_iso()}
    res = await db.workouts.insert_one(doc)
    await add_xp(user["id"], 30)
    return clean({**doc, "_id": res.inserted_id})


@router.delete("/workouts/{wid}")
async def del_workout(wid: str, user: dict = CurrentUser):
    await db.workouts.delete_one({"_id": ObjectId(wid), "user_id": user["id"]})
    return {"ok": True}


@router.get("/weight")
async def list_weight(user: dict = CurrentUser):
    ws = await db.weight_logs.find({"user_id": user["id"]}).sort("date", 1).to_list(500)
    return [clean(w) for w in ws]


@router.post("/weight")
async def add_weight(body: WeightIn, user: dict = CurrentUser):
    d = body.date or today_str()
    await db.weight_logs.update_one({"user_id": user["id"], "date": d},
                                    {"$set": {"user_id": user["id"], "weight": body.weight, "date": d}}, upsert=True)
    doc = await db.weight_logs.find_one({"user_id": user["id"], "date": d})
    return clean(doc)


async def fitness_summary(user_id: str):
    workouts = await db.workouts.find({"user_id": user_id}).to_list(1000)
    weights = await db.weight_logs.find({"user_id": user_id}).sort("date", 1).to_list(500)
    week_ago = (datetime.now(timezone.utc).date() - timedelta(days=7)).strftime("%Y-%m-%d")
    weekly = len([w for w in workouts if w["date"] >= week_ago])
    week_volume = round(sum(w.get("volume", 0) for w in workouts if w["date"] >= week_ago), 1)
    # PRs: best weight per exercise
    prs = {}
    for w in workouts:
        for ex in w.get("exercises", []):
            for s in ex.get("sets", []):
                wt = float(s.get("weight", 0))
                if wt > prs.get(ex.get("name", "?"), 0):
                    prs[ex.get("name", "?")] = wt
    pr_list = sorted([{"exercise": k, "weight": v} for k, v in prs.items()], key=lambda x: -x["weight"])[:5]
    cur_weight = weights[-1]["weight"] if weights else None
    return {
        "current_weight": cur_weight,
        "weekly_workouts": weekly, "week_volume": week_volume,
        "total_workouts": len(workouts), "prs": pr_list,
        "weight_trend": [{"date": w["date"], "weight": w["weight"]} for w in weights[-30:]],
    }


@router.get("/summary")
async def summary(user: dict = CurrentUser):
    return await fitness_summary(user["id"])


@router.post("/analyze")
async def analyze(user: dict = CurrentUser):
    workouts = await db.workouts.find({"user_id": user["id"]}).sort("date", -1).to_list(40)
    if not workouts:
        raise HTTPException(status_code=400, detail="Log some workouts first to get analysis.")
    summary = []
    for w in workouts[:20]:
        ex_str = ", ".join(f"{e['name']} ({len(e.get('sets', []))} sets)" for e in w.get("exercises", []))
        summary.append(f"{w['date']}: {w['name']} [{w['type']}] vol={w.get('volume',0)} — {ex_str}")
    prompt = ("You are an expert strength coach. Analyze this workout history and give: 1) consistency assessment, "
              "2) progressive overload / plateau observations, 3) recovery advice, 4) 2-3 concrete next-session recommendations. "
              "Be concise and motivating, use short paragraphs.\n\nHistory:\n" + "\n".join(summary))
    reply = groq_chat([{"role": "user", "content": prompt}], max_tokens=700)
    return {"analysis": reply}


# ---------- Progress Photos (Groq vision) ----------
@router.post("/photos")
async def upload_photo(angle: str = Query("front"), file: UploadFile = File(...), user: dict = CurrentUser):
    data = await file.read()
    mime = file.content_type or "image/jpeg"
    b64 = base64.b64encode(data).decode()
    prompt = ('Analyze this fitness progress photo. Return ONLY JSON with keys: '
              '"bodyfat_estimate" (string range like "15-18%"), "muscle_development" (short phrase), '
              '"posture" (short phrase), "observations" (1-2 sentence string), '
              '"disclaimer" (always "Visual estimate only, not medical advice."). Be encouraging and never present estimates as medical facts.')
    try:
        raw = groq_vision(prompt, b64, mime=mime, json_mode=True, max_tokens=500)
        analysis = json.loads(raw)
    except Exception:
        analysis = {"observations": "AI analysis unavailable right now.", "disclaimer": "Visual estimate only, not medical advice."}
    doc = {"user_id": user["id"], "angle": angle, "analysis": analysis,
           "date": today_str(), "created_at": now_iso()}
    res = await db.progress_photos.insert_one(doc)
    await add_xp(user["id"], 20)
    return clean({**doc, "_id": res.inserted_id})


@router.get("/photos")
async def list_photos(user: dict = CurrentUser):
    ps = await db.progress_photos.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [clean(p) for p in ps]


@router.delete("/photos/{pid}")
async def del_photo(pid: str, user: dict = CurrentUser):
    await db.progress_photos.delete_one({"_id": ObjectId(pid), "user_id": user["id"]})
    return {"ok": True}
