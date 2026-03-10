import pytest

from src.core.config import Settings


def test_settings_reject_short_jwt_secret():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(_env_file=None, jwt_secret="short-secret")


def test_settings_reject_change_me_jwt_secret():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(_env_file=None, jwt_secret="CHANGE_ME")


def test_settings_accepts_strong_jwt_secret():
    settings = Settings(_env_file=None, jwt_secret="dev_local_secret_0123456789_abcdefghijklmnopqrstuvwxyz")

    assert len(settings.jwt_secret.encode("utf-8")) >= 32
