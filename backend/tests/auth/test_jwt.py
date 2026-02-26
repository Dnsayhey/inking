from src.auth.jwt import create_access_token, create_refresh_token, decode_token


def test_access_token_contains_expected_claims() -> None:
    token = create_access_token(42)
    payload = decode_token(token)

    assert payload["sub"] == "42"
    assert payload["type"] == "access"
    assert "jti" in payload
    assert payload["exp"] > payload["iat"]


def test_refresh_token_contains_expected_claims_and_jti() -> None:
    token, jti, expires_at = create_refresh_token(7)
    payload = decode_token(token)

    assert payload["sub"] == "7"
    assert payload["type"] == "refresh"
    assert payload["jti"] == jti
    assert int(expires_at.timestamp()) == payload["exp"]
