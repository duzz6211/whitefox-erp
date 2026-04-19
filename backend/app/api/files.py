from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.storage import build_key, save_file, get_download_url, resolve_local, delete as storage_delete
from app.deps import get_current_user
from app.models.attachment import Attachment, AttachmentStatus, AttachmentTarget
from app.models.box import Box
from app.models.brief import ProjectBrief
from app.models.user import User
from app.schemas.attachment import AttachmentOut


router = APIRouter(prefix="/files", tags=["files"])


MAX_SIZE = 50 * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "text/markdown",
    "application/octet-stream",  # .fig 등
}


def _verify_target_exists(db: Session, target_type: AttachmentTarget, target_id: str):
    if target_type == AttachmentTarget.box:
        if not db.get(Box, target_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "박스를 찾을 수 없습니다")
    elif target_type == AttachmentTarget.brief:
        if not db.get(ProjectBrief, target_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "브리프를 찾을 수 없습니다")


@router.post("", response_model=AttachmentOut, status_code=status.HTTP_201_CREATED)
async def upload(
    target_type: AttachmentTarget = Form(...),
    target_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _verify_target_exists(db, target_type, target_id)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"허용되지 않는 파일 형식: {file.content_type}"
        )

    attachment = Attachment(
        target_type=target_type,
        target_id=target_id,
        file_name=file.filename or "unnamed",
        file_url="",
        file_type=file.content_type or "application/octet-stream",
        file_size=0,
        status=AttachmentStatus.pending,
        uploaded_by=user.id,
    )
    db.add(attachment)
    db.flush()

    key = build_key(target_type.value, target_id, attachment.id, attachment.file_name)
    try:
        size = save_file(key, file.file, attachment.file_type)
    except Exception:
        db.rollback()
        try:
            storage_delete(key)
        except Exception:
            pass
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "파일 저장에 실패했습니다")

    if size > MAX_SIZE:
        storage_delete(key)
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "파일 크기 초과 (최대 50MB)")

    attachment.file_url = key
    attachment.file_size = size
    attachment.status = AttachmentStatus.confirmed
    attachment.confirmed_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        storage_delete(key)
        raise
    db.refresh(attachment)
    return attachment


@router.get("", response_model=list[AttachmentOut])
def list_files(
    target_type: AttachmentTarget,
    target_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Attachment)
        .filter(
            Attachment.target_type == target_type,
            Attachment.target_id == target_id,
            Attachment.status != AttachmentStatus.deleted,
        )
        .order_by(Attachment.created_at.desc())
        .all()
    )


@router.get("/{attachment_id}/download")
def download(
    attachment_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    att = db.get(Attachment, attachment_id)
    if not att or att.status == AttachmentStatus.deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "파일을 찾을 수 없습니다")

    url = get_download_url(att.file_url, att.file_name)
    if url:
        return RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    path = resolve_local(att.file_url)
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "파일이 스토리지에 없습니다")
    return FileResponse(path, filename=att.file_name, media_type=att.file_type)


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    attachment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "파일을 찾을 수 없습니다")
    if att.uploaded_by != user.id and not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "업로더 또는 admin만 삭제할 수 있습니다")
    att.status = AttachmentStatus.deleted
    db.commit()
