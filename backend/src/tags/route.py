from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.deps import get_current_user
from src.auth.model import User
from src.core.database import get_db
from src.tags.repository import TagRepository
from src.tags.schema import TagCreate, TagMergeRequest, TagRead, TagUpdate
from src.tags.service import TagService

router = APIRouter(prefix="/tags", tags=["tags"])


def get_tag_service(session: AsyncSession = Depends(get_db)) -> TagService:
    return TagService(TagRepository(session))


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> TagRead:
    try:
        return await service.create_tag(current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get("", response_model=list[TagRead])
async def list_tags(
    search: str | None = Query(default=None),
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> list[TagRead]:
    return await service.list_tags(current_user.id, search=search)


@router.post("/merge", response_model=TagRead)
async def merge_tag(
    data: TagMergeRequest,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> TagRead:
    try:
        merged = await service.merge_tag(current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    if merged is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="来源标签或目标标签不存在")
    return merged


@router.patch("/{tag_id}", response_model=TagRead)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> TagRead:
    try:
        tag = await service.update_tag(tag_id, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    service: TagService = Depends(get_tag_service),
    current_user: User = Depends(get_current_user),
) -> None:
    if not await service.delete_tag(tag_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
