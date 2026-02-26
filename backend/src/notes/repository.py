from typing import Any, Mapping

from sqlalchemy import asc, desc, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.notes.model import Note


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
        query = select(Note).where(Note.id == note_id, Note.user_id == user_id)
        return await self.session.scalar(query)

    async def get_all(
        self,
        *,
        user_id: int,
        search: str | None = None,
        order_by: str = "id",
        direction: str = "asc",
        limit: int = 10,
        offset: int = 0,
    ) -> list[Note]:
        query = select(Note).where(Note.user_id == user_id)

        if search:
            pattern = f"%{search}%"
            query = query.where(or_(Note.title.ilike(pattern), Note.content.ilike(pattern)))

        allowed_sort = {"id", "title", "created_at"}
        if order_by not in allowed_sort:
            order_by = "id"
        order_column = getattr(Note, order_by, Note.id)
        query = query.order_by(desc(order_column) if direction == "desc" else asc(order_column))

        limit = max(1, min(limit, 500))
        offset = max(offset, 0)
        paginated_query = query.offset(offset).limit(limit)
        return list(await self.session.scalars(paginated_query))

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

    async def delete(self, note_id: int, user_id: int) -> bool:
        note = await self.get_by_id(note_id, user_id)
        if note is None:
            return False

        await self.session.delete(note)
        await self.session.commit()
        return True
