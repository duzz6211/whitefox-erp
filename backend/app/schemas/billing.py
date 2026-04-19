from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field

from app.models.billing import BillingCategory, BillingCycle


class BillingCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: BillingCategory = BillingCategory.other
    amount: int = Field(ge=0)
    cycle: BillingCycle = BillingCycle.monthly
    billing_date: date
    next_billing_date: date | None = None
    vendor: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=5000)


class BillingUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    category: BillingCategory | None = None
    amount: int | None = Field(default=None, ge=0)
    cycle: BillingCycle | None = None
    billing_date: date | None = None
    next_billing_date: date | None = None
    vendor: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=5000)
    is_active: bool | None = None


class BillingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    category: BillingCategory
    amount: int
    cycle: BillingCycle
    billing_date: date
    next_billing_date: date | None
    vendor: str
    notes: str
    is_active: bool
    created_by: str
    created_at: datetime


class PaymentCreate(BaseModel):
    amount: int = Field(ge=0)
    paid_date: date
    notes: str = Field(default="", max_length=5000)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    billing_id: str
    amount: int
    paid_date: date
    notes: str
    created_at: datetime


class MonthlySummary(BaseModel):
    month: str
    total: int
    count: int
