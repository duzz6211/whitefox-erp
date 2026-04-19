from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PickupRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    box_id: str
    completed_by: str
    picked_by: str
    note: str
    created_at: datetime
