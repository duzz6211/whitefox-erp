from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_admin
from app.models.organization import OrganizationInfo
from app.models.user import User
from app.schemas.organization import OrganizationInfoOut, OrganizationInfoUpdate


router = APIRouter(prefix="/organization", tags=["organization"])


def _get_or_create(db: Session) -> OrganizationInfo:
    # 싱글톤: 가장 먼저 생성된 row를 사용하고 나머지는 무시
    SINGLETON_ID = "singleton"
    info = db.get(OrganizationInfo, SINGLETON_ID)
    if info:
        return info
    # 기존 데이터(UUID 기반)가 있으면 그것을 사용 — 시드/마이그레이션 호환
    existing = db.query(OrganizationInfo).order_by(OrganizationInfo.updated_at).first()
    if existing:
        return existing
    # 없으면 고정 ID로 생성 (경합 시 두 번째 호출은 get으로 되돌아감)
    info = OrganizationInfo(id=SINGLETON_ID, business_name="WHITEFOX")
    db.add(info)
    try:
        db.commit()
    except Exception:
        db.rollback()
        info = db.get(OrganizationInfo, SINGLETON_ID) or db.query(OrganizationInfo).first()
        if not info:
            raise
        return info
    db.refresh(info)
    return info


@router.get("", response_model=OrganizationInfoOut)
def get_organization(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return _get_or_create(db)


@router.put("", response_model=OrganizationInfoOut)
def update_organization(
    data: OrganizationInfoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    info = _get_or_create(db)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(info, k, v)
    db.commit()
    db.refresh(info)
    return info
