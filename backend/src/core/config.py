from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Inking"
    debug: bool = False

    db_type: Literal["postgres", "sqlite"] = "sqlite"

    # PostgreSQL
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "postgres"
    db_password: str = "postgres"
    db_name: str = "inking"

    # PostgreSQL Connection Pool
    pool_size: int = 20
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_pre_ping: bool = True

    pool_recycle: int = 3600
    pool_use_lifo: bool = False
    echo: bool = False

    sqlite_db_path: str = str(BASE_DIR / "data" / "inking.sqlite3")

    @computed_field
    @property
    def database_url(self) -> str:
        if self.db_type == "postgres":
            return (
                f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        elif self.db_type == "sqlite":
            return f"sqlite+aiosqlite:///{self.sqlite_db_path}"
        else:
            raise ValueError(f"Unsupported DB_TYPE: {self.db_type}")
        
    @computed_field
    @property
    def engine_options(self) -> dict:
        options = {
            "echo": self.echo
        }
        if self.db_type == "postgres":
            pg_options = {
                "pool_size": self.pool_size,
                "max_overflow": self.max_overflow,
                "pool_timeout": self.pool_timeout,
                "pool_pre_ping": self.pool_pre_ping,
                "pool_recycle": self.pool_recycle,
                "pool_use_lifo": self.pool_use_lifo
            }
            options.update(pg_options)

        return options
    
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    frontend_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    @computed_field
    @property
    def frontend_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_jwt_secret(self) -> "Settings":
        secret = self.jwt_secret.strip()
        if len(secret.encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET 至少需要 32 字节长度")
        self.jwt_secret = secret
        return self


@lru_cache
def get_settings():
    return Settings()

settings = get_settings()
