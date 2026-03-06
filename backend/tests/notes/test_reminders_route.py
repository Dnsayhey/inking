from datetime import datetime, time, timezone

from fastapi.testclient import TestClient

from src.auth.deps import get_current_user
from src.main import app
from src.notes.route import get_note_service


class FakeUser:
    def __init__(self, user_id: int = 1):
        self.id = user_id
        self.username = "alice"
        self.is_active = True
        self.created_at = datetime.now(timezone.utc)


class FakeReminderService:
    def __init__(self):
        now = datetime.now(timezone.utc)
        self.reminders = {
            1: {
                "id": 1,
                "note_id": 1,
                "title": "mom birthday",
                "calendar_type": "solar",
                "month": 3,
                "day": 18,
                "is_leap_month": False,
                "time_of_day": time(9, 0),
                "timezone": "Asia/Shanghai",
                "remind_before_days": 3,
                "is_active": True,
                "last_triggered_at": None,
                "next_trigger_at": now,
                "created_at": now,
                "updated_at": now,
            }
        }

    async def list_reminders(self, note_id: int, user_id: int):
        if note_id != 1:
            return None
        return list(self.reminders.values())

    async def create_reminder(self, note_id: int, user_id: int, data):
        if note_id != 1:
            return None
        if data.calendar_type == "solar" and data.month == 2 and data.day == 30:
            raise ValueError("公历日期无效")
        next_id = max(self.reminders.keys(), default=0) + 1
        now = datetime.now(timezone.utc)
        reminder = {
            "id": next_id,
            "note_id": note_id,
            "title": data.title.strip(),
            "calendar_type": data.calendar_type,
            "month": data.month,
            "day": data.day,
            "is_leap_month": data.is_leap_month,
            "time_of_day": data.time_of_day,
            "timezone": data.timezone,
            "remind_before_days": data.remind_before_days,
            "is_active": data.is_active,
            "last_triggered_at": None,
            "next_trigger_at": None,
            "created_at": now,
            "updated_at": now,
        }
        self.reminders[next_id] = reminder
        return reminder

    async def update_reminder(self, note_id: int, reminder_id: int, user_id: int, data):
        if note_id != 1:
            return None
        reminder = self.reminders.get(reminder_id)
        if not reminder:
            return None
        if data.day == 31 and data.month == 2:
            raise ValueError("公历日期无效")
        payload = data.model_dump(exclude_unset=True)
        reminder.update(payload)
        reminder["updated_at"] = datetime.now(timezone.utc)
        return reminder

    async def delete_reminder(self, note_id: int, reminder_id: int, user_id: int):
        if note_id != 1:
            return None
        if reminder_id not in self.reminders:
            return False
        del self.reminders[reminder_id]
        return True


def test_reminder_routes_crud_and_validation():
    fake_service = FakeReminderService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.get("/notes/1/reminders")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get("/notes/999/reminders")
    assert r.status_code == 404

    r = client.post(
        "/notes/1/reminders",
        json={
            "title": "friend birthday",
            "calendar_type": "lunar",
            "month": 8,
            "day": 15,
            "is_leap_month": False,
            "time_of_day": "09:00:00",
            "timezone": "Asia/Shanghai",
            "remind_before_days": 7,
            "is_active": True,
        },
    )
    assert r.status_code == 201
    assert r.json()["calendar_type"] == "lunar"

    r = client.post(
        "/notes/1/reminders",
        json={
            "title": "bad solar",
            "calendar_type": "solar",
            "month": 2,
            "day": 30,
            "time_of_day": "09:00:00",
            "timezone": "Asia/Shanghai",
            "remind_before_days": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 400

    r = client.patch("/notes/1/reminders/1", json={"title": "mom birthday updated", "remind_before_days": 1})
    assert r.status_code == 200
    assert r.json()["title"] == "mom birthday updated"

    r = client.patch("/notes/1/reminders/1", json={"month": 2, "day": 31})
    assert r.status_code == 400

    r = client.patch("/notes/1/reminders/999", json={"title": "missing"})
    assert r.status_code == 404

    r = client.delete("/notes/1/reminders/1")
    assert r.status_code == 204

    r = client.delete("/notes/1/reminders/999")
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_reminder_routes_note_not_found_branches():
    fake_service = FakeReminderService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post(
        "/notes/999/reminders",
        json={
            "title": "friend birthday",
            "calendar_type": "solar",
            "month": 3,
            "day": 18,
            "is_leap_month": False,
            "time_of_day": "09:00:00",
            "timezone": "Asia/Shanghai",
            "remind_before_days": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 404

    r = client.patch("/notes/999/reminders/1", json={"title": "missing-note"})
    assert r.status_code == 404

    r = client.delete("/notes/999/reminders/1")
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_reminder_routes_validate_payload():
    fake_service = FakeReminderService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post(
        "/notes/1/reminders",
        json={
            "calendar_type": "solar",
            "month": 3,
            "day": 18,
            "is_leap_month": False,
            "time_of_day": "09:00:00",
            "timezone": "Asia/Shanghai",
            "remind_before_days": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 422

    r = client.post(
        "/notes/1/reminders",
        json={
            "title": "friend birthday",
            "calendar_type": "solar",
            "month": 13,
            "day": 18,
            "is_leap_month": False,
            "time_of_day": "09:00:00",
            "timezone": "Asia/Shanghai",
            "remind_before_days": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 422

    r = client.patch("/notes/1/reminders/1", json={"remind_before_days": -1})
    assert r.status_code == 422

    app.dependency_overrides.clear()


def test_reminder_routes_require_bearer_token():
    app.dependency_overrides.clear()
    client = TestClient(app)

    r = client.get("/notes/1/reminders")
    assert r.status_code == 401

    r = client.post(
        "/notes/1/reminders",
        json={
            "title": "friend birthday",
            "calendar_type": "solar",
            "month": 3,
            "day": 18,
            "is_leap_month": False,
            "time_of_day": "09:00:00",
            "timezone": "Asia/Shanghai",
            "remind_before_days": 0,
            "is_active": True,
        },
    )
    assert r.status_code == 401

    r = client.patch("/notes/1/reminders/1", json={"title": "updated"})
    assert r.status_code == 401

    r = client.delete("/notes/1/reminders/1")
    assert r.status_code == 401
