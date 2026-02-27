import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.auth.model import User
from src.core.base_model import Base
from src.notes.repository import NoteRepository


@pytest_asyncio.fixture
async def session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as db:
        yield db

    await engine.dispose()


async def create_user(session: AsyncSession, username: str) -> User:
    user = User(username=username, password_hash="hashed-password", is_active=True)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_get_all_returns_only_current_user_notes(session: AsyncSession):
    repo = NoteRepository(session)
    user_a = await create_user(session, "alice")
    user_b = await create_user(session, "bob")

    await repo.create({"title": "a-title", "content": "a-content"}, user_a.id)
    await repo.create({"title": "b-title", "content": "b-content"}, user_b.id)

    notes = await repo.get_all(user_id=user_a.id)

    assert len(notes) == 1
    assert notes[0].title == "a-title"
    assert notes[0].user_id == user_a.id


@pytest.mark.asyncio
async def test_cross_user_get_update_delete_are_blocked(session: AsyncSession):
    repo = NoteRepository(session)
    user_a = await create_user(session, "alice")
    user_b = await create_user(session, "bob")

    user_b_note = await repo.create({"title": "private", "content": "only-bob-can-see"}, user_b.id)

    assert await repo.get_by_id(user_b_note.id, user_a.id) is None
    assert await repo.update({"title": "hacked"}, user_b_note.id, user_a.id) is None
    assert await repo.archive(user_b_note.id, user_a.id) is False

    # Owner should still be able to read unchanged note.
    still_there = await repo.get_by_id(user_b_note.id, user_b.id)
    assert still_there is not None
    assert still_there.title == "private"
    assert still_there.content == "only-bob-can-see"


@pytest.mark.asyncio
async def test_archive_hides_note_from_default_queries(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")
    note = await repo.create({"title": "to-archive", "content": "content"}, user.id)

    archived = await repo.archive(note.id, user.id)
    assert archived is True

    archived_note = await repo.get_by_id(note.id, user.id)
    assert archived_note is not None
    assert archived_note.is_archived is True
    assert archived_note.archived_at is not None

    visible_notes = await repo.get_all(user_id=user.id, archived=False)
    assert visible_notes == []
    archived_notes = await repo.get_all(user_id=user.id, archived=True)
    assert [item.id for item in archived_notes] == [note.id]


@pytest.mark.asyncio
async def test_default_order_is_updated_at_desc_then_id_desc(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")

    first = await repo.create({"title": "first", "content": "first"}, user.id)
    second = await repo.create({"title": "second", "content": "second"}, user.id)

    notes = await repo.get_all(user_id=user.id)
    assert [note.id for note in notes] == [second.id, first.id]


@pytest.mark.asyncio
async def test_restore_unarchives_note_and_makes_it_visible(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")
    note = await repo.create({"title": "restore-me", "content": "content"}, user.id)
    assert await repo.archive(note.id, user.id) is True

    restored = await repo.restore(note.id, user.id)
    assert restored is not None
    assert restored.is_archived is False
    assert restored.archived_at is None

    visible = await repo.get_by_id(note.id, user.id)
    assert visible is not None
    assert visible.title == "restore-me"
