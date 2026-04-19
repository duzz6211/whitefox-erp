from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.attachment import AttachmentTarget, AttachmentStatus


class AttachmentPresignRequest(BaseModel):
    target_type: AttachmentTarget
    target_id: str
    file_name: str = Field(min_length=1, max_length=500)
    file_type: str = Field(max_length=100)
    file_size: int = Field(gt=0, le=50 * 1024 * 1024)


class AttachmentPresignResponse(BaseModel):
    attachment_id: str
    upload_url: str
    expires_in: int


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    target_type: AttachmentTarget
    target_id: str
    file_name: str
    file_url: str
    file_type: str
    file_size: int
    status: AttachmentStatus
    uploaded_by: str
    confirmed_at: datetime | None
    created_at: datetime
