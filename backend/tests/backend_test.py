"""Backend API tests for Dopame app (auth, habits, goals, journal, dashboard, coach)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
DEMO_EMAIL = "demo@dopame.app"
DEMO_PASS = "Dopame123!"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=15)
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "id" in data
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.user_id = data["id"]
    return s


@pytest.fixture(scope="module")
def new_user_session():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"name": "TEST User", "email": email, "password": "Passw0rd!"}, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == email
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    s.email = email
    s.user_id = data["id"]
    return s


# ---------- Health / Auth ----------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert "Dopame" in r.json().get("message", "")

    def test_login_demo(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_login_bad_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_register_and_me(self, new_user_session):
        r = new_user_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == new_user_session.email

    def test_register_duplicate(self, new_user_session):
        r = requests.post(f"{BASE_URL}/api/auth/register",
                          json={"name": "x", "email": new_user_session.email, "password": "Passw0rd!"}, timeout=10)
        assert r.status_code == 400

    def test_unauth_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 401

    def test_update_profile(self, new_user_session):
        r = new_user_session.put(f"{BASE_URL}/api/auth/profile",
                                 json={"name": "TEST Updated", "bio": "hello bio"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST Updated"
        assert r.json()["bio"] == "hello bio"
        # verify persistence
        r2 = new_user_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r2.json()["name"] == "TEST Updated"


# ---------- Habits ----------
class TestHabits:
    def test_habit_crud_and_toggle(self, new_user_session):
        # create
        r = new_user_session.post(f"{BASE_URL}/api/habits",
                                  json={"name": "TEST Meditate", "icon": "Brain", "color": "violet"}, timeout=10)
        assert r.status_code == 200
        habit = r.json()
        hid = habit["id"]
        assert habit["name"] == "TEST Meditate"
        assert habit["done_today"] is False
        assert habit["streak"] == 0

        # list
        r = new_user_session.get(f"{BASE_URL}/api/habits", timeout=10)
        assert r.status_code == 200
        assert any(h["id"] == hid for h in r.json())

        # toggle -> done
        r = new_user_session.post(f"{BASE_URL}/api/habits/{hid}/toggle", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["done_today"] is True
        assert d["streak"] >= 1

        # toggle -> undone
        r = new_user_session.post(f"{BASE_URL}/api/habits/{hid}/toggle", timeout=10)
        assert r.status_code == 200
        assert r.json()["done_today"] is False

        # delete (archive)
        r = new_user_session.delete(f"{BASE_URL}/api/habits/{hid}", timeout=10)
        assert r.status_code == 200
        r = new_user_session.get(f"{BASE_URL}/api/habits", timeout=10)
        assert not any(h["id"] == hid for h in r.json())


# ---------- Goals ----------
class TestGoals:
    def test_goal_crud_and_milestone_toggle(self, new_user_session):
        payload = {
            "title": "TEST Run 5k",
            "description": "build cardio",
            "category": "Health",
            "target_date": "2026-06-01",
            "milestones": [
                {"id": "m1", "title": "Run 1k", "done": False},
                {"id": "m2", "title": "Run 3k", "done": False},
            ],
        }
        r = new_user_session.post(f"{BASE_URL}/api/goals", json=payload, timeout=10)
        assert r.status_code == 200
        g = r.json()
        gid = g["id"]
        assert g["title"] == "TEST Run 5k"
        assert g["progress"] == 0

        # toggle milestone m1
        r = new_user_session.post(f"{BASE_URL}/api/goals/{gid}/milestone/m1/toggle", timeout=10)
        assert r.status_code == 200
        assert r.json()["progress"] == 50

        # toggle milestone m2 -> 100% completed
        r = new_user_session.post(f"{BASE_URL}/api/goals/{gid}/milestone/m2/toggle", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["progress"] == 100
        assert body["completed"] is True

        # list
        r = new_user_session.get(f"{BASE_URL}/api/goals", timeout=10)
        assert any(x["id"] == gid for x in r.json())

        # delete
        r = new_user_session.delete(f"{BASE_URL}/api/goals/{gid}", timeout=10)
        assert r.status_code == 200
        r = new_user_session.get(f"{BASE_URL}/api/goals", timeout=10)
        assert not any(x["id"] == gid for x in r.json())


# ---------- Journal ----------
class TestJournal:
    def test_journal_crud(self, new_user_session):
        r = new_user_session.post(f"{BASE_URL}/api/journal",
                                  json={"mood": 4, "content": "TEST feeling good today"}, timeout=10)
        assert r.status_code == 200
        entry = r.json()
        eid = entry["id"]
        assert entry["mood"] == 4
        assert entry["content"].startswith("TEST")

        r = new_user_session.get(f"{BASE_URL}/api/journal", timeout=10)
        assert r.status_code == 200
        assert any(e["id"] == eid for e in r.json())

        r = new_user_session.delete(f"{BASE_URL}/api/journal/{eid}", timeout=10)
        assert r.status_code == 200
        r = new_user_session.get(f"{BASE_URL}/api/journal", timeout=10)
        assert not any(e["id"] == eid for e in r.json())


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_shape(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/dashboard", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Updated to match new unified dashboard schema (life score + module rollups)
        for k in ("name", "level", "life_score", "finance", "weekly", "achievements"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["weekly"], list) and len(d["weekly"]) == 7
        assert isinstance(d["achievements"], list) and len(d["achievements"]) >= 6
        assert "overall" in d["life_score"] and "breakdown" in d["life_score"]


# ---------- AI Coach (Groq live) ----------
class TestCoach:
    def test_coach_chat_real_groq(self, new_user_session):
        r = new_user_session.post(f"{BASE_URL}/api/coach/chat",
                                  json={"message": "Give me one short motivational tip."}, timeout=60)
        assert r.status_code == 200, f"coach failed: {r.status_code} {r.text}"
        reply = r.json().get("reply", "")
        assert isinstance(reply, str) and len(reply) > 10

        # history present
        r = new_user_session.get(f"{BASE_URL}/api/coach/history", timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        assert msgs[0]["role"] == "user"

        # clear
        r = new_user_session.delete(f"{BASE_URL}/api/coach/history", timeout=10)
        assert r.status_code == 200
        r = new_user_session.get(f"{BASE_URL}/api/coach/history", timeout=10)
        assert r.json() == []


# ---------- Logout ----------
class TestLogout:
    def test_logout(self, new_user_session):
        r = new_user_session.post(f"{BASE_URL}/api/auth/logout", timeout=10)
        assert r.status_code == 200
