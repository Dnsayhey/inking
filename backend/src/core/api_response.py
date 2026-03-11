from typing import Any, Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int
    message: str
    data: T | None
    details: Any = None


class ListMeta(BaseModel):
    total: int
    limit: int
    offset: int


class ApiListResponse(ApiResponse[T], Generic[T]):
    meta: ListMeta


def build_response(
    *,
    code: int,
    message: str,
    data: Any = None,
    details: Any = None,
    meta: Any = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "code": code,
        "message": message,
        "data": data,
        "details": details,
    }
    if meta is not None:
        payload["meta"] = meta
    return payload


def ok_response(data: Any = None, message: str = "ok", meta: Any = None) -> dict[str, Any]:
    return build_response(code=0, message=message, data=data, details=None, meta=meta)


def error_response(code: int, message: str, details: Any = None, meta: Any = None) -> dict[str, Any]:
    return build_response(code=code, message=message, data=None, details=details, meta=meta)
