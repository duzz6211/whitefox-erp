from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.box import Box, FlowStatus
from app.models.project import Project
from app.models.user import User
from app.schemas.box import BoxCreate, BoxUpdate, BoxOut, TransitionRequest, ReassignRequest, DeleteRequest
from app.engine.transitions import transition_box
from app.engine.activity import record_activity
from app.models.activity import ActivityType, SubjectType
from app.models.async_log import AsyncLog, LogType
from app.deps import require_admin


router = APIRouter(tags=["boxes"])


@router.get("/boxes", response_model=list[BoxOut])
def list_boxes(
    project_id: str | None = Query(default=None),
    status_: FlowStatus | None = Query(default=None, alias="status"),
    owner: str | None = Query(default=None, description="user id or 'me'"),
    risk: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Box)
    if project_id:
        q = q.filter(Box.project_id == project_id)
    if status_:
        q = q.filter(Box.flow_status == status_)
    if owner:
        target = user.id if owner == "me" else owner
        q = q.filter(Box.owner_id == target)
    if risk is not None:
        q = q.filter(Box.risk_flag.is_(risk))
    return q.order_by(Box.created_at.desc()).all()


@router.post(
    "/projects/{project_id}/boxes",
    response_model=BoxOut,
    status_code=status.HTTP_201_CREATED,
)
def create_box(
    project_id: str,
    data: BoxCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not db.get(Project, project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "프로젝트를 찾을 수 없습니다")
    box = Box(project_id=project_id, **data.model_dump())
    db.add(box)
    db.flush()
    record_activity(
        db,
        actor_id=user.id,
        type=ActivityType.box_created,
        subject_type=SubjectType.box,
        subject_id=box.id,
        summary=f"{user.name}님이 박스 \"{box.title}\"를 생성",
    )
    db.commit()
    db.refresh(box)
    return box


@router.get("/boxes/{box_id}", response_model=BoxOut)
def get_box(box_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    box = db.get(Box, box_id)
    if not box:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    return box


@router.patch("/boxes/{box_id}", response_model=BoxOut)
def update_box(
    box_id: str,
    data: BoxUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    box = db.get(Box, box_id)
    if not box:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(box, k, v)
    db.commit()
    db.refresh(box)
    return box


@router.patch("/boxes/{box_id}/transition", response_model=BoxOut)
def transition(
    box_id: str,
    data: TransitionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    box = db.get(Box, box_id)
    if not box:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    return transition_box(db, box, user, data.to, data.log_message)


@router.post("/boxes/{box_id}/reassign", response_model=BoxOut)
def reassign(
    box_id: str,
    data: ReassignRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    box = db.get(Box, box_id)
    if not box:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")

    new_owner: User | None = None
    if data.new_owner_id:
        new_owner = db.get(User, data.new_owner_id)
        if not new_owner:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "새 담당자를 찾을 수 없습니다")
        if not new_owner.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "비활성화된 사용자에게 할당할 수 없습니다")

    from app.models.user import User as UserModel
    old_owner = db.get(UserModel, box.owner_id) if box.owner_id else None
    old_name = old_owner.name if old_owner else "(없음)"
    new_name = new_owner.name if new_owner else "(없음)"

    box.owner_id = new_owner.id if new_owner else None

    db.add(
        AsyncLog(
            box_id=box.id,
            author_id=admin.id,
            content=f"[재지정] Owner: {old_name} → {new_name}. 사유: {data.reason.strip()}",
            log_type=LogType.system,
        )
    )
    notify_ids = [u for u in (box.owner_id, old_owner.id if old_owner else None) if u]
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.box_reassigned,
        subject_type=SubjectType.box,
        subject_id=box.id,
        summary=f"{admin.name}님이 박스 \"{box.title}\"의 담당자를 {old_name} → {new_name}로 재지정",
        meta={"reason": data.reason.strip(), "from": old_owner.id if old_owner else None, "to": box.owner_id},
        notify=notify_ids,
    )
    db.commit()
    db.refresh(box)
    return box


@router.delete("/boxes/{box_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_box(
    box_id: str,
    data: DeleteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    box = db.get(Box, box_id)
    if not box:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    title = box.title
    # 삭제 전 감사 로그 기록 (Activity는 FK cascade로 삭제되지 않음 — 독립)
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.box_deleted,
        subject_type=SubjectType.box,
        subject_id=box.id,
        summary=f"{admin.name}님이 박스 \"{title}\"를 삭제",
        meta={"reason": data.reason.strip(), "project_id": box.project_id},
        notify=[box.owner_id] if box.owner_id else None,
    )
    db.delete(box)
    db.commit()
