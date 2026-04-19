from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.box import Box
from app.models.context_card import ContextCard
from app.models.user import User
from app.schemas.context_card import ContextCardOut, ContextCardUpsert


router = APIRouter(tags=["context"])


@router.get("/boxes/{box_id}/context", response_model=ContextCardOut)
def get_context(
    box_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    if not db.get(Box, box_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    card = db.query(ContextCard).filter(ContextCard.box_id == box_id).first()
    if not card:
        card = ContextCard(box_id=box_id)
        db.add(card)
        db.commit()
        db.refresh(card)
    return card


@router.put("/boxes/{box_id}/context", response_model=ContextCardOut)
def upsert_context(
    box_id: str,
    data: ContextCardUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    box = db.get(Box, box_id)
    if not box:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")

    # 섹션 4.2 권한 매트릭스: Context Card 수정은 owner 또는 admin
    if box.owner_id != user.id and not user.is_admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Context Card는 owner 또는 admin만 수정할 수 있습니다"
        )

    card = db.query(ContextCard).filter(ContextCard.box_id == box_id).first()
    if not card:
        card = ContextCard(box_id=box_id, **data.model_dump())
        db.add(card)
    else:
        for k, v in data.model_dump().items():
            setattr(card, k, v)
    db.commit()
    db.refresh(card)
    return card
