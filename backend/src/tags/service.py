from sqlalchemy.exc import IntegrityError

from src.tags.model import Tag
from src.tags.repository import TagRepository
from src.tags.schema import TagCreate, TagUpdate


class TagService:
    def __init__(self, repository: TagRepository):
        self.repository = repository

    async def create_tag(self, user_id: int, data: TagCreate) -> Tag:
        payload = data.model_dump()
        payload["name"] = payload["name"].strip()
        if await self.repository.exists_same_name(user_id, payload["name"]):
            raise ValueError("标签名称已存在")
        try:
            return await self.repository.create(user_id, payload)
        except IntegrityError as e:
            raise ValueError("标签名称已存在") from e

    async def list_tags(self, user_id: int, search: str | None = None) -> list[Tag]:
        return await self.repository.list_by_user(user_id, search)

    async def update_tag(self, tag_id: int, user_id: int, data: TagUpdate) -> Tag | None:
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            return await self.repository.get_by_id(tag_id, user_id)

        if "name" in payload and payload["name"] is not None:
            payload["name"] = payload["name"].strip()
            if await self.repository.exists_same_name(user_id, payload["name"], exclude_id=tag_id):
                raise ValueError("标签名称已存在")
        try:
            return await self.repository.update(tag_id, user_id, payload)
        except IntegrityError as e:
            raise ValueError("标签名称已存在") from e

    async def delete_tag(self, tag_id: int, user_id: int) -> bool:
        return await self.repository.delete(tag_id, user_id)
