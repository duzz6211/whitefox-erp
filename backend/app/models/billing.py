import enum
from datetime import datetime, date
from sqlalchemy import String, Text, Integer, BigInteger, Enum as SAEnum, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._common import uuid_str, utcnow


class BillingCategory(str, enum.Enum):
    subscription = "subscription"
    infra = "infra"
    tool = "tool"
    service = "service"
    other = "other"


class BillingCycle(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"
    one_time = "one_time"


class Billing(Base):
    __tablename__ = "billings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[BillingCategory] = mapped_column(
        SAEnum(BillingCategory, name="billing_category"),
        default=BillingCategory.other,
        nullable=False,
        index=True,
    )
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    cycle: Mapped[BillingCycle] = mapped_column(
        SAEnum(BillingCycle, name="billing_cycle"),
        default=BillingCycle.monthly,
        nullable=False,
    )
    billing_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    vendor: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class BillingPayment(Base):
    __tablename__ = "billing_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    billing_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("billings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    paid_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
