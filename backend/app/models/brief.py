from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class ProjectBrief(Base):
    __tablename__ = "project_briefs"
    __table_args__ = (UniqueConstraint("project_id", name="uq_brief_project"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requirements: Mapped[str] = mapped_column(Text, default="", nullable=False)
    client_info: Mapped[str] = mapped_column(Text, default="", nullable=False)
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    versions: Mapped[list["BriefVersion"]] = relationship(
        back_populates="brief",
        cascade="all, delete-orphan",
        order_by="BriefVersion.version_number.desc()",
    )


class BriefVersion(Base):
    __tablename__ = "brief_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    brief_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("project_briefs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    change_reason: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    brief: Mapped["ProjectBrief"] = relationship(back_populates="versions")
