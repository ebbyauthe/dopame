from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from core import (db, hash_password, verify_password, create_access_token, set_auth_cookie,
                  CurrentUser, now_iso, level_from_xp)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileIn(BaseModel):
    name: str | None = None
    bio: str | None = None


def public_user(u):
    return {"id": str(u["_id"]), "name": u["name"], "email": u["email"],
            "bio": u.get("bio", ""), "xp": u.get("xp", 0),
            **level_from_xp(u.get("xp", 0))}


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {"name": body.name, "email": email, "password_hash": hash_password(body.password),
           "role": "user", "bio": "", "xp": 0, "created_at": now_iso()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email)
    set_auth_cookie(response, token)
    return {**public_user(doc), "token": token}


@router.post("/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return {**public_user(user), "token": token}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = CurrentUser):
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return public_user(u)


@router.put("/profile")
async def update_profile(body: ProfileIn, user: dict = CurrentUser):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return public_user(u)
