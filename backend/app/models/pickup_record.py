from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class PickupRecord(Base):
    __tablename__ = "pickup_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    box_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    completed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    picked_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    box: Mapped["Box"] = relationship(back_populates="pickup_records")  # noqa: F821
