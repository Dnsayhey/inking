from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.config import settings

engine = create_async_engine(settings.database_url, **settings.engine_options)

SessionFactory = async_sessionmaker(
    class_=AsyncSession, autoflush=False, expire_on_commit=False, bind=engine
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionFactory() as session:
        yield session
