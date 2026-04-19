"""Activity 기록 + 사용자 알림 생성 헬퍼."""
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.activity import Activity, ActivityType, Notification, SubjectType


def record_activity(
    db: Session,
    *,
    actor_id: str | None,
    type: ActivityType,
    subject_type: SubjectType,
    subject_id: str,
    summary: str,
    meta: dict | None = None,
    notify: Iterable[str] | None = None,
) -> Activity:
    """Activity를 만들고, 알림 대상자(notify)에게 Notification 생성.

    - notify: 알림받을 user_id 목록. actor 본인은 자동 제외.
    - db.commit()은 호출자가 담당 (기존 트랜잭션과 함께 커밋).
    """
    activity = Activity(
        actor_id=actor_id,
        type=type,
        subject_type=subject_type,
        subject_id=subject_id,
        summary=summary,
        meta=meta,
    )
    db.add(activity)
    db.flush()  # activity.id 확보

    targets = {uid for uid in (notify or []) if uid and uid != actor_id}
    for uid in targets:
        db.add(Notification(user_id=uid, activity_id=activity.id))

    return activity
