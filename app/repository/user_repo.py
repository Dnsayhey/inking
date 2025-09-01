from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, AlreadyExistsException
from app.core.security import get_password_hash
from app.models.models import User
from app.schemas.schemas import UserCreate


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user: UserCreate):
        user_exists = await self.get_by_username(user.username)
        if user_exists:
            raise AlreadyExistsException("User already exists")
        new_user = User(
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            password_hash=get_password_hash(user.password),
        )
        self.session.add(new_user)
        await self.session.commit()
        await self.session.refresh(new_user)
        return new_user

    async def get_by_id(self, user_id) -> User:
        query = select(User).where(User.id == user_id)
        result = await self.session.scalars(query)
        user = result.one_or_none()
        if not user:
            raise NotFoundException(f"User id: {user_id} not found")
        return user

    async def get_by_username(self, username) -> User | None:
        query = select(User).where(User.username == username)
        result = await self.session.scalars(query)
        user = result.one_or_none()
        return user
