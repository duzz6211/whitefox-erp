from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BriefUpdate(BaseModel):
    requirements: str = Field(default="", max_length=50000)
    client_info: str = Field(default="", max_length=10000)
    change_reason: str = Field(min_length=5, max_length=500)


class BriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    requirements: str
    client_info: str
    current_version: int
    updated_at: datetime


class BriefVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    brief_id: str
    version_number: int
    snapshot_json: str
    change_reason: str
    created_by: str
    created_at: datetime
