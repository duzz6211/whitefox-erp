from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus, ProjectCategory


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    priority: int = Field(default=5, ge=1, le=10)
    category: ProjectCategory = ProjectCategory.internal_ops
    company_id: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    priority: int | None = Field(default=None, ge=1, le=10)
    category: ProjectCategory | None = None
    status: ProjectStatus | None = None
    company_id: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    priority: int
    category: ProjectCategory
    status: ProjectStatus
    company_id: str | None
    created_at: datetime
