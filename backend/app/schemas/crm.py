from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.crm import CompanyStatus, DealStage, InvoiceStatus


# === Company ===

class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    domain: str | None = Field(default=None, max_length=200)
    industry: str | None = Field(default=None, max_length=100)
    notes: str = Field(default="", max_length=5000)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    domain: str | None = Field(default=None, max_length=200)
    industry: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)
    status: CompanyStatus | None = None


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    domain: str | None
    industry: str | None
    notes: str
    status: CompanyStatus
    created_at: datetime


# === Contact ===

class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    title: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    notes: str = Field(default="", max_length=2000)


class ContactUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    name: str
    title: str | None
    email: str | None
    phone: str | None
    notes: str
    created_at: datetime


# === Deal ===

class DealCreate(BaseModel):
    company_id: str
    title: str = Field(min_length=1, max_length=200)
    amount: int | None = Field(default=None, ge=0)
    stage: DealStage = DealStage.lead
    expected_close_date: date | None = None
    owner_id: str | None = None
    notes: str = Field(default="", max_length=5000)


class DealUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    amount: int | None = Field(default=None, ge=0)
    stage: DealStage | None = None
    expected_close_date: date | None = None
    owner_id: str | None = None
    notes: str | None = Field(default=None, max_length=5000)


class DealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    title: str
    amount: int | None
    stage: DealStage
    expected_close_date: date | None
    owner_id: str | None
    notes: str
    created_at: datetime


# === Invoice ===

class InvoiceCreate(BaseModel):
    company_id: str
    deal_id: str | None = None
    invoice_number: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    amount: int = Field(ge=0)
    issued_date: date
    due_date: date | None = None
    notes: str = Field(default="", max_length=5000)


class InvoiceUpdate(BaseModel):
    deal_id: str | None = None
    invoice_number: str | None = Field(default=None, max_length=100)
    title: str | None = Field(default=None, max_length=200)
    amount: int | None = Field(default=None, ge=0)
    status: InvoiceStatus | None = None
    issued_date: date | None = None
    due_date: date | None = None
    paid_date: date | None = None
    notes: str | None = Field(default=None, max_length=5000)


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    deal_id: str | None
    invoice_number: str
    title: str
    amount: int
    status: InvoiceStatus
    issued_date: date
    due_date: date | None
    paid_date: date | None
    notes: str
    created_by: str
    created_at: datetime
