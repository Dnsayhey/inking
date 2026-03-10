from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator


class TagCreate(BaseModel):
    name: Annotated[str, Field(..., min_length=1, max_length=64, description="标签名称")]
    color: Annotated[str | None, Field(None, max_length=32, description="标签颜色")]

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class TagUpdate(BaseModel):
    name: Annotated[str | None, Field(None, min_length=1, max_length=64, description="标签名称")]
    color: Annotated[str | None, Field(None, max_length=32, description="标签颜色")]

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value


class TagMergeRequest(BaseModel):
    from_tag_id: Annotated[int, Field(..., gt=0, description="来源标签 ID")]
    to_tag_id: Annotated[int, Field(..., gt=0, description="目标标签 ID")]

    @model_validator(mode="after")
    def ensure_distinct_ids(self) -> "TagMergeRequest":
        if self.from_tag_id == self.to_tag_id:
            raise ValueError("来源标签和目标标签不能相同")
        return self


class TagRead(BaseModel):
    id: int
    name: str
    color: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
