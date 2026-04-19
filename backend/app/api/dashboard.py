from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.box import Box, FlowStatus
from app.models.project import Project, ProjectStatus
from app.models.user import User
from app.schemas.dashboard import (
    DashboardResponse,
    OwnerWorkload,
    ProjectProgress,
    StatusCounts,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    projects = (
        db.query(Project)
        .filter(Project.status == ProjectStatus.active)
        .order_by(Project.priority.desc())
        .all()
    )

    # project → {status: count}
    rows = (
        db.query(Box.project_id, Box.flow_status, func.count(Box.id))
        .group_by(Box.project_id, Box.flow_status)
        .all()
    )
    by_project: dict[str, dict[FlowStatus, int]] = {}
    for pid, s, n in rows:
        by_project.setdefault(pid, {})[s] = n

    risk_rows = (
        db.query(Box.project_id, func.count(Box.id))
        .filter(Box.risk_flag.is_(True))
        .group_by(Box.project_id)
        .all()
    )
    risk_by_project = {pid: n for pid, n in risk_rows}

    project_progress: list[ProjectProgress] = []
    for p in projects:
        counts_map = by_project.get(p.id, {})
        counts = StatusCounts(**{s.value: counts_map.get(s, 0) for s in FlowStatus})
        total = sum(counts.model_dump().values())
        done_ratio = counts.done / total if total else 0.0
        project_progress.append(
            ProjectProgress(
                project_id=p.id,
                project_name=p.name,
                priority=p.priority,
                counts=counts,
                total=total,
                done_ratio=done_ratio,
                risk_count=risk_by_project.get(p.id, 0),
            )
        )

    # owner 워크로드: working/pickup/blocked 상태 박스 카운트
    owner_rows = (
        db.query(Box.owner_id, Box.flow_status, func.count(Box.id))
        .filter(
            Box.owner_id.is_not(None),
            Box.flow_status.in_([FlowStatus.working, FlowStatus.pickup, FlowStatus.blocked]),
        )
        .group_by(Box.owner_id, Box.flow_status)
        .all()
    )
    by_owner: dict[str, dict[FlowStatus, int]] = {}
    for oid, s, n in owner_rows:
        by_owner.setdefault(oid, {})[s] = n

    owners: list[OwnerWorkload] = []
    if by_owner:
        users = db.query(User).filter(User.id.in_(by_owner.keys())).all()
        name_map = {u.id: u.name for u in users}
        for oid, counts_map in by_owner.items():
            owners.append(
                OwnerWorkload(
                    owner_id=oid,
                    owner_name=name_map.get(oid, "?"),
                    working=counts_map.get(FlowStatus.working, 0),
                    pickup=counts_map.get(FlowStatus.pickup, 0),
                    blocked=counts_map.get(FlowStatus.blocked, 0),
                )
            )
        owners.sort(key=lambda o: o.working + o.pickup + o.blocked, reverse=True)

    return DashboardResponse(projects=project_progress, owners=owners)
