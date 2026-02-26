from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.auth.deps import get_current_user
from src.auth.route import get_auth_service
from src.main import app


class FakeUser:
    def __init__(self, user_id: int = 1, username: str = "alice", is_active: bool = True):
        self.id = user_id
        self.username = username
        self.is_active = is_active
        self.created_at = datetime.now(timezone.utc)


class FakeAuthService:
    def __init__(self):
        self.logout_called_with: str | None = None

    async def register(self, username: str, password: str):
        if username == "exists":
            raise ValueError("用户名已存在")
        return FakeUser(username=username)

    async def login(self, username: str, password: str):
        if password == "badpass123":
            raise ValueError("用户名或密码错误")
        return {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "token_type": "bearer",
        }

    async def refresh(self, refresh_token: str):
        if refresh_token == "bad":
            raise ValueError("无效的刷新令牌")
        return {
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "token_type": "bearer",
        }

    async def logout(self, refresh_token: str):
        self.logout_called_with = refresh_token


def test_auth_register_login_refresh_logout_and_me_routes():
    fake_service = FakeAuthService()

    app.dependency_overrides[get_auth_service] = lambda: fake_service
    app.dependency_overrides[get_current_user] = lambda: FakeUser(user_id=99, username="me")

    client = TestClient(app)

    r = client.post("/auth/register", json={"username": "alice", "password": "password123"})
    assert r.status_code == 201
    assert r.json()["username"] == "alice"

    r = client.post("/auth/register", json={"username": "exists", "password": "password123"})
    assert r.status_code == 400

    r = client.post("/auth/login", json={"username": "alice", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["access_token"] == "access-token"

    r = client.post("/auth/login", json={"username": "alice", "password": "badpass123"})
    assert r.status_code == 401

    r = client.post("/auth/refresh", json={"refresh_token": "ok"})
    assert r.status_code == 200
    assert r.json()["access_token"] == "new-access-token"

    r = client.post("/auth/refresh", json={"refresh_token": "bad"})
    assert r.status_code == 401

    r = client.post("/auth/logout", json={"refresh_token": "to-revoke"})
    assert r.status_code == 204
    assert fake_service.logout_called_with == "to-revoke"

    r = client.get("/auth/me")
    assert r.status_code == 200
    assert r.json()["id"] == 99

    app.dependency_overrides.clear()


def test_notes_route_requires_bearer_token():
    app.dependency_overrides.clear()
    client = TestClient(app)

    r = client.get("/notes")
    assert r.status_code == 401
