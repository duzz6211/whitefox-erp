from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.box import Box
from app.models.crm import Company, Invoice
from app.models.project import Project
from app.models.user import User


router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(
    q: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """전역 검색 — 박스/프로젝트/회사/인보이스 한 번에."""
    like = f"%{q.strip()}%"

    boxes = db.query(Box).filter(Box.title.ilike(like)).limit(20).all()
    projects = db.query(Project).filter(Project.name.ilike(like)).limit(20).all()
    companies = db.query(Company).filter(Company.name.ilike(like)).limit(20).all()
    invoices = (
        db.query(Invoice)
        .filter(or_(Invoice.invoice_number.ilike(like), Invoice.title.ilike(like)))
        .limit(20)
        .all()
    )

    return {
        "boxes": [
            {"id": b.id, "title": b.title, "flow_status": b.flow_status.value, "project_id": b.project_id}
            for b in boxes
        ],
        "projects": [
            {"id": p.id, "name": p.name, "category": p.category.value, "status": p.status.value}
            for p in projects
        ],
        "companies": [
            {"id": c.id, "name": c.name, "industry": c.industry, "status": c.status.value}
            for c in companies
        ],
        "invoices": [
            {
                "id": i.id,
                "invoice_number": i.invoice_number,
                "title": i.title,
                "amount": i.amount,
                "status": i.status.value,
                "company_id": i.company_id,
            }
            for i in invoices
        ],
    }
