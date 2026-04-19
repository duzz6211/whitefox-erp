import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_admin
from app.models.brief import ProjectBrief, BriefVersion
from app.models.project import Project
from app.models.user import User
from app.models.activity import ActivityType, SubjectType
from app.schemas.brief import BriefOut, BriefUpdate, BriefVersionOut
from app.engine.activity import record_activity


router = APIRouter(prefix="/projects/{project_id}/brief", tags=["brief"])


def _get_or_create_brief(db: Session, project_id: str) -> ProjectBrief:
    brief = db.query(ProjectBrief).filter(ProjectBrief.project_id == project_id).first()
    if not brief:
        brief = ProjectBrief(project_id=project_id)
        db.add(brief)
        db.commit()
        db.refresh(brief)
    return brief


@router.get("", response_model=BriefOut)
def get_brief(
    project_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if not db.get(Project, project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "프로젝트를 찾을 수 없습니다")
    return _get_or_create_brief(db, project_id)


@router.put("", response_model=BriefOut)
def update_brief(
    project_id: str,
    data: BriefUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not db.get(Project, project_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "프로젝트를 찾을 수 없습니다")
    brief = _get_or_create_brief(db, project_id)

    # 현재 상태를 스냅샷으로 저장 (수정 전 상태)
    snapshot = {
        "requirements": brief.requirements,
        "client_info": brief.client_info,
        "version_number": brief.current_version,
    }
    db.add(
        BriefVersion(
            brief_id=brief.id,
            version_number=brief.current_version,
            snapshot_json=json.dumps(snapshot, ensure_ascii=False),
            change_reason=data.change_reason,
            created_by=admin.id,
        )
    )

    brief.requirements = data.requirements
    brief.client_info = data.client_info
    brief.current_version += 1
    project = db.get(Project, project_id)
    record_activity(
        db,
        actor_id=admin.id,
        type=ActivityType.brief_updated,
        subject_type=SubjectType.project,
        subject_id=project_id,
        summary=f"{admin.name}님이 \"{project.name if project else project_id}\" 기획서를 v{brief.current_version}로 수정",
        meta={"change_reason": data.change_reason, "version": brief.current_version},
    )
    db.commit()
    db.refresh(brief)
    return brief


@router.get("/versions", response_model=list[BriefVersionOut])
def list_versions(
    project_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    brief = db.query(ProjectBrief).filter(ProjectBrief.project_id == project_id).first()
    if not brief:
        return []
    return (
        db.query(BriefVersion)
        .filter(BriefVersion.brief_id == brief.id)
        .order_by(BriefVersion.version_number.desc())
        .all()
    )


@router.get("/versions/{version_number}", response_model=BriefVersionOut)
def get_version(
    project_id: str,
    version_number: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    brief = db.query(ProjectBrief).filter(ProjectBrief.project_id == project_id).first()
    if not brief:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "브리프가 없습니다")
    version = (
        db.query(BriefVersion)
        .filter(
            BriefVersion.brief_id == brief.id,
            BriefVersion.version_number == version_number,
        )
        .first()
    )
    if not version:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "해당 버전을 찾을 수 없습니다")
    return version
