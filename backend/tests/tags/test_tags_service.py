import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.auth.model import User
from src.core.base_model import Base
from src.core.error_codes import ErrorCode
from src.core.exceptions import AppError
from src.notes.model import Note
from src.tags.repository import TagRepository
from src.tags.schema import TagCreate, TagMergeRequest
from src.tags.model import NoteTag, Tag
from src.tags.service import TagService


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


async def create_note(session: AsyncSession, user_id: int, content: str) -> Note:
    note = Note(user_id=user_id, content=content)
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note


@pytest.mark.asyncio
async def test_create_tag_preserves_original_name_and_stores_casefold_key(session: AsyncSession):
    user = await create_user(session, "alice")
    service = TagService(TagRepository(session))

    created = await service.create_tag(user.id, TagCreate(name="Java", color="#111111"))

    assert created.name == "Java"
    assert created.name_key == "java"


@pytest.mark.asyncio
async def test_create_tag_rejects_same_name_regardless_of_letter_case(session: AsyncSession):
    user = await create_user(session, "alice")
    service = TagService(TagRepository(session))

    await service.create_tag(user.id, TagCreate(name="Java", color="#111111"))

    with pytest.raises(ValueError, match="标签名称已存在"):
        await service.create_tag(user.id, TagCreate(name="JAVA", color="#222222"))


def test_normalize_name_rejects_blank_tag_name():
    with pytest.raises(ValueError, match="标签名称不能为空"):
        TagService.normalize_name("   ")


@pytest.mark.asyncio
async def test_merge_tag_into_existing_target_moves_note_relations_and_deletes_source(session: AsyncSession):
    user = await create_user(session, "alice")
    service = TagService(TagRepository(session))

    source = await service.create_tag(user.id, TagCreate(name="work", color="#111111"))
    target = await service.create_tag(user.id, TagCreate(name="study", color="#222222"))
    note_a = await create_note(session, user.id, "a")
    note_b = await create_note(session, user.id, "b")

    session.add_all(
        [
            NoteTag(note_id=note_a.id, tag_id=source.id),
            NoteTag(note_id=note_b.id, tag_id=source.id),
            NoteTag(note_id=note_b.id, tag_id=target.id),
        ]
    )
    await session.commit()

    merged = await service.merge_tag(
        user.id,
        TagMergeRequest(from_tag_id=source.id, to_tag_id=target.id),
    )

    assert merged is not None
    assert merged.id == target.id
    assert merged.name == "study"
    assert merged.color == "#222222"

    source_after = await session.get(Tag, source.id)
    assert source_after is None

    links = list(await session.scalars(select(NoteTag).where(NoteTag.tag_id == target.id).order_by(NoteTag.note_id)))
    assert [item.note_id for item in links] == [note_a.id, note_b.id]


@pytest.mark.asyncio
async def test_merge_tag_returns_none_when_source_or_target_missing(session: AsyncSession):
    user = await create_user(session, "alice")
    service = TagService(TagRepository(session))

    source = await service.create_tag(user.id, TagCreate(name="work", color="#111111"))
    target = await service.create_tag(user.id, TagCreate(name="study", color="#222222"))

    missing_source = await service.merge_tag(
        user.id,
        TagMergeRequest(from_tag_id=999, to_tag_id=target.id),
    )
    assert missing_source is None

    missing_target = await service.merge_tag(
        user.id,
        TagMergeRequest(from_tag_id=source.id, to_tag_id=999),
    )
    assert missing_target is None


@pytest.mark.asyncio
async def test_merge_tag_rejects_same_source_and_target_id(session: AsyncSession):
    user = await create_user(session, "alice")
    service = TagService(TagRepository(session))
    source = await service.create_tag(user.id, TagCreate(name="work", color="#111111"))

    with pytest.raises(AppError) as exc:
        await service.merge_tag(
            user.id,
            TagMergeRequest(from_tag_id=source.id, to_tag_id=source.id),
        )

    assert exc.value.code == int(ErrorCode.TAG_MERGE_SAME_ID)
