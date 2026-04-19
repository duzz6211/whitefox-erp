from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class ContextCard(Base):
    __tablename__ = "context_cards"
    __table_args__ = (UniqueConstraint("box_id", name="uq_context_card_box"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    box_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    why: Mapped[str] = mapped_column(Text, default="", nullable=False)
    success_criteria: Mapped[str] = mapped_column(Text, default="", nullable=False)
    decision_history: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    box: Mapped["Box"] = relationship(back_populates="context_card")  # noqa: F821
