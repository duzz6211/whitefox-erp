from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.box import Box, FlowStatus
from app.models.async_log import AsyncLog, LogType
from app.models.pickup_record import PickupRecord
from app.models.user import User
from app.models.activity import ActivityType, SubjectType
from app.models._common import utcnow
from app.engine.state_machine import can_transition
from app.engine.permissions import check_permission
from app.engine.activity import record_activity


MIN_LOG_LENGTH = 10


def transition_box(
    db: Session,
    box: Box,
    user: User,
    to_status: FlowStatus,
    log_message: str,
) -> Box:
    # 1. State Machine
    if not can_transition(box.flow_status, to_status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"허용되지 않는 전이: {box.flow_status.value} → {to_status.value}",
        )

    # 2. Permission Guard
    failing = check_permission(user, box, to_status)
    if failing is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=failing.message)

    # 3. Log 강제
    if not log_message or len(log_message.strip()) < MIN_LOG_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"로그 메시지 필수 (최소 {MIN_LOG_LENGTH}자)",
        )

    # 4. 전이 실행
    old_status = box.flow_status
    previous_owner = box.owner_id
    box.flow_status = to_status
    box.status_changed_at = utcnow()

    activity_type = ActivityType.box_transitioned
    notify: list[str] = []

    # owner 재지정 로직
    if old_status == FlowStatus.wait and to_status == FlowStatus.working:
        box.owner_id = user.id
    elif old_status == FlowStatus.pickup and to_status == FlowStatus.working:
        box.owner_id = user.id
        activity_type = ActivityType.box_picked_up
        if previous_owner and previous_owner != user.id:
            db.add(
                PickupRecord(
                    box_id=box.id,
                    completed_by=previous_owner,
                    picked_by=user.id,
                    note=log_message.strip(),
                )
            )
            notify.append(previous_owner)  # 직전 owner에게 알림
    elif old_status == FlowStatus.blocked and to_status == FlowStatus.review:
        box.risk_flag = False
    elif old_status == FlowStatus.review and to_status == FlowStatus.working:
        pass

    # 5. Log append
    db.add(
        AsyncLog(
            box_id=box.id,
            author_id=user.id,
            content=f"[{old_status.value}→{to_status.value}] {log_message.strip()}",
            log_type=LogType.work,
        )
    )

    # Activity 기록
    if activity_type == ActivityType.box_picked_up:
        summary = f"{user.name}님이 박스 \"{box.title}\"를 이어받았습니다"
    else:
        summary = f"{user.name}님이 박스 \"{box.title}\" 상태를 {old_status.value} → {to_status.value}로 변경"
    record_activity(
        db,
        actor_id=user.id,
        type=activity_type,
        subject_type=SubjectType.box,
        subject_id=box.id,
        summary=summary,
        meta={"from": old_status.value, "to": to_status.value},
        notify=notify,
    )

    db.add(box)
    db.commit()
    db.refresh(box)
    return box
