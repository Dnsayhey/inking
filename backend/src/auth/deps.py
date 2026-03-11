import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.jwt import decode_token
from src.auth.model import User
from src.auth.repository import UserRepository
from src.core.database import get_db
from src.core.error_codes import ErrorCode
from src.core.exceptions import UnauthorizedError

http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    session: AsyncSession = Depends(get_db),
) -> User:
    def credentials_exception() -> UnauthorizedError:
        return UnauthorizedError(
            "无效的认证信息",
            code=ErrorCode.AUTH_INVALID_AUTH,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials is None:
        raise credentials_exception()

    try:
        payload = decode_token(credentials.credentials)
    except jwt.InvalidTokenError as e:
        raise credentials_exception() from e

    if payload.get("type") != "access":
        raise credentials_exception()

    sub = payload.get("sub")
    if not sub:
        raise credentials_exception()
    try:
        user_id = int(sub)
    except (TypeError, ValueError) as e:
        raise credentials_exception() from e

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise credentials_exception()

    return user
