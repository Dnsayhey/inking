import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.auth.model import User
from src.core.base_model import Base
from src.tags.repository import TagRepository
from src.tags.schema import TagCreate
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
