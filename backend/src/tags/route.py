from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.deps import get_current_user
from src.auth.model import User
from src.core.api_response import ApiListResponse, ApiResponse, ok_response
from src.core.database import get_db
from src.core.error_codes import ErrorCode
from src.core.exceptions import NotFoundError
from src.tags.repository import TagRepository
from src.tags.schema import TagCreate, TagMergeRequest, TagRead, TagUpdate
from src.tags.service import TagService

router = APIRouter(prefix="/tags", tags=["tags"])


def get_tag_service(session: AsyncSession = Depends(get_db)) -> TagService:
    return TagService(TagRepository(session))


@router.post("", response_model=ApiResponse[TagRead], status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> dict:
    tag = await service.create_tag(current_user.id, data)
    return ok_response(tag)


@router.get("", response_model=ApiListResponse[list[TagRead]])
async def list_tags(
    search: str | None = Query(default=None),
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> dict:
    tags = await service.list_tags(current_user.id, search=search)
    return ok_response(
        tags,
        meta={
            "total": len(tags),
            "limit": len(tags),
            "offset": 0,
        },
    )


@router.post("/merge", response_model=ApiResponse[TagRead])
async def merge_tag(
    data: TagMergeRequest,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> dict:
    merged = await service.merge_tag(current_user.id, data)
    if merged is None:
        raise NotFoundError("来源标签或目标标签不存在", code=ErrorCode.TAG_MERGE_TARGET_NOT_FOUND)
    return ok_response(merged)


@router.patch("/{tag_id}", response_model=ApiResponse[TagRead])
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> dict:
    tag = await service.update_tag(tag_id, current_user.id, data)
    if not tag:
        raise NotFoundError("标签不存在", code=ErrorCode.TAG_NOT_FOUND)
    return ok_response(tag)


@router.delete("/{tag_id}", response_model=ApiResponse[None], status_code=status.HTTP_200_OK)
async def delete_tag(
    tag_id: int,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not await service.delete_tag(tag_id, current_user.id):
        raise NotFoundError("标签不存在", code=ErrorCode.TAG_NOT_FOUND)
    return ok_response()
