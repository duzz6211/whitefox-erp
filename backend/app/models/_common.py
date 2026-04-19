import uuid
from datetime import datetime, timezone
from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped


def uuid_str() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
