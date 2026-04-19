from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field


class OrganizationInfoUpdate(BaseModel):
    business_name: str | None = Field(default=None, max_length=200)
    representative_name: str | None = Field(default=None, max_length=100)
    business_number: str | None = Field(default=None, max_length=50)
    corporate_number: str | None = Field(default=None, max_length=50)
    business_type: str | None = Field(default=None, max_length=100)
    business_item: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=200)
    established_date: date | None = None
    notes: str | None = Field(default=None, max_length=5000)


class OrganizationInfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    business_name: str
    representative_name: str
    business_number: str
    corporate_number: str
    business_type: str
    business_item: str
    address: str
    phone: str
    email: str
    website: str
    established_date: date | None
    notes: str
    updated_at: datetime
