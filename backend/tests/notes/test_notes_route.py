from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.auth.deps import get_current_user
from src.main import app
from src.notes.route import get_note_service


class FakeUser:
    def __init__(self, user_id: int = 1, username: str = "alice"):
        self.id = user_id
        self.username = username
        self.is_active = True
        self.created_at = datetime.now(timezone.utc)


class FakeNoteService:
    def __init__(self):
        now = datetime.now(timezone.utc)
        self.note_active = {
            "id": 1,
            "title": "active-note",
            "content": "active-content",
            "created_at": now,
            "updated_at": now,
            "is_archived": False,
            "archived_at": None,
        }
        self.note_archived = {
            "id": 2,
            "title": "archived-note",
            "content": "archived-content",
            "created_at": now,
            "updated_at": now,
            "is_archived": True,
            "archived_at": now,
        }
        self.list_calls: list[dict] = []

    async def create_note(self, note_data, user_id: int):
        return {
            **self.note_active,
            "title": note_data.title,
            "content": note_data.content,
        }

    async def get_note(self, note_id: int, user_id: int):
        if note_id == self.note_active["id"]:
            return self.note_active
        if note_id == self.note_archived["id"]:
            return self.note_archived
        return None

    async def list_notes(
        self,
        user_id: int,
        archived: bool = False,
        search: str | None = None,
        order_by: str = "updated_at",
        direction: str = "desc",
        limit: int = 10,
        offset: int = 0,
    ):
        self.list_calls.append(
            {
                "user_id": user_id,
                "archived": archived,
                "search": search,
                "order_by": order_by,
                "direction": direction,
                "limit": limit,
                "offset": offset,
            }
        )
        return [self.note_archived] if archived else [self.note_active]

    async def update_note(self, note_id: int, note_data, user_id: int):
        if note_id != self.note_active["id"]:
            return None
        updated = self.note_active.copy()
        if note_data.title is not None:
            updated["title"] = note_data.title
        if note_data.content is not None:
            updated["content"] = note_data.content
        self.note_active = updated
        return updated

    async def delete_note(self, note_id: int, user_id: int):
        return note_id in {self.note_active["id"], self.note_archived["id"]}

    async def restore_note(self, note_id: int, user_id: int):
        if note_id != self.note_archived["id"]:
            return None
        restored = self.note_archived.copy()
        restored["is_archived"] = False
        restored["archived_at"] = None
        return restored


def test_notes_list_supports_archived_filter_and_query_params():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)

    client = TestClient(app)

    r = client.get("/notes")
    assert r.status_code == 200
    assert r.json()[0]["is_archived"] is False

    r = client.get(
        "/notes",
        params={
            "archived": "true",
            "search": "archived",
            "order_by": "title",
            "direction": "asc",
            "limit": 5,
            "offset": 10,
        },
    )
    assert r.status_code == 200
    assert r.json()[0]["is_archived"] is True

    assert fake_service.list_calls[0] == {
        "user_id": 99,
        "archived": False,
        "search": None,
        "order_by": "updated_at",
        "direction": "desc",
        "limit": 10,
        "offset": 0,
    }
    assert fake_service.list_calls[1] == {
        "user_id": 99,
        "archived": True,
        "search": "archived",
        "order_by": "title",
        "direction": "asc",
        "limit": 5,
        "offset": 10,
    }

    app.dependency_overrides.clear()


def test_get_note_allows_archived_notes_and_404_for_missing():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.get("/notes/2")
    assert r.status_code == 200
    assert r.json()["id"] == 2
    assert r.json()["is_archived"] is True

    r = client.get("/notes/999")
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_restore_note_route_returns_note_or_404():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post("/notes/2/restore")
    assert r.status_code == 200
    assert r.json()["id"] == 2
    assert r.json()["is_archived"] is False
    assert r.json()["archived_at"] is None

    r = client.post("/notes/999/restore")
    assert r.status_code == 404

    app.dependency_overrides.clear()
