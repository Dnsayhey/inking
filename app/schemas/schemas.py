from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: EmailStr | None = Field(None, max_length=255)
    full_name: str | None = Field(None, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)


class UserInDB(BaseModel):
    id: int
    username: str
    email: EmailStr | None = None
    full_name: str | None = None
    password_hash: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
    title: str | None = Field(None, max_length=100)
    content: str = Field(..., min_length=1)


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    todos: list["TodoResponse"] | None = None
    reminders: list["ReminderResponse"] | None = None


class TodoCreate(BaseModel):
    content: str = Field(..., max_length=255)
    note_id: int | None = None


class TodoUpdate(BaseModel):
    content: str | None = None
    is_completed: bool | None = None


class TodoResponse(BaseModel):
    id: int
    user_id: int
    note_id: int
    content: str
    is_completed: bool
    created_at: datetime
    updated_at: datetime


class ReminderCreate(BaseModel):
    reminder_time: datetime
    message: str = Field(..., max_length=255)
    note_id: int | None = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    note_id: int | None = None
    reminder_time: datetime
    message: str
    is_triggered: bool
    is_acknowledged: bool
    created_at: datetime
    updated_at: datetime


class ReminderUpdate(BaseModel):
    reminder_time: datetime | None = None
    timezone: str
    message: str | None = None
    is_acknowledged: bool | None = None
