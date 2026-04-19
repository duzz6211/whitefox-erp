from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.activity import ActivityType, SubjectType


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    actor_id: str | None
    type: ActivityType
    subject_type: SubjectType
    subject_id: str
    summary: str
    meta: dict | None
    created_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    activity: ActivityOut
    read_at: datetime | None
    created_at: datetime
