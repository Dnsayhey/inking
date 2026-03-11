from typing import Any, Mapping


class AppError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        code: int,
        status_code: int,
        details: Any = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        self.headers = dict(headers) if headers else None


class BadRequestError(AppError):
    def __init__(self, message: str, *, code: int, details: Any = None) -> None:
        super().__init__(message, code=code, status_code=400, details=details)


class UnauthorizedError(AppError):
    def __init__(
        self,
        message: str,
        *,
        code: int,
        details: Any = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message, code=code, status_code=401, details=details, headers=headers)


class ForbiddenError(AppError):
    def __init__(self, message: str, *, code: int, details: Any = None) -> None:
        super().__init__(message, code=code, status_code=403, details=details)


class NotFoundError(AppError):
    def __init__(self, message: str, *, code: int, details: Any = None) -> None:
        super().__init__(message, code=code, status_code=404, details=details)
