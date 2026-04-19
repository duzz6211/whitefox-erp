"""Risk Detector: blocked 상태가 24h 초과한 박스를 자동 플래그.

설계 문서 7.3 참조.
"""
from datetime import datetime, timezone, timedelta
import logging

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.async_log import AsyncLog, LogType
from app.models.box import Box, FlowStatus
from app.models.user import User, UserRole
from app.models.activity import ActivityType, SubjectType
from app.engine.activity import record_activity


logger = logging.getLogger(__name__)

RISK_THRESHOLD_HOURS = 24


def check_and_flag_risks(db: Session) -> list[Box]:
    """blocked 24h+ 인 박스에 risk_flag=True 세팅 + 시스템 로그 기록.

    Returns newly flagged boxes.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=RISK_THRESHOLD_HOURS)
    candidates = (
        db.query(Box)
        .filter(
            Box.flow_status == FlowStatus.blocked,
            Box.risk_flag.is_(False),
            Box.status_changed_at < cutoff,
        )
        .all()
    )

    flagged: list[Box] = []
    admin_ids = [u.id for u in db.query(User).filter(User.role == UserRole.admin, User.is_active.is_(True)).all()]
    for box in candidates:
        box.risk_flag = True
        if box.owner_id:
            db.add(
                AsyncLog(
                    box_id=box.id,
                    author_id=box.owner_id,
                    content=f"[system] {RISK_THRESHOLD_HOURS}시간 이상 외부 대기 — 리스크 플래그 자동 설정",
                    log_type=LogType.system,
                )
            )
        notify = set(admin_ids)
        if box.owner_id:
            notify.add(box.owner_id)
        record_activity(
            db,
            actor_id=None,
            type=ActivityType.box_risk_flagged,
            subject_type=SubjectType.box,
            subject_id=box.id,
            summary=f"⚠ 박스 \"{box.title}\"이 {RISK_THRESHOLD_HOURS}시간+ 외부 대기로 리스크 플래그됨",
            notify=list(notify),
        )
        flagged.append(box)

    if flagged:
        db.commit()
        logger.info("risk: flagged %d boxes", len(flagged))

    return flagged


def run_risk_check_job() -> None:
    """스케줄러 등이 호출하는 엔트리포인트 — 세션 관리 포함."""
    db = SessionLocal()
    try:
        check_and_flag_risks(db)
    except Exception:
        logger.exception("risk check failed")
    finally:
        db.close()
