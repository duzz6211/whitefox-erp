from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_admin
from app.models.billing import Billing, BillingPayment
from app.models.user import User
from app.schemas.billing import (
    BillingCreate, BillingUpdate, BillingOut,
    PaymentCreate, PaymentOut, MonthlySummary,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("", response_model=list[BillingOut])
def list_billings(
    active_only: bool = True,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(Billing)
    if active_only:
        q = q.filter(Billing.is_active.is_(True))
    return q.order_by(Billing.billing_date.desc()).all()


@router.post("", response_model=BillingOut, status_code=status.HTTP_201_CREATED)
def create_billing(
    payload: BillingCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    billing = Billing(**payload.model_dump(), created_by=admin.id)
    db.add(billing)
    db.commit()
    db.refresh(billing)
    return billing


@router.get("/{billing_id}", response_model=BillingOut)
def get_billing(
    billing_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    billing = db.get(Billing, billing_id)
    if not billing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "결제 항목을 찾을 수 없습니다")
    return billing


@router.put("/{billing_id}", response_model=BillingOut)
def update_billing(
    billing_id: str,
    payload: BillingUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    billing = db.get(Billing, billing_id)
    if not billing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "결제 항목을 찾을 수 없습니다")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(billing, k, v)
    db.commit()
    db.refresh(billing)
    return billing


@router.delete("/{billing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_billing(
    billing_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    billing = db.get(Billing, billing_id)
    if not billing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "결제 항목을 찾을 수 없습니다")
    db.delete(billing)
    db.commit()


# ── 결제 기록 (Payment) ──

@router.get("/{billing_id}/payments", response_model=list[PaymentOut])
def list_payments(
    billing_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not db.get(Billing, billing_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "결제 항목을 찾을 수 없습니다")
    return (
        db.query(BillingPayment)
        .filter(BillingPayment.billing_id == billing_id)
        .order_by(BillingPayment.paid_date.desc())
        .all()
    )


@router.post("/{billing_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def add_payment(
    billing_id: str,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not db.get(Billing, billing_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "결제 항목을 찾을 수 없습니다")
    payment = BillingPayment(billing_id=billing_id, **payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{billing_id}/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    billing_id: str,
    payment_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    payment = db.get(BillingPayment, payment_id)
    if not payment or payment.billing_id != billing_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "결제 기록을 찾을 수 없습니다")
    db.delete(payment)
    db.commit()


# ── 월별 요약 ──

@router.get("/summary/monthly", response_model=list[MonthlySummary])
def monthly_summary(
    year: int | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(
        func.to_char(BillingPayment.paid_date, 'YYYY-MM').label("month"),
        func.sum(BillingPayment.amount).label("total"),
        func.count(BillingPayment.id).label("count"),
    )
    if year:
        q = q.filter(extract("year", BillingPayment.paid_date) == year)
    rows = q.group_by("month").order_by(func.to_char(BillingPayment.paid_date, 'YYYY-MM').desc()).all()
    return [MonthlySummary(month=r.month, total=r.total, count=r.count) for r in rows]
