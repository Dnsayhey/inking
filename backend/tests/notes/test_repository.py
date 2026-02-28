import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.auth.model import User
from src.core.base_model import Base
from src.notes.repository import NoteRepository
from src.tags.model import Tag


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


async def create_tag(session: AsyncSession, user_id: int, name: str) -> Tag:
    tag = Tag(user_id=user_id, name=name, name_key=name.casefold())
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return tag


@pytest.mark.asyncio
async def test_get_all_returns_only_current_user_notes(session: AsyncSession):
    repo = NoteRepository(session)
    user_a = await create_user(session, "alice")
    user_b = await create_user(session, "bob")

    await repo.create({"content": "a-content"}, user_a.id)
    await repo.create({"content": "b-content"}, user_b.id)

    notes = await repo.get_all(user_id=user_a.id)

    assert len(notes) == 1
    assert notes[0].content == "a-content"
    assert notes[0].user_id == user_a.id


@pytest.mark.asyncio
async def test_cross_user_get_update_delete_are_blocked(session: AsyncSession):
    repo = NoteRepository(session)
    user_a = await create_user(session, "alice")
    user_b = await create_user(session, "bob")

    user_b_note = await repo.create({"content": "only-bob-can-see"}, user_b.id)

    assert await repo.get_by_id(user_b_note.id, user_a.id) is None
    assert await repo.update({"content": "hacked"}, user_b_note.id, user_a.id) is None
    assert await repo.archive(user_b_note.id, user_a.id) is False

    # Owner should still be able to read unchanged note.
    still_there = await repo.get_by_id(user_b_note.id, user_b.id)
    assert still_there is not None
    assert still_there.content == "only-bob-can-see"


@pytest.mark.asyncio
async def test_archive_hides_note_from_default_queries(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")
    note = await repo.create({"content": "content"}, user.id)

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

    first = await repo.create({"content": "first"}, user.id)
    second = await repo.create({"content": "second"}, user.id)

    notes = await repo.get_all(user_id=user.id)
    assert [note.id for note in notes] == [second.id, first.id]


@pytest.mark.asyncio
async def test_restore_unarchives_note_and_makes_it_visible(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")
    note = await repo.create({"content": "content"}, user.id)
    assert await repo.archive(note.id, user.id) is True

    restored = await repo.restore(note.id, user.id)
    assert restored is not None
    assert restored.is_archived is False
    assert restored.archived_at is None

    visible = await repo.get_by_id(note.id, user.id)
    assert visible is not None
    assert visible.content == "content"


@pytest.mark.asyncio
async def test_set_tags_replaces_existing_tags(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")
    note = await repo.create({"content": "content"}, user.id)
    tag_a = await create_tag(session, user.id, "a")
    tag_b = await create_tag(session, user.id, "b")

    updated = await repo.set_tags(note.id, user.id, [tag_a.id, tag_b.id])
    assert updated is not None
    assert {tag.name for tag in updated.tags} == {"a", "b"}

    updated = await repo.set_tags(note.id, user.id, [tag_b.id])
    assert updated is not None
    assert [tag.name for tag in updated.tags] == ["b"]


@pytest.mark.asyncio
async def test_get_all_can_filter_by_tag_ids_with_or_semantics(session: AsyncSession):
    repo = NoteRepository(session)
    user = await create_user(session, "alice")
    note_one = await repo.create({"content": "content1"}, user.id)
    note_two = await repo.create({"content": "content2"}, user.id)
    tag_x = await create_tag(session, user.id, "x")
    tag_y = await create_tag(session, user.id, "y")

    await repo.set_tags(note_one.id, user.id, [tag_x.id])
    await repo.set_tags(note_two.id, user.id, [tag_y.id])

    notes = await repo.get_all(user_id=user.id, tag_ids=[tag_x.id, tag_y.id])
    assert {note.id for note in notes} == {note_one.id, note_two.id}
