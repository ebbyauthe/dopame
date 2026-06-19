from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import logging
import base64
import requests
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import bcrypt
import jwt
from groq import Groq

logger = logging.getLogger("dopame")

# ---------- DB ----------
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# ---------- Config ----------
JWT_ALGO = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

_groq = Groq(api_key=GROQ_API_KEY)

# ---------- Time ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

# ---------- Auth ----------
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

def set_auth_cookie(response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=False, samesite="lax", max_age=604800, path="/")

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
        user["id"] = str(user["_id"]); user.pop("_id", None); user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

CurrentUser = Depends(get_current_user)

def clean(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("user_id", None)
    return doc

# ---------- Groq AI ----------
def groq_chat(messages, model=None, temperature=0.7, max_tokens=1000, json_mode=False):
    kwargs = {"model": model or GROQ_MODEL, "messages": messages,
              "temperature": temperature, "max_tokens": max_tokens}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        completion = _groq.chat.completions.create(**kwargs)
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq error: {e}")
        raise HTTPException(status_code=502, detail="AI is temporarily unavailable. Please try again.")

def groq_vision(prompt: str, image_b64: str, mime="image/jpeg", json_mode=True, max_tokens=800):
    messages = [{"role": "user", "content": [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
    ]}]
    kwargs = {"model": GROQ_VISION_MODEL, "messages": messages, "temperature": 0.4, "max_tokens": max_tokens}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        completion = _groq.chat.completions.create(**kwargs)
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq vision error: {e}")
        raise HTTPException(status_code=502, detail="Image analysis failed. Please try again.")

# ---------- Object Storage ----------
APP_NAME = "dopame"

def init_storage():
    pass

def put_object(path: str, data: bytes, content_type: str) -> dict:
    raise HTTPException(status_code=501, detail="Photo storage is not configured.")

def get_object(path: str):
    raise HTTPException(status_code=501, detail="Photo storage is not configured.")

# ---------- Gamification ----------
async def add_xp(user_id: str, amount: int, reason: str = ""):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"xp": amount}})

def level_from_xp(xp: int):
    # level n requires 100 * n^1.5 cumulative-ish; simple tiers
    level = 1
    needed = 100
    remaining = xp
    while remaining >= needed:
        remaining -= needed
        level += 1
        needed = int(100 * (level ** 1.3))
    return {"level": level, "xp": xp, "xp_into_level": remaining, "xp_for_next": needed}
