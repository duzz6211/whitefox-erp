from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_admin
from app.models.project import Project, ProjectStatus
from app.models.user import User
from app.models.activity import ActivityType, SubjectType
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.engine.activity import record_activity


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(
    status_: ProjectStatus | None = Query(default=None, alias="status"),
    include_all: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Project)
    if status_:
        query = query.filter(Project.status == status_)
    elif not include_all:
        query = query.filter(Project.status == ProjectStatus.active)
    return query.order_by(Project.priority.desc(), Project.created_at.desc()).all()


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    project = Project(**data.model_dump())
    db.add(project)
    db.flush()
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.project_created,
        subject_type=SubjectType.project,
        subject_id=project.id,
        summary=f"{admin.name}님이 프로젝트 \"{project.name}\"를 생성",
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "프로젝트를 찾을 수 없습니다")
    return project


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "프로젝트를 찾을 수 없습니다")
    old_status = project.status
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(project, k, v)
    db.flush()
    new_status = project.status
    if "status" in payload and new_status != old_status:
        if new_status == ProjectStatus.completed:
            record_activity(
                db,
                actor_id=admin.id,
                type=ActivityType.project_completed,
                subject_type=SubjectType.project,
                subject_id=project.id,
                summary=f"{admin.name}님이 프로젝트 \"{project.name}\"를 완료 처리",
            )
        elif new_status == ProjectStatus.archived:
            record_activity(
                db,
                actor_id=admin.id,
                type=ActivityType.project_archived,
                subject_type=SubjectType.project,
                subject_id=project.id,
                summary=f"{admin.name}님이 프로젝트 \"{project.name}\"를 아카이브",
            )
    db.commit()
    db.refresh(project)
    return project
