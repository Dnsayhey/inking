# Inking (墨记)

Inking 是一个前后端分离的笔记应用，按 `backend/` + `frontend/` 分目录组织。

## 目录结构

- `backend/`: FastAPI + SQLAlchemy(Async) + Alembic + JWT Auth
- `frontend/`: React + TypeScript + Vite + React Query + Tailwind

## Backend 启动

```bash
cd backend
cp .env.example .env
uv sync
uv run python -m alembic upgrade head
uv run uvicorn src.main:app --reload
```

## Frontend 启动

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 当前基础模块

- 配置层：`src/core/config.py`
- 数据库层：`src/core/database.py`
- 认证层：`src/auth/*`
- 笔记领域：`src/notes/*`
- 迁移体系：`migrations/*`
- 测试骨架：`tests/*`

你可以在 `notes` 模块基础上继续扩展：标签、层级目录、富文本、附件、版本历史等。
