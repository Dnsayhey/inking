from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, Field


class TagRead(BaseModel):
    id: int
    name: str
    color: str | None

    model_config = {"from_attributes": True}


class NoteBase(BaseModel):
    title: Annotated[str, Field(..., min_length=1, max_length=255, description="笔记标题")]
    content: Annotated[str, Field(..., min_length=1, description="笔记内容")]


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Annotated[str | None, Field(None, min_length=1, max_length=255, description="笔记标题")]
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


class NoteTagUpdate(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)
