from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.async_log import AsyncLog, LogType
from app.models.box import Box
from app.models.user import User
from app.schemas.log import LogCreate, LogOut


router = APIRouter(tags=["logs"])


@router.get("/boxes/{box_id}/logs", response_model=list[LogOut])
def list_logs(
    box_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if not db.get(Box, box_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    return (
        db.query(AsyncLog)
        .filter(AsyncLog.box_id == box_id)
        .order_by(AsyncLog.created_at.asc())
        .all()
    )


@router.post(
    "/boxes/{box_id}/logs",
    response_model=LogOut,
    status_code=status.HTTP_201_CREATED,
)
def add_log(
    box_id: str,
    data: LogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.get(Box, box_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    log = AsyncLog(
        box_id=box_id,
        author_id=user.id,
        content=data.content.strip(),
        log_type=LogType.comment,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
