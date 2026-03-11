from datetime import datetime, timezone
from typing import Any, Mapping

from sqlalchemy import asc, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.notes.model import Note, NoteReminder
from src.tags.model import NoteTag, Tag


class NoteRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, note_data: Mapping[str, Any], user_id: int) -> Note:
        note = Note(**note_data, user_id=user_id)
        self.session.add(note)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(note)
        return note

    async def get_by_id(self, note_id: int, user_id: int) -> Note | None:
        query = (
            select(Note)
            .options(selectinload(Note.tags))
            .where(Note.id == note_id, Note.user_id == user_id)
        )
        return await self.session.scalar(query)

    async def get_all(
        self,
        *,
        user_id: int,
        archived: bool = False,
        tag_ids: list[int] | None = None,
        search: str | None = None,
        order_by: str = "updated_at",
        direction: str = "desc",
        limit: int = 10,
        offset: int = 0,
    ) -> list[Note]:
        query = self._build_note_filter_query(
            user_id=user_id,
            archived=archived,
            tag_ids=tag_ids,
            search=search,
        ).options(selectinload(Note.tags))
        query = self._apply_sort(query, order_by=order_by, direction=direction)

        limit, offset = self._normalize_pagination(limit=limit, offset=offset)
        paginated_query = query.offset(offset).limit(limit)
        return list(await self.session.scalars(paginated_query))

    async def get_all_with_total(
        self,
        *,
        user_id: int,
        archived: bool = False,
        tag_ids: list[int] | None = None,
        search: str | None = None,
        order_by: str = "updated_at",
        direction: str = "desc",
        limit: int = 10,
        offset: int = 0,
    ) -> tuple[list[Note], int, int, int]:
        filter_query = self._build_note_filter_query(
            user_id=user_id,
            archived=archived,
            tag_ids=tag_ids,
            search=search,
        )
        total_query = select(func.count()).select_from(filter_query.order_by(None).subquery())
        total = int(await self.session.scalar(total_query) or 0)

        query = filter_query.options(selectinload(Note.tags))
        query = self._apply_sort(query, order_by=order_by, direction=direction)
        limit, offset = self._normalize_pagination(limit=limit, offset=offset)
        paginated_query = query.offset(offset).limit(limit)
        notes = list(await self.session.scalars(paginated_query))
        return notes, total, limit, offset

    @staticmethod
    def _build_note_filter_query(
        *,
        user_id: int,
        archived: bool,
        tag_ids: list[int] | None,
        search: str | None,
    ):
        query = select(Note).where(Note.user_id == user_id, Note.is_archived.is_(archived))
        if search:
            pattern = f"%{search}%"
            query = query.where(Note.content.ilike(pattern))
        if tag_ids:
            normalized_tag_ids = list(set(tag_ids))
            query = query.where(
                Note.id.in_(select(NoteTag.note_id).where(NoteTag.tag_id.in_(normalized_tag_ids)))
            )
        return query

    @staticmethod
    def _apply_sort(query, *, order_by: str, direction: str):
        allowed_sort = {"id", "created_at", "updated_at"}
        if order_by not in allowed_sort:
            order_by = "updated_at"
        order_column = getattr(Note, order_by, Note.updated_at)
        return query.order_by(
            desc(order_column) if direction == "desc" else asc(order_column),
            desc(Note.id),
        )

    @staticmethod
    def _normalize_pagination(*, limit: int, offset: int) -> tuple[int, int]:
        return max(1, min(limit, 500)), max(offset, 0)

    async def update(self, note_data: Mapping[str, Any], note_id: int, user_id: int) -> Note | None:
        note = await self.get_by_id(note_id, user_id)
        if not note:
            return None

        for key, value in note_data.items():
            setattr(note, key, value)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(note)
        return note

    async def archive(self, note_id: int, user_id: int) -> bool:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return False

        note.is_archived = True
        note.archived_at = datetime.now(timezone.utc)
        await self.session.commit()
        return True

    async def restore(self, note_id: int, user_id: int) -> Note | None:
        note = await self.get_by_id(note_id, user_id)
        if note is None or not note.is_archived:
            return None

        note.is_archived = False
        note.archived_at = None
        await self.session.commit()
        await self.session.refresh(note)
        return note

    async def set_tags(self, note_id: int, user_id: int, tag_ids: list[int]) -> Note | None:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return None

        normalized_tag_ids = list(dict.fromkeys(tag_ids))
        if not normalized_tag_ids:
            note.tags = []
            await self.session.commit()
            return await self.get_by_id(note_id, user_id)

        tags = list(
            await self.session.scalars(
                select(Tag).where(
                    Tag.user_id == user_id,
                    Tag.id.in_(normalized_tag_ids),
                )
            )
        )
        if len(tags) != len(normalized_tag_ids):
            raise ValueError("标签不存在")

        note.tags = tags
        await self.session.commit()
        return await self.get_by_id(note_id, user_id)

    async def list_reminders(self, note_id: int, user_id: int) -> list[NoteReminder] | None:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return None
        query = select(NoteReminder).where(NoteReminder.note_id == note_id).order_by(asc(NoteReminder.id))
        return list(await self.session.scalars(query))

    async def create_reminder(self, note_id: int, user_id: int, reminder_data: Mapping[str, Any]) -> NoteReminder | None:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return None
        reminder = NoteReminder(note_id=note_id, **reminder_data)
        self.session.add(reminder)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(reminder)
        return reminder

    async def update_reminder(
        self, note_id: int, reminder_id: int, user_id: int, reminder_data: Mapping[str, Any]
    ) -> NoteReminder | None:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return None
        query = select(NoteReminder).where(NoteReminder.id == reminder_id, NoteReminder.note_id == note_id)
        reminder = await self.session.scalar(query)
        if reminder is None:
            return None
        for key, value in reminder_data.items():
            setattr(reminder, key, value)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(reminder)
        return reminder

    async def delete_reminder(self, note_id: int, reminder_id: int, user_id: int) -> bool | None:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return None
        query = select(NoteReminder).where(NoteReminder.id == reminder_id, NoteReminder.note_id == note_id)
        reminder = await self.session.scalar(query)
        if reminder is None:
            return False
        await self.session.delete(reminder)
        await self.session.commit()
        return True
