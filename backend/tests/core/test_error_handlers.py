from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.auth.deps import get_current_user
from src.core.error_codes import ErrorCode
from src.main import app


def test_request_validation_error_uses_unified_error_payload():
    client = TestClient(app)

    response = client.post("/auth/register", json={"username": "ab", "password": "password123"})

    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == int(ErrorCode.REQUEST_VALIDATION_ERROR)
    assert payload["message"] == "请求参数不合法"
    assert isinstance(payload["details"], list)
    assert payload["details"]
    assert {"type", "loc", "msg"} <= set(payload["details"][0].keys())


def test_app_error_uses_unified_error_payload():
    client = TestClient(app)

    response = client.get("/auth/me")

    assert response.status_code == 401
    payload = response.json()
    assert payload == {
        "code": int(ErrorCode.AUTH_INVALID_AUTH),
        "message": "无效的认证信息",
        "details": None,
    }
    assert response.headers["www-authenticate"] == "Bearer"


def test_http_exception_uses_unified_error_payload():
    def _raise_http_exception():
        raise HTTPException(status_code=403, detail="forbidden")

    app.dependency_overrides[get_current_user] = _raise_http_exception
    try:
        client = TestClient(app)

        response = client.get("/auth/me")

        assert response.status_code == 403
        payload = response.json()
        assert payload == {
            "code": int(ErrorCode.FORBIDDEN),
            "message": "forbidden",
            "details": None,
        }
    finally:
        app.dependency_overrides.clear()
