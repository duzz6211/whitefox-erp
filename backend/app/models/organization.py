"""회사(자사) 기본 정보 — 싱글톤 (row 1개)."""
from datetime import datetime, date
from sqlalchemy import String, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class OrganizationInfo(Base):
    __tablename__ = "organization_info"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    business_name: Mapped[str] = mapped_column(String(200), default="", nullable=False)  # 법인명
    representative_name: Mapped[str] = mapped_column(String(100), default="", nullable=False)  # 대표자
    business_number: Mapped[str] = mapped_column(String(50), default="", nullable=False)  # 사업자등록번호
    corporate_number: Mapped[str] = mapped_column(String(50), default="", nullable=False)  # 법인등록번호
    business_type: Mapped[str] = mapped_column(String(100), default="", nullable=False)  # 업태
    business_item: Mapped[str] = mapped_column(String(200), default="", nullable=False)  # 종목
    address: Mapped[str] = mapped_column(String(300), default="", nullable=False)  # 주소
    phone: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    email: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    website: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    established_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
