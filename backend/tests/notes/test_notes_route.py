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
            "title": None,
            "content": "active-content",
            "created_at": now,
            "updated_at": now,
            "is_archived": False,
            "archived_at": None,
            "tags": [],
        }
        self.note_archived = {
            "id": 2,
            "title": "archived-title",
            "content": "archived-content",
            "created_at": now,
            "updated_at": now,
            "is_archived": True,
            "archived_at": now,
            "tags": [],
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
        tag_ids: list[int] | None = None,
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
                "tag_ids": tag_ids,
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
        payload = note_data.model_dump(exclude_unset=True)
        updated.update(payload)
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
    assert r.json()[0]["title"] is None
    assert r.json()[0]["created_at"].endswith("Z")
    assert r.json()[0]["updated_at"].endswith("Z")

    r = client.get(
        "/notes",
        params={
            "archived": "true",
            "tag_ids": "1,2",
            "search": "archived",
            "order_by": "updated_at",
            "direction": "asc",
            "limit": 5,
            "offset": 10,
        },
    )
    assert r.status_code == 200
    assert r.json()[0]["is_archived"] is True
    assert r.json()[0]["title"] == "archived-title"

    assert fake_service.list_calls[0] == {
        "user_id": 99,
        "archived": False,
        "tag_ids": None,
        "search": None,
        "order_by": "updated_at",
        "direction": "desc",
        "limit": 10,
        "offset": 0,
    }
    assert fake_service.list_calls[1] == {
        "user_id": 99,
        "archived": True,
        "tag_ids": [1, 2],
        "search": "archived",
        "order_by": "updated_at",
        "direction": "asc",
        "limit": 5,
        "offset": 10,
    }

    app.dependency_overrides.clear()


def test_notes_list_rejects_invalid_tag_ids():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.get("/notes", params={"tag_ids": "1,a"})
    assert r.status_code == 400

    r = client.get("/notes", params={"tag_ids": "0,1"})
    assert r.status_code == 400

    app.dependency_overrides.clear()


def test_get_note_allows_archived_notes_and_404_for_missing():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.get("/notes/2")
    assert r.status_code == 200
    assert r.json()["id"] == 2
    assert r.json()["title"] == "archived-title"
    assert r.json()["is_archived"] is True
    assert r.json()["created_at"].endswith("Z")
    assert r.json()["updated_at"].endswith("Z")
    assert r.json()["archived_at"].endswith("Z")

    r = client.get("/notes/999")
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_create_note_route_supports_optional_title_and_validation():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post("/notes", json={"content": "no-title"})
    assert r.status_code == 201
    assert r.json()["title"] is None
    assert r.json()["content"] == "no-title"

    r = client.post("/notes", json={"title": "hello", "content": "with-title"})
    assert r.status_code == 201
    assert r.json()["title"] == "hello"
    assert r.json()["content"] == "with-title"

    r = client.post("/notes", json={"title": "", "content": "bad-title"})
    assert r.status_code == 422

    r = client.post("/notes", json={"title": "a" * 256, "content": "bad-title"})
    assert r.status_code == 422

    app.dependency_overrides.clear()


def test_update_note_route_supports_title_set_and_clear():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.put("/notes/1", json={"title": "updated-title", "content": "updated-content"})
    assert r.status_code == 200
    assert r.json()["title"] == "updated-title"
    assert r.json()["content"] == "updated-content"

    r = client.put("/notes/1", json={"title": None})
    assert r.status_code == 200
    assert r.json()["title"] is None
    assert r.json()["content"] == "updated-content"

    r = client.put("/notes/1", json={"title": ""})
    assert r.status_code == 422

    r = client.put("/notes/999", json={"title": "missing"})
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_delete_note_route_returns_204_or_404():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.delete("/notes/1")
    assert r.status_code == 204

    r = client.delete("/notes/999")
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
    assert r.json()["title"] == "archived-title"
    assert r.json()["is_archived"] is False
    assert r.json()["archived_at"] is None

    r = client.post("/notes/999/restore")
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_set_note_tags_route_success_and_validation():
    fake_service = FakeNoteService()

    async def _set_note_tags(note_id: int, user_id: int, tag_ids: list[int]):
        if note_id == 999:
            return None
        if 999 in tag_ids:
            raise ValueError("标签不存在")
        updated = fake_service.note_active.copy()
        updated["tags"] = [{"id": tag_id, "name": f"tag-{tag_id}", "color": None} for tag_id in tag_ids]
        return updated

    fake_service.set_note_tags = _set_note_tags
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.put("/notes/1/tags", json={"tag_ids": [1, 2]})
    assert r.status_code == 200
    assert [item["id"] for item in r.json()["tags"]] == [1, 2]

    r = client.put("/notes/1/tags", json={"tag_ids": [999]})
    assert r.status_code == 400

    r = client.put("/notes/999/tags", json={"tag_ids": [1]})
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_note_routes_validate_payload():
    fake_service = FakeNoteService()
    app.dependency_overrides[get_note_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post("/notes", json={})
    assert r.status_code == 422

    r = client.post("/notes", json={"content": ""})
    assert r.status_code == 422

    r = client.post("/notes", json={"content": "   "})
    assert r.status_code == 422

    r = client.post("/notes", json={"title": "   ", "content": "ok"})
    assert r.status_code == 422

    r = client.put("/notes/1", json={"content": ""})
    assert r.status_code == 422

    r = client.put("/notes/1", json={"content": "   "})
    assert r.status_code == 422

    r = client.put("/notes/1", json={"title": "   "})
    assert r.status_code == 422

    r = client.put("/notes/1", json={"title": "a" * 256})
    assert r.status_code == 422

    r = client.put("/notes/1/tags", json={"tag_ids": "invalid"})
    assert r.status_code == 422

    app.dependency_overrides.clear()


def test_note_routes_require_bearer_token():
    app.dependency_overrides.clear()
    client = TestClient(app)

    r = client.get("/notes")
    assert r.status_code == 401

    r = client.get("/notes/1")
    assert r.status_code == 401

    r = client.post("/notes", json={"content": "content"})
    assert r.status_code == 401

    r = client.put("/notes/1", json={"content": "updated"})
    assert r.status_code == 401

    r = client.delete("/notes/1")
    assert r.status_code == 401

    r = client.post("/notes/1/restore")
    assert r.status_code == 401

    r = client.put("/notes/1/tags", json={"tag_ids": [1]})
    assert r.status_code == 401
