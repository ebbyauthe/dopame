"""Backend tests for Dopame new modules: finance, fitness, nutrition, communication, reports."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dopame-coach.preview.emergentagent.com").rstrip("/")
DEMO_EMAIL = "demo@dopame.app"
DEMO_PASS = "Dopame123!"


@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=15)
    assert r.status_code == 200, f"demo login failed: {r.text}"
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s


@pytest.fixture(scope="module")
def fresh_user():
    s = requests.Session()
    email = f"mod_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"name": "TEST Module", "email": email, "password": "Passw0rd!"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s


# ---------- Finance ----------
class TestFinance:
    def test_plaid_link_token(self, fresh_user):
        r = fresh_user.post(f"{BASE_URL}/api/finance/plaid/link-token", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "link_token" in data
        assert isinstance(data["link_token"], str) and len(data["link_token"]) > 20

    def test_manual_transaction_and_summary(self, fresh_user):
        r = fresh_user.post(f"{BASE_URL}/api/finance/transactions",
                            json={"name": "TEST Salary", "amount": 5000, "flow": "income",
                                  "category": "Salary", "date": "2026-01-05"}, timeout=10)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["name"] == "TEST Salary"
        assert tx["flow"] == "income"
        assert tx["amount"] == 5000

        r = fresh_user.post(f"{BASE_URL}/api/finance/transactions",
                            json={"name": "TEST Groceries", "amount": 200, "flow": "expense",
                                  "category": "Food", "date": "2026-01-06"}, timeout=10)
        assert r.status_code == 200

        # verify in list
        r = fresh_user.get(f"{BASE_URL}/api/finance/transactions", timeout=10)
        assert r.status_code == 200
        names = [t["name"] for t in r.json()]
        assert "TEST Salary" in names and "TEST Groceries" in names

        # summary should reflect (only if current month — use whatever the API returns shape-wise)
        r = fresh_user.get(f"{BASE_URL}/api/finance/summary", timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ("month_income", "month_expense", "savings_rate", "net_worth",
                  "categories", "trend", "connected", "txn_count"):
            assert k in s
        assert s["txn_count"] >= 2

    def test_assets(self, fresh_user):
        r = fresh_user.post(f"{BASE_URL}/api/finance/assets",
                            json={"name": "TEST Savings", "value": 10000,
                                  "kind": "asset", "category": "Cash"}, timeout=10)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["name"] == "TEST Savings"
        assert a["value"] == 10000
        assert "id" in a

        r = fresh_user.get(f"{BASE_URL}/api/finance/assets", timeout=10)
        assert r.status_code == 200
        assert any(x["name"] == "TEST Savings" for x in r.json())


# ---------- Fitness ----------
class TestFitness:
    def test_workout_create_list_summary(self, fresh_user):
        payload = {
            "name": "TEST Push Day", "type": "Strength", "duration_min": 45,
            "exercises": [
                {"name": "Bench Press", "sets": [{"reps": 8, "weight": 60}, {"reps": 8, "weight": 65}]},
                {"name": "Overhead Press", "sets": [{"reps": 10, "weight": 40}]},
            ],
        }
        r = fresh_user.post(f"{BASE_URL}/api/fitness/workouts", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        w = r.json()
        assert w["name"] == "TEST Push Day"
        # volume = 8*60 + 8*65 + 10*40 = 480 + 520 + 400 = 1400
        assert w["volume"] == 1400.0

        r = fresh_user.get(f"{BASE_URL}/api/fitness/workouts", timeout=10)
        assert r.status_code == 200
        assert any(x["name"] == "TEST Push Day" for x in r.json())

        r = fresh_user.get(f"{BASE_URL}/api/fitness/summary", timeout=10)
        assert r.status_code == 200
        s = r.json()
        for k in ("current_weight", "weekly_workouts", "week_volume", "total_workouts", "prs", "weight_trend"):
            assert k in s
        assert s["total_workouts"] >= 1
        # PRs include Bench Press @65
        prs = {p["exercise"]: p["weight"] for p in s["prs"]}
        assert prs.get("Bench Press") == 65

    def test_weight_log(self, fresh_user):
        r = fresh_user.post(f"{BASE_URL}/api/fitness/weight",
                            json={"weight": 75.5, "date": "2026-01-10"}, timeout=10)
        assert r.status_code == 200
        assert r.json()["weight"] == 75.5
        r = fresh_user.get(f"{BASE_URL}/api/fitness/weight", timeout=10)
        assert r.status_code == 200
        assert any(w["date"] == "2026-01-10" and w["weight"] == 75.5 for w in r.json())

    def test_fitness_analyze_ai(self, fresh_user):
        # must have workouts (created above) — order matters within test class
        r = fresh_user.post(f"{BASE_URL}/api/fitness/analyze", timeout=60)
        assert r.status_code == 200, r.text
        analysis = r.json().get("analysis", "")
        assert isinstance(analysis, str) and len(analysis) > 30


# ---------- Nutrition ----------
class TestNutrition:
    def test_log_meal_and_summary(self, fresh_user):
        r = fresh_user.post(f"{BASE_URL}/api/nutrition/log",
                            json={"name": "TEST Chicken Bowl", "calories": 600,
                                  "protein": 45, "carbs": 60, "fat": 18}, timeout=10)
        assert r.status_code == 200, r.text
        food = r.json()
        assert food["name"] == "TEST Chicken Bowl"
        assert food["calories"] == 600

        r = fresh_user.get(f"{BASE_URL}/api/nutrition/log", timeout=10)
        assert r.status_code == 200
        assert any(f["name"] == "TEST Chicken Bowl" for f in r.json())

        r = fresh_user.get(f"{BASE_URL}/api/nutrition/summary", timeout=10)
        assert r.status_code == 200
        s = r.json()
        assert "today" in s and "goal" in s
        assert s["today"]["calories"] >= 600

    def test_set_goal(self, fresh_user):
        r = fresh_user.post(f"{BASE_URL}/api/nutrition/goal",
                            json={"goal": "Cut", "calories": 1900, "protein": 160,
                                  "carbs": 180, "fat": 60}, timeout=10)
        assert r.status_code == 200
        g = r.json()
        assert g["goal"] == "Cut"
        assert g["calories"] == 1900

        # verify persistence
        r = fresh_user.get(f"{BASE_URL}/api/nutrition/goal", timeout=10)
        assert r.status_code == 200
        assert r.json()["calories"] == 1900


# ---------- Communication ----------
class TestCommunication:
    def test_modes(self, fresh_user):
        r = fresh_user.get(f"{BASE_URL}/api/comm/modes", timeout=10)
        assert r.status_code == 200
        modes = r.json()
        ids = [m["id"] for m in modes]
        assert "job_interview" in ids
        assert len(modes) >= 6

    def test_session_start_and_reply(self, fresh_user):
        # Start a session — AI call
        r = fresh_user.post(f"{BASE_URL}/api/comm/session",
                            json={"mode": "job_interview"}, timeout=60)
        assert r.status_code == 200, r.text
        s = r.json()
        sid = s["id"]
        assert s["mode"] == "job_interview"
        assert len(s["messages"]) >= 1
        assert s["messages"][0]["role"] == "assistant"
        assert len(s["messages"][0]["content"]) > 5

        # Reply — AI evaluation
        r = fresh_user.post(f"{BASE_URL}/api/comm/session/{sid}/reply",
                            json={"message": "I have five years of experience building scalable backend systems with FastAPI and MongoDB."},
                            timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "evaluation" in d and "reply" in d
        ev = d["evaluation"]
        for k in ("scores", "feedback", "correction", "tip"):
            assert k in ev
        for sk in ("grammar", "vocabulary", "clarity", "confidence", "professionalism", "tone"):
            assert sk in ev["scores"]
            assert 0 <= ev["scores"][sk] <= 100

    def test_progress(self, fresh_user):
        r = fresh_user.get(f"{BASE_URL}/api/comm/progress", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("scores", "overall", "level", "streak", "sessions", "messages_evaluated"):
            assert k in d
        assert d["sessions"] >= 1


# ---------- Reports ----------
class TestReports:
    def test_weekly_report(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/reports/weekly", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        # tolerate either {report:...} or markdown string keyed
        assert d is not None and any(isinstance(v, str) and len(v) > 50 for v in d.values() if isinstance(v, str))

    def test_monthly_report(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/reports/monthly", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d is not None


# ---------- Dashboard with rich data ----------
class TestDashboardKeys:
    def test_dashboard_demo(self, demo_session):
        r = demo_session.get(f"{BASE_URL}/api/dashboard", timeout=20)
        assert r.status_code == 200
        d = r.json()
        # at least these foundational keys
        for k in ("name", "weekly", "achievements"):
            assert k in d
