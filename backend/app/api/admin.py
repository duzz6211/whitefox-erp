from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_admin
from app.engine.risk import check_and_flag_risks
from app.models.user import User


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/run-risk-check")
def run_risk_check(
    db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    flagged = check_and_flag_risks(db)
    return {
        "flagged_count": len(flagged),
        "flagged": [{"id": b.id, "title": b.title} for b in flagged],
    }
