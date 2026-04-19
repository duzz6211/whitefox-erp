from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_admin
from app.models.user import User
from app.models.activity import ActivityType, SubjectType
from app.schemas.user import UserOut
from app.engine.activity import record_activity


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(User)
    if not include_inactive:
        query = query.filter(User.is_active.is_(True))
    return query.order_by(User.is_active.desc(), User.name).all()


@router.post("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "사용자를 찾을 수 없습니다")
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "본인은 비활성화할 수 없습니다")
    if not target.is_active:
        return target
    target.is_active = False
    target.deactivated_at = datetime.now(timezone.utc)
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.member_deactivated,
        subject_type=SubjectType.user,
        subject_id=target.id,
        summary=f"{admin.name}님이 {target.name}({target.email})님을 비활성화",
    )
    db.commit()
    db.refresh(target)
    return target


@router.post("/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "사용자를 찾을 수 없습니다")
    target.is_active = True
    target.deactivated_at = None
    db.commit()
    db.refresh(target)
    return target
