from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.deps import get_current_user
from src.auth.model import User
from src.auth.repository import RefreshSessionRepository, UserRepository
from src.auth.schema import LoginRequest, RefreshRequest, RegisterRequest, TokenPair, UserRead
from src.auth.service import AuthService
from src.core.api_response import ApiResponse, ok_response
from src.core.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    user_repo = UserRepository(session)
    refresh_repo = RefreshSessionRepository(session)
    return AuthService(user_repo, refresh_repo)


@router.post("/register", response_model=ApiResponse[UserRead], status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    user = await service.register(data.username, data.password)
    return ok_response(user)


@router.post("/login", response_model=ApiResponse[TokenPair])
async def login(
    data: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    tokens = await service.login(data.username, data.password)
    return ok_response(tokens)


@router.post("/refresh", response_model=ApiResponse[TokenPair])
async def refresh(
    data: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    tokens = await service.refresh(data.refresh_token)
    return ok_response(tokens)


@router.post("/logout", response_model=ApiResponse[None], status_code=status.HTTP_200_OK)
async def logout(
    data: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    await service.logout(data.refresh_token)
    return ok_response()


@router.get("/me", response_model=ApiResponse[UserRead])
async def me(current_user: User = Depends(get_current_user)) -> dict:
    return ok_response(current_user)
