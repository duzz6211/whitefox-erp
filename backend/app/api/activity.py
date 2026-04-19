from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.deps import get_current_user, require_admin
from app.models.activity import Activity, ActivityType, AUDIT_TYPES, Notification
from app.models.user import User
from app.schemas.activity import ActivityOut, NotificationOut


router = APIRouter(tags=["activity"])


# === Activity feed (전사 공개) ===

@router.get("/activity", response_model=list[ActivityOut])
def list_activity(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Activity)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )


# === Audit log (admin 전용) ===

@router.get("/audit", response_model=list[ActivityOut])
def list_audit(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return (
        db.query(Activity)
        .filter(Activity.type.in_(list(AUDIT_TYPES)))
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )


# === Notifications (본인) ===

@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    only_unread: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = (
        db.query(Notification)
        .options(joinedload(Notification.activity))
        .filter(Notification.user_id == user.id)
    )
    if only_unread:
        q = q.filter(Notification.read_at.is_(None))
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/notifications/unread-count")
def unread_count(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .count()
    )
    return {"unread": count}


@router.post("/notifications/{notification_id}/read")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "알림을 찾을 수 없습니다")
    if notif.read_at is None:
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .update({"read_at": now}, synchronize_session=False)
    )
    db.commit()
    return {"ok": True}
