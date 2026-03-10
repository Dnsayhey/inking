from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.auth.deps import get_current_user
from src.main import app
from src.tags.route import get_tag_service


class FakeUser:
    def __init__(self, user_id: int = 1):
        self.id = user_id
        self.username = "alice"
        self.is_active = True
        self.created_at = datetime.now(timezone.utc)


class FakeTagService:
    def __init__(self):
        now = datetime.now(timezone.utc)
        self.tags = {
            1: {"id": 1, "name": "work", "color": "#111111", "created_at": now, "updated_at": now},
            2: {"id": 2, "name": "life", "color": "#222222", "created_at": now, "updated_at": now},
        }

    async def create_tag(self, user_id: int, data):
        if data.name == "exists":
            raise ValueError("标签名称已存在")
        return {
            "id": 3,
            "name": data.name,
            "color": data.color,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    async def list_tags(self, user_id: int, search: str | None = None):
        values = list(self.tags.values())
        if not search:
            return values
        return [tag for tag in values if search in tag["name"]]

    async def update_tag(self, tag_id: int, user_id: int, data):
        if tag_id not in self.tags:
            return None
        if data.name == "exists":
            raise ValueError("标签名称已存在")
        updated = self.tags[tag_id].copy()
        if data.name is not None:
            updated["name"] = data.name
        if data.color is not None:
            updated["color"] = data.color
        self.tags[tag_id] = updated
        return updated

    async def delete_tag(self, tag_id: int, user_id: int):
        return tag_id in self.tags

    async def merge_tag(self, user_id: int, data):
        if data.from_tag_id not in self.tags or data.to_tag_id not in self.tags:
            return None
        merged = self.tags[data.to_tag_id].copy()
        self.tags.pop(data.from_tag_id, None)
        return merged


def test_tag_routes_create_list_update_delete():
    fake_service = FakeTagService()
    app.dependency_overrides[get_tag_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post("/tags", json={"name": "new", "color": "#abcdef"})
    assert r.status_code == 201
    assert r.json()["name"] == "new"

    r = client.post("/tags", json={"name": "exists", "color": "#000000"})
    assert r.status_code == 400

    r = client.get("/tags")
    assert r.status_code == 200
    assert len(r.json()) == 2

    r = client.get("/tags", params={"search": "wor"})
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "work"

    r = client.patch("/tags/1", json={"name": "updated", "color": "#999999"})
    assert r.status_code == 200
    assert r.json()["name"] == "updated"

    r = client.patch("/tags/1", json={"name": "exists"})
    assert r.status_code == 400

    r = client.patch("/tags/999", json={"name": "missing"})
    assert r.status_code == 404

    r = client.delete("/tags/1")
    assert r.status_code == 204

    r = client.delete("/tags/999")
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_tag_merge_route_success_and_error_branches():
    fake_service = FakeTagService()
    app.dependency_overrides[get_tag_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post("/tags/merge", json={"from_tag_id": 1, "to_tag_id": 2})
    assert r.status_code == 200
    assert r.json()["name"] == "life"
    assert r.json()["id"] == 2

    r = client.post("/tags/merge", json={"from_tag_id": 999, "to_tag_id": 2})
    assert r.status_code == 404

    r = client.post("/tags/merge", json={"from_tag_id": 2, "to_tag_id": 999})
    assert r.status_code == 404

    app.dependency_overrides.clear()


def test_tag_routes_validate_payload():
    fake_service = FakeTagService()
    app.dependency_overrides[get_tag_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99)
    client = TestClient(app)

    r = client.post("/tags", json={"name": "", "color": "#abcdef"})
    assert r.status_code == 422

    r = client.post("/tags", json={"name": "   ", "color": "#abcdef"})
    assert r.status_code == 422

    r = client.post("/tags", json={"name": "a" * 65, "color": "#abcdef"})
    assert r.status_code == 422

    r = client.post("/tags", json={"name": "valid", "color": "x" * 33})
    assert r.status_code == 422

    r = client.patch("/tags/1", json={"name": ""})
    assert r.status_code == 422

    r = client.patch("/tags/1", json={"name": "   "})
    assert r.status_code == 422

    r = client.patch("/tags/1", json={"color": "x" * 33})
    assert r.status_code == 422

    r = client.post("/tags/merge", json={"from_tag_id": 0, "to_tag_id": 1})
    assert r.status_code == 422

    r = client.post("/tags/merge", json={"from_tag_id": 1, "to_tag_id": 0})
    assert r.status_code == 422

    r = client.post("/tags/merge", json={"from_tag_id": 1, "to_tag_id": 1})
    assert r.status_code == 422

    app.dependency_overrides.clear()


def test_tag_routes_require_bearer_token():
    app.dependency_overrides.clear()
    client = TestClient(app)

    r = client.get("/tags")
    assert r.status_code == 401

    r = client.post("/tags", json={"name": "new", "color": "#abcdef"})
    assert r.status_code == 401

    r = client.patch("/tags/1", json={"name": "updated"})
    assert r.status_code == 401

    r = client.delete("/tags/1")
    assert r.status_code == 401

    r = client.post("/tags/merge", json={"from_tag_id": 1, "to_tag_id": 2})
    assert r.status_code == 401
