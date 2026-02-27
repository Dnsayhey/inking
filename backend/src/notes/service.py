from src.notes.model import Note
from src.notes.repository import NoteRepository
from src.notes.schema import NoteCreate, NoteUpdate


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
