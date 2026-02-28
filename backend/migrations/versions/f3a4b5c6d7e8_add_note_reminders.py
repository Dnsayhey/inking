"""add note reminders

Revision ID: f3a4b5c6d7e8
Revises: d1e2f3a4b5c6
Create Date: 2026-02-28 17:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "note_reminders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("calendar_type", sa.String(length=16), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("is_leap_month", sa.Boolean(), nullable=False),
        sa.Column("time_of_day", sa.Time(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("remind_before_days", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_trigger_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["note_id"],
            ["notes.id"],
            name=op.f("note_reminders_note_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("note_reminders_pkey")),
    )
    op.create_index(op.f("note_reminders_created_at_idx"), "note_reminders", ["created_at"], unique=False)
    op.create_index(op.f("note_reminders_note_id_idx"), "note_reminders", ["note_id"], unique=False)
    op.create_index(op.f("note_reminders_is_active_idx"), "note_reminders", ["is_active"], unique=False)
    op.create_index(op.f("note_reminders_next_trigger_at_idx"), "note_reminders", ["next_trigger_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("note_reminders_next_trigger_at_idx"), table_name="note_reminders")
    op.drop_index(op.f("note_reminders_is_active_idx"), table_name="note_reminders")
    op.drop_index(op.f("note_reminders_note_id_idx"), table_name="note_reminders")
    op.drop_index(op.f("note_reminders_created_at_idx"), table_name="note_reminders")
    op.drop_table("note_reminders")
