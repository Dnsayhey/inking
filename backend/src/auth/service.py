from datetime import datetime, timezone

import jwt
from sqlalchemy.exc import IntegrityError

from src.auth.jwt import create_access_token, create_refresh_token, decode_token
from src.auth.model import User
from src.auth.password import hash_password, verify_password
from src.auth.repository import RefreshSessionRepository, UserRepository
from src.auth.schema import TokenPair
from src.core.error_codes import ErrorCode
from src.core.exceptions import BadRequestError, ForbiddenError, UnauthorizedError


class AuthService:
    def __init__(self, user_repo: UserRepository, refresh_repo: RefreshSessionRepository):
        self.user_repo = user_repo
        self.refresh_repo = refresh_repo

    @staticmethod
    def normalize_username(username: str) -> str:
        normalized = username.strip()
        if not normalized:
            raise BadRequestError("用户名不能为空", code=ErrorCode.AUTH_USERNAME_EMPTY)
        return normalized

    async def register(self, username: str, password: str) -> User:
        username = self.normalize_username(username)
        try:
            return await self.user_repo.create_user(
                username=username,
                password_hash=hash_password(password),
            )
        except IntegrityError as e:
            raise BadRequestError("用户名已存在", code=ErrorCode.AUTH_USERNAME_EXISTS) from e

    async def login(self, username: str, password: str) -> TokenPair:
        username = self.normalize_username(username)
        user = await self.user_repo.get_by_username(username)
        if not user or not user.is_active:
            raise UnauthorizedError("用户名或密码错误", code=ErrorCode.AUTH_INVALID_CREDENTIALS)
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError("用户名或密码错误", code=ErrorCode.AUTH_INVALID_CREDENTIALS)

        access_token = create_access_token(user.id)
        refresh_token, token_jti, expires_at = create_refresh_token(user.id)
        await self.refresh_repo.create_session(user.id, token_jti, expires_at)

        return TokenPair(access_token=access_token, refresh_token=refresh_token)

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            payload = decode_token(refresh_token)
        except jwt.InvalidTokenError as e:
            raise UnauthorizedError("无效的刷新令牌", code=ErrorCode.AUTH_INVALID_REFRESH_TOKEN) from e

        if payload.get("type") != "refresh":
            raise UnauthorizedError("无效的刷新令牌", code=ErrorCode.AUTH_INVALID_REFRESH_TOKEN)

        token_jti = payload.get("jti")
        sub = payload.get("sub")
        if not token_jti or not sub:
            raise UnauthorizedError("无效的刷新令牌", code=ErrorCode.AUTH_INVALID_REFRESH_TOKEN)
        try:
            user_id = int(sub)
        except (TypeError, ValueError) as e:
            raise UnauthorizedError("无效的刷新令牌", code=ErrorCode.AUTH_INVALID_REFRESH_TOKEN) from e

        session = await self.refresh_repo.get_active_session(token_jti)
        if not session:
            raise UnauthorizedError("刷新令牌已失效", code=ErrorCode.AUTH_INVALID_REFRESH_TOKEN)
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            await self.refresh_repo.revoke_session(token_jti)
            raise UnauthorizedError("刷新令牌已过期", code=ErrorCode.AUTH_REFRESH_TOKEN_EXPIRED)

        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise ForbiddenError("用户不可用", code=ErrorCode.AUTH_USER_NOT_AVAILABLE)

        await self.refresh_repo.revoke_session(token_jti)
        access_token = create_access_token(user.id)
        new_refresh_token, new_token_jti, expires_at = create_refresh_token(user.id)
        await self.refresh_repo.create_session(user.id, new_token_jti, expires_at)

        return TokenPair(access_token=access_token, refresh_token=new_refresh_token)

    async def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
        except jwt.InvalidTokenError:
            return

        token_jti = payload.get("jti")
        if token_jti:
            await self.refresh_repo.revoke_session(token_jti)
