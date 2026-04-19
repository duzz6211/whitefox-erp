import enum
from datetime import datetime
from sqlalchemy import String, Text, Enum as SAEnum, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class ActivityType(str, enum.Enum):
    # Box
    box_created = "box_created"
    box_transitioned = "box_transitioned"
    box_picked_up = "box_picked_up"
    box_reassigned = "box_reassigned"
    box_deleted = "box_deleted"
    box_risk_flagged = "box_risk_flagged"
    # Project
    project_created = "project_created"
    project_completed = "project_completed"
    project_archived = "project_archived"
    # Brief
    brief_updated = "brief_updated"
    # CRM
    company_created = "company_created"
    deal_created = "deal_created"
    deal_stage_changed = "deal_stage_changed"
    invoice_created = "invoice_created"
    invoice_status_changed = "invoice_status_changed"
    invoice_deleted = "invoice_deleted"
    # Members
    member_invited = "member_invited"
    member_deactivated = "member_deactivated"


AUDIT_TYPES: set[ActivityType] = {
    ActivityType.box_deleted,
    ActivityType.box_reassigned,
    ActivityType.project_archived,
    ActivityType.invoice_deleted,
    ActivityType.member_deactivated,
}


class SubjectType(str, enum.Enum):
    box = "box"
    project = "project"
    brief = "brief"
    company = "company"
    deal = "deal"
    invoice = "invoice"
    user = "user"


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    actor_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[ActivityType] = mapped_column(
        SAEnum(ActivityType, name="activity_type"), nullable=False, index=True
    )
    subject_type: Mapped[SubjectType] = mapped_column(
        SAEnum(SubjectType, name="activity_subject"), nullable=False, index=True
    )
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    actor: Mapped["User | None"] = relationship()  # noqa: F821
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="activity", cascade="all, delete-orphan"
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("activities.id", ondelete="CASCADE"), nullable=False
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    activity: Mapped["Activity"] = relationship(back_populates="notifications")
