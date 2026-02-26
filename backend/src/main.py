from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth.route import router as auth_router
from src.core.config import settings
from src.notes.route import router as notes_router


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


@app.get("/")
async def index():
    return {"message": f"Hello from the {settings.app_name}!"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
