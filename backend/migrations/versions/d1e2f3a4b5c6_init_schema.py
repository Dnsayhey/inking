"""init schema

Revision ID: d1e2f3a4b5c6
Revises:
Create Date: 2026-02-28 16:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("users_pkey")),
        sa.UniqueConstraint("username", name=op.f("users_username_key")),
    )
    op.create_index(op.f("users_created_at_idx"), "users", ["created_at"], unique=False)
    op.create_index(op.f("users_username_idx"), "users", ["username"], unique=False)

    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("notes_user_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("notes_pkey")),
    )
    op.create_index(op.f("notes_created_at_idx"), "notes", ["created_at"], unique=False)
    op.create_index(op.f("notes_is_archived_idx"), "notes", ["is_archived"], unique=False)
    op.create_index(op.f("notes_user_id_idx"), "notes", ["user_id"], unique=False)

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("name_key", sa.String(length=64), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("tags_user_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("tags_pkey")),
        sa.UniqueConstraint("user_id", "name_key", name=op.f("tags_user_id_name_key_ci")),
    )
    op.create_index(op.f("tags_created_at_idx"), "tags", ["created_at"], unique=False)
    op.create_index(op.f("tags_user_id_idx"), "tags", ["user_id"], unique=False)

    op.create_table(
        "note_tags",
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], name=op.f("note_tags_note_id_fkey"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], name=op.f("note_tags_tag_id_fkey"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("note_id", "tag_id", name=op.f("note_tags_pkey")),
    )
    op.create_index(op.f("note_tags_note_id_idx"), "note_tags", ["note_id"], unique=False)
    op.create_index(op.f("note_tags_tag_id_idx"), "note_tags", ["tag_id"], unique=False)

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_jti", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("refresh_sessions_user_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("refresh_sessions_pkey")),
        sa.UniqueConstraint("token_jti", name=op.f("refresh_sessions_token_jti_key")),
    )
    op.create_index(op.f("refresh_sessions_token_jti_idx"), "refresh_sessions", ["token_jti"], unique=False)
    op.create_index(op.f("refresh_sessions_user_id_idx"), "refresh_sessions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("refresh_sessions_user_id_idx"), table_name="refresh_sessions")
    op.drop_index(op.f("refresh_sessions_token_jti_idx"), table_name="refresh_sessions")
    op.drop_table("refresh_sessions")

    op.drop_index(op.f("note_tags_tag_id_idx"), table_name="note_tags")
    op.drop_index(op.f("note_tags_note_id_idx"), table_name="note_tags")
    op.drop_table("note_tags")

    op.drop_index(op.f("tags_user_id_idx"), table_name="tags")
    op.drop_index(op.f("tags_created_at_idx"), table_name="tags")
    op.drop_table("tags")

    op.drop_index(op.f("notes_user_id_idx"), table_name="notes")
    op.drop_index(op.f("notes_is_archived_idx"), table_name="notes")
    op.drop_index(op.f("notes_created_at_idx"), table_name="notes")
    op.drop_table("notes")

    op.drop_index(op.f("users_username_idx"), table_name="users")
    op.drop_index(op.f("users_created_at_idx"), table_name="users")
    op.drop_table("users")
