import enum
from datetime import datetime
from sqlalchemy import String, Integer, Enum as SAEnum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class ProjectStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class ProjectCategory(str, enum.Enum):
    product = "product"
    client_work = "client_work"
    internal_ops = "internal_ops"
    marketing = "marketing"
    design = "design"
    research = "research"
    # 기존 호환
    client = "client"
    internal = "internal"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    category: Mapped[ProjectCategory] = mapped_column(
        SAEnum(ProjectCategory, name="project_category"),
        default=ProjectCategory.internal,
        nullable=False,
    )
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, name="project_status"),
        default=ProjectStatus.active,
        nullable=False,
    )
    company_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    boxes: Mapped[list["Box"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
