# inking backend

一个基于 FastAPI + SQLAlchemy(Async) + Alembic 的笔记管理服务。

## 环境要求

- Python `>=3.14`
- `uv` 包管理器

## 快速开始

1. 安装依赖

```bash
uv sync
```

2. 准备环境变量

```bash
cp .env.example .env
```

3. 执行数据库迁移

```bash
uv run python -m alembic upgrade head
```

4. 启动服务

```bash
uv run uvicorn src.main:app --reload
```

服务默认地址：`http://127.0.0.1:8000`  
文档地址：`http://127.0.0.1:8000/docs`

## 数据库配置

通过 `.env` 中 `DB_TYPE` 选择数据库：

- `DB_TYPE=sqlite`
  - 使用 `SQLITE_DB_PATH`（默认 `./data/inking.sqlite3`）
- `DB_TYPE=postgres`
  - 使用 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`

## 认证配置

- `JWT_SECRET`：JWT 签名密钥（生产环境必须替换为高强度随机值）
- `JWT_ALGORITHM`：签名算法，默认 `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`：访问令牌有效期（默认 15 分钟）
- `REFRESH_TOKEN_EXPIRE_DAYS`：刷新令牌有效期（默认 7 天）
- `FRONTEND_ORIGINS`：允许跨域的前端地址列表（逗号分隔，默认 `http://127.0.0.1:5173,http://localhost:5173`）

## Alembic 迁移

生成新迁移：

```bash
uv run python -m alembic revision -m "your migration message"
```

升级到最新版本：

```bash
uv run python -m alembic upgrade head
```

回滚一步：

```bash
uv run python -m alembic downgrade -1
```

## 常用接口

- `GET /health`：健康检查
- `POST /auth/register`：用户注册
- `POST /auth/login`：用户名密码登录，返回 access/refresh token
- `POST /auth/refresh`：使用 refresh token 刷新令牌对
- `POST /auth/logout`：注销当前 refresh 会话
- `GET /auth/me`：获取当前登录用户信息
- `POST /notes`：创建笔记
- `GET /notes`：查询笔记列表（支持分页、排序、搜索、`archived=true/false`）
- `GET /notes/{note_id}`：查询单个笔记
- `PUT /notes/{note_id}`：更新笔记
- `DELETE /notes/{note_id}`：归档笔记（软删除）
- `POST /notes/{note_id}/restore`：恢复已归档笔记

`/notes` 路由组已启用 Bearer Token 鉴权，请在请求头中携带：  
`Authorization: Bearer <access_token>`
