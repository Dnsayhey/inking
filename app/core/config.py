import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # JWT
    JWT_SECRET_KEY: str = "_key_guess_u!"
    # JWT_ALGORITHM: str
    JWT_EXPIRATION: int = 60 * 60 * 24 * 7

    model_config = SettingsConfigDict(
        env_file="",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    return settings

settings = get_settings()