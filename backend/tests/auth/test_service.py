from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from src.auth.password import hash_password
from src.auth.service import AuthService


@dataclass
class FakeUser:
    id: int
    username: str
    password_hash: str
    is_active: bool = True


@dataclass
class FakeSession:
    token_jti: str
    expires_at: datetime


class FakeUserRepo:
    def __init__(self, users: dict[int, FakeUser] | None = None):
        self.users = users or {}
        self.created_users: list[tuple[str, str]] = []

    async def get_by_username(self, username: str):
        for user in self.users.values():
            if user.username == username:
                return user
        return None

    async def get_by_id(self, user_id: int):
        return self.users.get(user_id)

    async def create_user(self, username: str, password_hash: str):
        self.created_users.append((username, password_hash))
        user = FakeUser(id=max(self.users.keys(), default=0) + 1, username=username, password_hash=password_hash)
        self.users[user.id] = user
        return user


class FakeRefreshRepo:
    def __init__(self):
        self.sessions: dict[str, FakeSession] = {}
        self.created: list[tuple[int, str, datetime]] = []
        self.revoked: list[str] = []

    async def create_session(self, user_id: int, token_jti: str, expires_at: datetime):
        self.created.append((user_id, token_jti, expires_at))
        self.sessions[token_jti] = FakeSession(token_jti=token_jti, expires_at=expires_at)

    async def get_active_session(self, token_jti: str):
        return self.sessions.get(token_jti)

    async def revoke_session(self, token_jti: str):
        self.revoked.append(token_jti)
        self.sessions.pop(token_jti, None)


@pytest.mark.asyncio
async def test_login_success_creates_refresh_session(monkeypatch):
    user = FakeUser(id=1, username="alice", password_hash=hash_password("password123"))
    user_repo = FakeUserRepo(users={1: user})
    refresh_repo = FakeRefreshRepo()
    service = AuthService(user_repo, refresh_repo)

    monkeypatch.setattr("src.auth.service.create_access_token", lambda user_id: "access-token")
    monkeypatch.setattr(
        "src.auth.service.create_refresh_token",
        lambda user_id: ("refresh-token", "jti-login", datetime.now(timezone.utc) + timedelta(days=7)),
    )

    result = await service.login("alice", "password123")

    assert result.access_token == "access-token"
    assert result.refresh_token == "refresh-token"
    assert refresh_repo.created
    assert refresh_repo.created[0][1] == "jti-login"


@pytest.mark.asyncio
async def test_login_with_wrong_password_raises_value_error():
    user = FakeUser(id=1, username="alice", password_hash=hash_password("password123"))
    service = AuthService(FakeUserRepo(users={1: user}), FakeRefreshRepo())

    with pytest.raises(ValueError, match="用户名或密码错误"):
        await service.login("alice", "wrong-password")


@pytest.mark.asyncio
async def test_login_strips_username_before_lookup(monkeypatch):
    user = FakeUser(id=1, username="alice", password_hash=hash_password("password123"))
    user_repo = FakeUserRepo(users={1: user})
    service = AuthService(user_repo, FakeRefreshRepo())

    monkeypatch.setattr("src.auth.service.create_access_token", lambda user_id: "access-token")
    monkeypatch.setattr(
        "src.auth.service.create_refresh_token",
        lambda user_id: ("refresh-token", "login-jti", datetime.now(timezone.utc) + timedelta(days=7)),
    )

    result = await service.login("  alice  ", "password123")

    assert result.access_token == "access-token"
    assert result.refresh_token == "refresh-token"


@pytest.mark.asyncio
async def test_register_strips_username_before_create():
    user_repo = FakeUserRepo()
    service = AuthService(user_repo, FakeRefreshRepo())

    created = await service.register("  alice  ", "password123")

    assert created.username == "alice"
    assert user_repo.created_users
    assert user_repo.created_users[0][0] == "alice"


@pytest.mark.asyncio
async def test_refresh_with_expired_session_revokes_old_token_and_fails(monkeypatch):
    user = FakeUser(id=1, username="alice", password_hash=hash_password("password123"))
    user_repo = FakeUserRepo(users={1: user})
    refresh_repo = FakeRefreshRepo()
    refresh_repo.sessions["old-jti"] = FakeSession(
        token_jti="old-jti",
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    service = AuthService(user_repo, refresh_repo)

    monkeypatch.setattr(
        "src.auth.service.decode_token",
        lambda token: {"type": "refresh", "jti": "old-jti", "sub": "1"},
    )

    with pytest.raises(ValueError, match="刷新令牌已过期"):
        await service.refresh("old-refresh-token")

    assert refresh_repo.revoked == ["old-jti"]


@pytest.mark.asyncio
async def test_refresh_success_rotates_refresh_session(monkeypatch):
    user = FakeUser(id=1, username="alice", password_hash=hash_password("password123"))
    user_repo = FakeUserRepo(users={1: user})
    refresh_repo = FakeRefreshRepo()
    refresh_repo.sessions["old-jti"] = FakeSession(
        token_jti="old-jti",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    service = AuthService(user_repo, refresh_repo)

    monkeypatch.setattr(
        "src.auth.service.decode_token",
        lambda token: {"type": "refresh", "jti": "old-jti", "sub": "1"},
    )
    monkeypatch.setattr("src.auth.service.create_access_token", lambda user_id: "new-access")
    monkeypatch.setattr(
        "src.auth.service.create_refresh_token",
        lambda user_id: ("new-refresh", "new-jti", datetime.now(timezone.utc) + timedelta(days=7)),
    )

    result = await service.refresh("old-refresh-token")

    assert result.access_token == "new-access"
    assert result.refresh_token == "new-refresh"
    assert refresh_repo.revoked == ["old-jti"]
    assert refresh_repo.created[-1][1] == "new-jti"


@pytest.mark.asyncio
async def test_logout_ignores_invalid_token(monkeypatch):
    service = AuthService(FakeUserRepo(), FakeRefreshRepo())

    def _raise_invalid(_token: str):
        raise jwt.InvalidTokenError("bad token")

    monkeypatch.setattr("src.auth.service.decode_token", _raise_invalid)

    await service.logout("broken-token")


@pytest.mark.asyncio
async def test_logout_revokes_refresh_session(monkeypatch):
    refresh_repo = FakeRefreshRepo()
    service = AuthService(FakeUserRepo(), refresh_repo)

    monkeypatch.setattr(
        "src.auth.service.decode_token",
        lambda token: {"type": "refresh", "jti": "logout-jti", "sub": "1"},
    )

    await service.logout("refresh-token")

    assert refresh_repo.revoked == ["logout-jti"]
