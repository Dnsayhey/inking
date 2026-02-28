import calendar
from typing import Any

from src.notes.model import Note
from src.notes.repository import NoteRepository
from src.notes.schema import NoteCreate, NoteReminderCreate, NoteReminderUpdate, NoteUpdate


class NoteService:
    def __init__(self, repository: NoteRepository):
        self.repository = repository

    async def create_note(self, note_data: NoteCreate, user_id: int) -> Note:
        return await self.repository.create(note_data.model_dump(), user_id)

    async def get_note(self, note_id: int, user_id: int) -> Note | None:
        return await self.repository.get_by_id(note_id, user_id)

    async def list_notes(
        self,
        user_id: int,
        archived: bool = False,
        tag_ids: list[int] | None = None,
        search: str | None = None,
        order_by: str = "updated_at",
        direction: str = "desc",
        limit: int = 10,
        offset: int = 0,
    ) -> list[Note]:
        return await self.repository.get_all(
            user_id=user_id,
            archived=archived,
            tag_ids=tag_ids,
            search=search,
            order_by=order_by,
            direction=direction,
            limit=limit,
            offset=offset,
        )

    async def update_note(self, note_id: int, note_data: NoteUpdate, user_id: int) -> Note | None:
        update_data = note_data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.repository.get_by_id(note_id, user_id)
        return await self.repository.update(update_data, note_id, user_id)

    async def delete_note(self, note_id: int, user_id: int) -> bool:
        return await self.repository.archive(note_id, user_id)

    async def restore_note(self, note_id: int, user_id: int) -> Note | None:
        return await self.repository.restore(note_id, user_id)

    async def set_note_tags(self, note_id: int, user_id: int, tag_ids: list[int]) -> Note | None:
        return await self.repository.set_tags(note_id, user_id, tag_ids)

    @staticmethod
    def _validate_reminder_payload(payload: dict[str, Any]) -> dict[str, Any]:
        if "title" in payload and payload["title"] is not None:
            payload["title"] = payload["title"].strip()
            if not payload["title"]:
                raise ValueError("提醒标题不能为空")

        if "timezone" in payload and payload["timezone"] is not None:
            payload["timezone"] = payload["timezone"].strip()
            if not payload["timezone"]:
                raise ValueError("时区不能为空")

        calendar_type = payload.get("calendar_type")
        month = payload.get("month")
        day = payload.get("day")
        is_leap_month = payload.get("is_leap_month")

        if calendar_type not in {"solar", "lunar"}:
            raise ValueError("calendar_type 必须是 solar 或 lunar")

        if month is None or day is None:
            raise ValueError("month 和 day 必填")

        if calendar_type == "solar":
            max_day = calendar.monthrange(2024, month)[1]
            if day > max_day:
                raise ValueError("公历日期无效")
            payload["is_leap_month"] = False
        else:
            if day > 30:
                raise ValueError("农历日期无效")
            payload["is_leap_month"] = bool(is_leap_month)

        return payload

    async def list_reminders(self, note_id: int, user_id: int):
        return await self.repository.list_reminders(note_id, user_id)

    async def create_reminder(self, note_id: int, user_id: int, data: NoteReminderCreate):
        payload = self._validate_reminder_payload(data.model_dump())
        return await self.repository.create_reminder(note_id, user_id, payload)

    async def update_reminder(self, note_id: int, reminder_id: int, user_id: int, data: NoteReminderUpdate):
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            reminders = await self.repository.list_reminders(note_id, user_id)
            if reminders is None:
                return None
            for reminder in reminders:
                if reminder.id == reminder_id:
                    return reminder
            return None

        if any(key in payload for key in {"calendar_type", "month", "day", "is_leap_month"}):
            existing = await self.repository.list_reminders(note_id, user_id)
            if existing is None:
                return None
            target = next((item for item in existing if item.id == reminder_id), None)
            if target is None:
                return None
            merged = {
                "title": payload.get("title", target.title),
                "calendar_type": payload.get("calendar_type", target.calendar_type),
                "month": payload.get("month", target.month),
                "day": payload.get("day", target.day),
                "is_leap_month": payload.get("is_leap_month", target.is_leap_month),
                "timezone": payload.get("timezone", target.timezone),
                "time_of_day": payload.get("time_of_day", target.time_of_day),
                "remind_before_days": payload.get("remind_before_days", target.remind_before_days),
                "is_active": payload.get("is_active", target.is_active),
                "last_triggered_at": target.last_triggered_at,
                "next_trigger_at": target.next_trigger_at,
            }
            payload = self._validate_reminder_payload(merged)
        else:
            if "title" in payload and payload["title"] is not None:
                payload["title"] = payload["title"].strip()
                if not payload["title"]:
                    raise ValueError("提醒标题不能为空")
            if "timezone" in payload and payload["timezone"] is not None:
                payload["timezone"] = payload["timezone"].strip()
                if not payload["timezone"]:
                    raise ValueError("时区不能为空")

        return await self.repository.update_reminder(note_id, reminder_id, user_id, payload)

    async def delete_reminder(self, note_id: int, reminder_id: int, user_id: int):
        return await self.repository.delete_reminder(note_id, reminder_id, user_id)
