from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ContextCardUpsert(BaseModel):
    why: str = Field(default="", max_length=5000)
    success_criteria: str = Field(default="", max_length=5000)
    decision_history: str = Field(default="", max_length=10000)


class ContextCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    box_id: str
    why: str
    success_criteria: str
    decision_history: str
    updated_at: datetime
