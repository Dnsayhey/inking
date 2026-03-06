from datetime import datetime, time, timezone
from typing import Annotated
from pydantic import BaseModel, Field, field_serializer


class TagRead(BaseModel):
    id: int
    name: str
    color: str | None

    model_config = {"from_attributes": True}


class NoteBase(BaseModel):
    title: Annotated[str | None, Field(default=None, min_length=1, max_length=255, description="笔记标题")]
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


class NoteReminderBase(BaseModel):
    title: Annotated[str, Field(..., min_length=1, max_length=128, description="提醒标题")]
    calendar_type: Annotated[str, Field(..., description="历法类型: solar 或 lunar")]
    month: Annotated[int, Field(..., ge=1, le=12, description="月份")]
    day: Annotated[int, Field(..., ge=1, le=31, description="日期")]
    is_leap_month: bool = False
    time_of_day: time = Field(default=time(hour=9, minute=0))
    timezone: Annotated[str, Field(default="Asia/Shanghai")]
    remind_before_days: Annotated[int, Field(default=0, ge=0, le=365)]
    is_active: bool = True

class NoteReminderCreate(NoteReminderBase):
    pass


class NoteReminderUpdate(BaseModel):
    title: Annotated[str | None, Field(default=None, min_length=1, max_length=128)]
    calendar_type: str | None = None
    month: Annotated[int | None, Field(default=None, ge=1, le=12)]
    day: Annotated[int | None, Field(default=None, ge=1, le=31)]
    is_leap_month: bool | None = None
    time_of_day: time | None = None
    timezone: str | None = None
    remind_before_days: Annotated[int | None, Field(default=None, ge=0, le=365)]
    is_active: bool | None = None

class NoteReminderRead(BaseModel):
    id: int
    note_id: int
    title: str
    calendar_type: str
    month: int
    day: int
    is_leap_month: bool
    time_of_day: time
    timezone: str
    remind_before_days: int
    is_active: bool
    last_triggered_at: datetime | None
    next_trigger_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at", "updated_at", "last_triggered_at", "next_trigger_at", when_used="json")
    def serialize_datetime_as_utc(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            normalized = value.replace(tzinfo=timezone.utc)
        else:
            normalized = value.astimezone(timezone.utc)
        return normalized.isoformat().replace("+00:00", "Z")
