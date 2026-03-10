from sqlalchemy.exc import IntegrityError

from src.tags.model import Tag
from src.tags.repository import TagRepository
from src.tags.schema import TagCreate, TagMergeRequest, TagUpdate


class TagService:
    def __init__(self, repository: TagRepository):
        self.repository = repository

    @staticmethod
    def normalize_name(raw_name: str) -> tuple[str, str]:
        display_name = raw_name.strip()
        if not display_name:
            raise ValueError("标签名称不能为空")
        return display_name, display_name.casefold()

    async def create_tag(self, user_id: int, data: TagCreate) -> Tag:
        payload = data.model_dump()
        payload["name"], payload["name_key"] = self.normalize_name(payload["name"])
        if await self.repository.exists_same_name(user_id, payload["name_key"]):
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
            payload["name"], payload["name_key"] = self.normalize_name(payload["name"])
            if await self.repository.exists_same_name(user_id, payload["name_key"], exclude_id=tag_id):
                raise ValueError("标签名称已存在")
        try:
            return await self.repository.update(tag_id, user_id, payload)
        except IntegrityError as e:
            raise ValueError("标签名称已存在") from e

    async def delete_tag(self, tag_id: int, user_id: int) -> bool:
        return await self.repository.delete(tag_id, user_id)

    async def merge_tag(self, user_id: int, data: TagMergeRequest) -> Tag | None:
        if data.from_tag_id == data.to_tag_id:
            raise ValueError("来源标签和目标标签不能相同")
        return await self.repository.merge_tags(
            user_id=user_id,
            from_tag_id=data.from_tag_id,
            to_tag_id=data.to_tag_id,
        )
