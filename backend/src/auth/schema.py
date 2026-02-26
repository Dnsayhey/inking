from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: Annotated[str, Field(..., min_length=3, max_length=64)]
    password: Annotated[str, Field(..., min_length=8, max_length=128)]


class LoginRequest(BaseModel):
    username: Annotated[str, Field(..., min_length=3, max_length=64)]
    password: Annotated[str, Field(..., min_length=8, max_length=128)]


class RefreshRequest(BaseModel):
    refresh_token: str


class UserRead(BaseModel):
    id: int
    username: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
