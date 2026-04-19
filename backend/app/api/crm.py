from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_admin
from app.models.crm import (
    Company, CompanyStatus, Contact, Deal, DealStage, Invoice, InvoiceStatus,
)
from app.models.project import Project, ProjectCategory, ProjectStatus
from app.models.user import User
from app.schemas.crm import (
    CompanyCreate, CompanyUpdate, CompanyOut,
    ContactCreate, ContactUpdate, ContactOut,
    DealCreate, DealUpdate, DealOut,
    InvoiceCreate, InvoiceUpdate, InvoiceOut,
)
from app.schemas.project import ProjectOut
from app.models.activity import ActivityType, SubjectType
from app.engine.activity import record_activity


companies_router = APIRouter(prefix="/companies", tags=["crm"])
contacts_router = APIRouter(tags=["crm"])
deals_router = APIRouter(prefix="/deals", tags=["crm"])
invoices_router = APIRouter(tags=["crm"])


# === Company ===

@companies_router.get("", response_model=list[CompanyOut])
def list_companies(
    status_: CompanyStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Company)
    if status_:
        query = query.filter(Company.status == status_)
    if q:
        like = f"%{q}%"
        query = query.filter(Company.name.ilike(like))
    return query.order_by(Company.name).all()


@companies_router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    data: CompanyCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    company = Company(**data.model_dump())
    db.add(company)
    db.flush()
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.company_created,
        subject_type=SubjectType.company,
        subject_id=company.id,
        summary=f"{admin.name}님이 고객사 \"{company.name}\"를 등록",
    )
    db.commit()
    db.refresh(company)
    return company


@companies_router.get("/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    return company


@companies_router.put("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: str,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return company


# === Contact (company 하위) ===

@contacts_router.get("/companies/{company_id}/contacts", response_model=list[ContactOut])
def list_contacts(
    company_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if not db.get(Company, company_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    return (
        db.query(Contact)
        .filter(Contact.company_id == company_id)
        .order_by(Contact.name)
        .all()
    )


@contacts_router.post(
    "/companies/{company_id}/contacts",
    response_model=ContactOut,
    status_code=status.HTTP_201_CREATED,
)
def create_contact(
    company_id: str,
    data: ContactCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not db.get(Company, company_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    payload = data.model_dump()
    if payload.get("email"):
        payload["email"] = str(payload["email"])
    contact = Contact(company_id=company_id, **payload)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@contacts_router.put("/contacts/{contact_id}", response_model=ContactOut)
def update_contact(
    contact_id: str,
    data: ContactUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "담당자를 찾을 수 없습니다")
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "email" and v is not None:
            v = str(v)
        setattr(contact, k, v)
    db.commit()
    db.refresh(contact)
    return contact


@contacts_router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "담당자를 찾을 수 없습니다")
    db.delete(contact)
    db.commit()


# === Deal ===

@deals_router.get("", response_model=list[DealOut])
def list_deals(
    company_id: str | None = Query(default=None),
    stage: DealStage | None = Query(default=None),
    owner: str | None = Query(default=None, description="user id or 'me'"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Deal)
    if company_id:
        query = query.filter(Deal.company_id == company_id)
    if stage:
        query = query.filter(Deal.stage == stage)
    if owner:
        target = user.id if owner == "me" else owner
        query = query.filter(Deal.owner_id == target)
    return query.order_by(Deal.created_at.desc()).all()


@deals_router.post("", response_model=DealOut, status_code=status.HTTP_201_CREATED)
def create_deal(
    data: DealCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    company = db.get(Company, data.company_id)
    if not company:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    payload = data.model_dump()
    if not payload.get("owner_id"):
        payload["owner_id"] = user.id
    deal = Deal(**payload)
    db.add(deal)
    db.flush()
    record_activity(
        db,
        actor_id=user.id,
        type=ActivityType.deal_created,
        subject_type=SubjectType.deal,
        subject_id=deal.id,
        summary=f"{user.name}님이 딜 \"{deal.title}\" ({company.name})을 생성",
    )
    db.commit()
    db.refresh(deal)
    return deal


@deals_router.get("/{deal_id}", response_model=DealOut)
def get_deal(
    deal_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "딜을 찾을 수 없습니다")
    return deal


@deals_router.put("/{deal_id}", response_model=DealOut)
def update_deal(
    deal_id: str,
    data: DealUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "딜을 찾을 수 없습니다")
    # admin은 모두 수정, member는 자기 owner 딜만
    if not user.is_admin and deal.owner_id != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "admin 또는 owner만 딜을 수정할 수 있습니다"
        )
    payload = data.model_dump(exclude_unset=True)
    old_stage = deal.stage
    for k, v in payload.items():
        setattr(deal, k, v)
    db.flush()
    if "stage" in payload and deal.stage != old_stage:
        record_activity(
            db,
            actor_id=user.id,
            type=ActivityType.deal_stage_changed,
            subject_type=SubjectType.deal,
            subject_id=deal.id,
            summary=f"{user.name}님이 딜 \"{deal.title}\" 단계를 {old_stage.value} → {deal.stage.value}로 이동",
            meta={"from": old_stage.value, "to": deal.stage.value},
        )
    db.commit()
    db.refresh(deal)
    return deal


@deals_router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(
    deal_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "딜을 찾을 수 없습니다")
    db.delete(deal)
    db.commit()


@deals_router.post("/{deal_id}/create-project", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project_from_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "딜을 찾을 수 없습니다")
    if deal.stage != DealStage.won:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "성사(won)된 딜만 프로젝트로 변환할 수 있습니다",
        )
    if not user.is_admin and deal.owner_id != user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "admin 또는 딜 owner만 프로젝트를 생성할 수 있습니다"
        )

    # 이미 같은 회사+이름의 active 프로젝트가 있는지 확인 (중복 방지)
    existing = (
        db.query(Project)
        .filter(
            Project.company_id == deal.company_id,
            Project.name == deal.title,
            Project.status == ProjectStatus.active,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"이미 같은 이름의 활성 프로젝트가 있습니다 (id={existing.id})",
        )

    project = Project(
        name=deal.title,
        priority=8,
        category=ProjectCategory.client_work,
        company_id=deal.company_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


# === Invoice ===

@invoices_router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(
    company_id: str | None = Query(default=None),
    status_: InvoiceStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Invoice)
    if company_id:
        query = query.filter(Invoice.company_id == company_id)
    if status_:
        query = query.filter(Invoice.status == status_)
    return query.order_by(Invoice.issued_date.desc(), Invoice.created_at.desc()).all()


@invoices_router.get("/companies/{company_id}/invoices", response_model=list[InvoiceOut])
def list_company_invoices(
    company_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if not db.get(Company, company_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    return (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id)
        .order_by(Invoice.issued_date.desc())
        .all()
    )


@invoices_router.post(
    "/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED
)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if not db.get(Company, data.company_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "고객사를 찾을 수 없습니다")
    if data.deal_id and not db.get(Deal, data.deal_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "딜을 찾을 수 없습니다")
    invoice = Invoice(created_by=user.id, **data.model_dump())
    db.add(invoice)
    db.flush()
    record_activity(
        db,
        actor_id=user.id,
        type=ActivityType.invoice_created,
        subject_type=SubjectType.invoice,
        subject_id=invoice.id,
        summary=f"{user.name}님이 인보이스 \"{invoice.invoice_number} · {invoice.title}\" (₩{invoice.amount:,})를 발행",
    )
    db.commit()
    db.refresh(invoice)
    return invoice


@invoices_router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "인보이스를 찾을 수 없습니다")
    return invoice


@invoices_router.put("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "인보이스를 찾을 수 없습니다")
    payload = data.model_dump(exclude_unset=True)
    old_status = invoice.status
    if payload.get("status") == InvoiceStatus.paid and not invoice.paid_date and not payload.get("paid_date"):
        from datetime import date as _date
        payload["paid_date"] = _date.today()
    for k, v in payload.items():
        setattr(invoice, k, v)
    db.flush()
    if "status" in payload and invoice.status != old_status:
        record_activity(
            db,
            actor_id=admin.id,
            type=ActivityType.invoice_status_changed,
            subject_type=SubjectType.invoice,
            subject_id=invoice.id,
            summary=f"{admin.name}님이 인보이스 {invoice.invoice_number} 상태를 {old_status.value} → {invoice.status.value}로 변경",
            meta={"from": old_status.value, "to": invoice.status.value},
        )
    db.commit()
    db.refresh(invoice)
    return invoice


@invoices_router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "인보이스를 찾을 수 없습니다")
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.invoice_deleted,
        subject_type=SubjectType.invoice,
        subject_id=invoice.id,
        summary=f"{admin.name}님이 인보이스 {invoice.invoice_number}를 삭제",
        meta={"invoice_number": invoice.invoice_number, "amount": invoice.amount},
    )
    db.delete(invoice)
    db.commit()
