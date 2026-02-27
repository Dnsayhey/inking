from typing import Any, Mapping

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.tags.model import Tag


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

    async def exists_same_name(self, user_id: int, name: str, exclude_id: int | None = None) -> bool:
        query = select(Tag.id).where(Tag.user_id == user_id, func.lower(Tag.name) == name.lower())
        if exclude_id is not None:
            query = query.where(Tag.id != exclude_id)
        return (await self.session.scalar(query)) is not None
