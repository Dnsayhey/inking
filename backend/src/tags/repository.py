from typing import Any, Mapping

from sqlalchemy import delete, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.tags.model import NoteTag, Tag


class TagRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: int, tag_data: Mapping[str, Any]) -> Tag:
        tag = Tag(user_id=user_id, **tag_data)
        self.session.add(tag)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(tag)
        return tag

    async def get_by_id(self, tag_id: int, user_id: int) -> Tag | None:
        query = select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
        return await self.session.scalar(query)

    async def list_by_user(self, user_id: int, search: str | None = None) -> list[Tag]:
        query = select(Tag).where(Tag.user_id == user_id).order_by(func.lower(Tag.name), Tag.id)
        if search:
            pattern = f"%{search}%"
            query = query.where(Tag.name.ilike(pattern))
        return list(await self.session.scalars(query))

    async def update(self, tag_id: int, user_id: int, tag_data: Mapping[str, Any]) -> Tag | None:
        tag = await self.get_by_id(tag_id, user_id)
        if not tag:
            return None
        for key, value in tag_data.items():
            setattr(tag, key, value)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(tag)
        return tag

    async def delete(self, tag_id: int, user_id: int) -> bool:
        tag = await self.get_by_id(tag_id, user_id)
        if not tag:
            return False
        await self.session.delete(tag)
        await self.session.commit()
        return True

    async def exists_same_name(self, user_id: int, name_key: str, exclude_id: int | None = None) -> bool:
        query = select(Tag.id).where(Tag.user_id == user_id, Tag.name_key == name_key)
        if exclude_id is not None:
            query = query.where(Tag.id != exclude_id)
        return (await self.session.scalar(query)) is not None

    async def merge_tags(
        self,
        *,
        user_id: int,
        from_tag_id: int,
        to_tag_id: int,
    ) -> Tag | None:
        source_tag = await self.get_by_id(from_tag_id, user_id)
        target_tag = await self.get_by_id(to_tag_id, user_id)
        if source_tag is None or target_tag is None:
            return None

        try:
            note_ids = list(await self.session.scalars(select(NoteTag.note_id).where(NoteTag.tag_id == source_tag.id)))
            if note_ids:
                existing_note_ids = set(
                    await self.session.scalars(
                        select(NoteTag.note_id).where(NoteTag.tag_id == target_tag.id, NoteTag.note_id.in_(note_ids))
                    )
                )
                missing_note_ids = [note_id for note_id in note_ids if note_id not in existing_note_ids]
                if missing_note_ids:
                    await self.session.execute(
                        insert(NoteTag),
                        [{"note_id": note_id, "tag_id": target_tag.id} for note_id in missing_note_ids],
                    )

            await self.session.execute(delete(NoteTag).where(NoteTag.tag_id == source_tag.id))
            await self.session.delete(source_tag)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        await self.session.refresh(target_tag)
        return target_tag
