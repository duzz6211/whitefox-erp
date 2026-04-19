from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.box import Box
from app.models.pickup_record import PickupRecord
from app.models.user import User
from app.schemas.pickup_record import PickupRecordOut


router = APIRouter(tags=["pickups"])


@router.get("/boxes/{box_id}/pickups", response_model=list[PickupRecordOut])
def list_pickups(
    box_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if not db.get(Box, box_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    return (
        db.query(PickupRecord)
        .filter(PickupRecord.box_id == box_id)
        .order_by(PickupRecord.created_at.desc())
        .all()
    )
