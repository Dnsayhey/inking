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
    assert await repo.delete(user_b_note.id, user_a.id) is False

    # Owner should still be able to read unchanged note.
    still_there = await repo.get_by_id(user_b_note.id, user_b.id)
    assert still_there is not None
    assert still_there.title == "private"
    assert still_there.content == "only-bob-can-see"
