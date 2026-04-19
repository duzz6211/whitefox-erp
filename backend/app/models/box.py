import enum
from datetime import datetime, date
from sqlalchemy import String, Integer, Enum as SAEnum, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class FlowStatus(str, enum.Enum):
    wait = "wait"
    working = "working"
    pickup = "pickup"
    blocked = "blocked"
    review = "review"
    done = "done"


class Box(Base):
    __tablename__ = "boxes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    flow_status: Mapped[FlowStatus] = mapped_column(
        SAEnum(FlowStatus, name="flow_status"), default=FlowStatus.wait, nullable=False, index=True
    )
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    risk_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    week_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="boxes")  # noqa: F821
    owner: Mapped["User | None"] = relationship()  # noqa: F821
    logs: Mapped[list["AsyncLog"]] = relationship(  # noqa: F821
        back_populates="box", cascade="all, delete-orphan", order_by="AsyncLog.created_at"
    )
    context_card: Mapped["ContextCard | None"] = relationship(  # noqa: F821
        back_populates="box", cascade="all, delete-orphan", uselist=False
    )
    pickup_records: Mapped[list["PickupRecord"]] = relationship(  # noqa: F821
        back_populates="box", cascade="all, delete-orphan", order_by="PickupRecord.created_at"
    )
