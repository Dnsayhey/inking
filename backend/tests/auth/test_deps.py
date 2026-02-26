from datetime import datetime, timezone

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.auth import deps


class FakeUser:
    def __init__(self, user_id: int, is_active: bool = True):
        self.id = user_id
        self.username = "tester"
        self.is_active = is_active
        self.created_at = datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_get_current_user_invalid_token_raises_401(monkeypatch):
    def _raise_invalid(_token: str):
        raise jwt.InvalidTokenError("bad token")

    monkeypatch.setattr("src.auth.deps.decode_token", _raise_invalid)

    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad"),
            session=object(),
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_non_access_token_raises_401(monkeypatch):
    monkeypatch.setattr("src.auth.deps.decode_token", lambda _t: {"type": "refresh", "sub": "1"})

    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
            session=object(),
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_invalid_sub_raises_401(monkeypatch):
    monkeypatch.setattr("src.auth.deps.decode_token", lambda _t: {"type": "access", "sub": "abc"})

    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
            session=object(),
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_inactive_user_raises_401(monkeypatch):
    class FakeRepo:
        def __init__(self, _session):
            pass

        async def get_by_id(self, _user_id: int):
            return FakeUser(1, is_active=False)

    monkeypatch.setattr("src.auth.deps.decode_token", lambda _t: {"type": "access", "sub": "1"})
    monkeypatch.setattr("src.auth.deps.UserRepository", FakeRepo)

    with pytest.raises(HTTPException) as exc:
        await deps.get_current_user(
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
            session=object(),
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_success(monkeypatch):
    expected_user = FakeUser(1, is_active=True)

    class FakeRepo:
        def __init__(self, _session):
            pass

        async def get_by_id(self, _user_id: int):
            return expected_user

    monkeypatch.setattr("src.auth.deps.decode_token", lambda _t: {"type": "access", "sub": "1"})
    monkeypatch.setattr("src.auth.deps.UserRepository", FakeRepo)

    result = await deps.get_current_user(
        credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials="token"),
        session=object(),
    )

    assert result is expected_user
