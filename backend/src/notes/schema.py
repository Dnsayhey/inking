from datetime import datetime, timezone
from typing import Annotated
from pydantic import BaseModel, Field, field_serializer


class TagRead(BaseModel):
    id: int
    name: str
    color: str | None

    model_config = {"from_attributes": True}


class NoteBase(BaseModel):
    content: Annotated[str, Field(..., min_length=1, description="笔记内容")]


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    content: Annotated[str | None, Field(None, min_length=1, description="笔记内容")]


class NoteRead(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    archived_at: datetime | None
    tags: list[TagRead] = Field(default_factory=list)

    model_config = {
        "from_attributes": True
    }

    @field_serializer("created_at", "updated_at", "archived_at", when_used="json")
    def serialize_datetime_as_utc(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            normalized = value.replace(tzinfo=timezone.utc)
        else:
            normalized = value.astimezone(timezone.utc)
        return normalized.isoformat().replace("+00:00", "Z")


class NoteTagUpdate(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)
