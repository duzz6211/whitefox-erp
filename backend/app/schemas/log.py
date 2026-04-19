from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.async_log import LogType


class LogCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    box_id: str
    author_id: str
    content: str
    log_type: LogType
    created_at: datetime
