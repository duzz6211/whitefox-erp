from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

from app.models.box import FlowStatus


class BoxCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    deadline: date | None = None
    week_number: int | None = Field(default=None, ge=1)


class BoxUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    deadline: date | None = None
    week_number: int | None = Field(default=None, ge=1)


class BoxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    owner_id: str | None
    title: str
    flow_status: FlowStatus
    deadline: date | None
    risk_flag: bool
    week_number: int | None
    status_changed_at: datetime
    created_at: datetime


class TransitionRequest(BaseModel):
    to: FlowStatus
    log_message: str = Field(min_length=10, max_length=2000)


class ReassignRequest(BaseModel):
    new_owner_id: str | None = None  # None이면 owner 제거(백로그로 되돌림)
    reason: str = Field(min_length=10, max_length=500)


class DeleteRequest(BaseModel):
    reason: str = Field(min_length=10, max_length=500)
