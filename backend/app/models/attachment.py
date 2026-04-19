import enum
from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, Enum as SAEnum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class AttachmentTarget(str, enum.Enum):
    brief = "brief"
    box = "box"
    log = "log"


class AttachmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    deleted = "deleted"


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    target_type: Mapped[AttachmentTarget] = mapped_column(
        SAEnum(AttachmentTarget, name="attachment_target"), nullable=False, index=True
    )
    target_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[AttachmentStatus] = mapped_column(
        SAEnum(AttachmentStatus, name="attachment_status"),
        default=AttachmentStatus.pending,
        nullable=False,
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
