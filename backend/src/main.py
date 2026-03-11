from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.auth.route import router as auth_router
from src.core.config import settings
from src.core.error_codes import ErrorCode
from src.core.exceptions import AppError
from src.notes.route import router as notes_router
from src.tags.route import router as tags_router


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(tags_router)


def _error_payload(code: int, message: str, details=None) -> dict:
    return {
        "code": code,
        "message": message,
        "data": None,
        "details": details,
    }


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(exc.code, exc.message, exc.details),
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def handle_request_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_error_payload(
            ErrorCode.REQUEST_VALIDATION_ERROR,
            "请求参数不合法",
            jsonable_encoder(exc.errors()),
        ),
    )


@app.exception_handler(HTTPException)
async def handle_http_exception(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", ErrorCode.BAD_REQUEST)
        message = exc.detail.get("message", "请求失败")
        details = exc.detail.get("details")
    else:
        if exc.status_code == 401:
            code = ErrorCode.UNAUTHORIZED
        elif exc.status_code == 403:
            code = ErrorCode.FORBIDDEN
        elif exc.status_code == 404:
            code = ErrorCode.NOT_FOUND
        else:
            code = ErrorCode.BAD_REQUEST
        message = str(exc.detail) if exc.detail else "请求失败"
        details = None
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(int(code), message, details),
        headers=exc.headers,
    )


@app.get("/")
async def index():
    return {"message": f"Hello from the {settings.app_name}!"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
