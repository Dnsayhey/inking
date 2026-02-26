from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.deps import get_current_user
from src.auth.model import User
from src.core.database import get_db
from src.notes.model import Note
from src.notes.repository import NoteRepository
from src.notes.schema import NoteCreate, NoteRead, NoteUpdate
from src.notes.service import NoteService

router = APIRouter(
    prefix="/notes",
    tags=["notes"],
)


def get_note_service(session: AsyncSession = Depends(get_db)) -> NoteService:
    repository = NoteRepository(session)
    return NoteService(repository)


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_data: NoteCreate,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
) -> Note:
    return await service.create_note(note_data, current_user.id)


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
) -> Note:
    note = await service.get_note(note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
    return note


@router.get("", response_model=List[NoteRead])
async def list_notes(
    search: str | None = None,
    order_by: str = "id",
    direction: str = "asc",
    limit: int = 10,
    offset: int = 0,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
) -> List[Note]:
    return await service.list_notes(
        user_id=current_user.id,
        search=search,
        order_by=order_by,
        direction=direction,
        limit=limit,
        offset=offset,
    )


@router.put("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
) -> Note:
    note = await service.update_note(note_id, note_data, current_user.id)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
    current_user: User = Depends(get_current_user),
) -> None:
    success = await service.delete_note(note_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在")
