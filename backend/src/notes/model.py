from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import Base, DateTimeMixin


class Note(Base, DateTimeMixin):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        secondary="note_tags",
        back_populates="notes",
        lazy="selectin",
    )
