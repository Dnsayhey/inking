from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.model import RefreshSession, User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_user(self, username: str, password_hash: str) -> User:
        user = User(username=username, password_hash=password_hash)
        self.session.add(user)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(user)
        return user

    async def get_by_username(self, username: str) -> User | None:
        query = select(User).where(User.username == username)
        return await self.session.scalar(query)

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)


class RefreshSessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, user_id: int, token_jti: str, expires_at: datetime) -> RefreshSession:
        session = RefreshSession(
            user_id=user_id,
            token_jti=token_jti,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(session)
        await self.session.commit()
        await self.session.refresh(session)
        return session

    async def get_active_session(self, token_jti: str) -> RefreshSession | None:
        query = select(RefreshSession).where(
            RefreshSession.token_jti == token_jti,
            RefreshSession.revoked_at.is_(None),
        )
        return await self.session.scalar(query)

    async def revoke_session(self, token_jti: str) -> None:
        session = await self.get_active_session(token_jti)
        if not session:
            return
        session.revoked_at = datetime.now(timezone.utc)
        await self.session.commit()
