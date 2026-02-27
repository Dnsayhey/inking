from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: Annotated[str, Field(..., min_length=1, max_length=64, description="标签名称")]
    color: Annotated[str | None, Field(None, max_length=32, description="标签颜色")]


class TagUpdate(BaseModel):
    name: Annotated[str | None, Field(None, min_length=1, max_length=64, description="标签名称")]
    color: Annotated[str | None, Field(None, max_length=32, description="标签颜色")]


class TagRead(BaseModel):
    id: int
    name: str
    color: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
