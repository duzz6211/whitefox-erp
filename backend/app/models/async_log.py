import enum
from datetime import datetime
from sqlalchemy import String, Text, Enum as SAEnum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class LogType(str, enum.Enum):
    work = "work"
    comment = "comment"
    system = "system"


class AsyncLog(Base):
    __tablename__ = "async_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    box_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    log_type: Mapped[LogType] = mapped_column(
        SAEnum(LogType, name="log_type"), default=LogType.work, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    box: Mapped["Box"] = relationship(back_populates="logs")  # noqa: F821
    author: Mapped["User"] = relationship()  # noqa: F821
