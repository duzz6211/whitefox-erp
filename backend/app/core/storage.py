"""파일 스토리지 — 개발: 로컬 파일시스템 / 프로덕션: Cloudflare R2 (S3 호환)."""
from __future__ import annotations

from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.config import Config as BotoConfig

from app.core.config import settings


# ── 공통 ──

def build_key(target_type: str, target_id: str, attachment_id: str, filename: str) -> str:
    return f"{target_type}/{target_id}/{attachment_id}/{filename}"


# ── R2 (프로덕션) ──

def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def _r2_upload(key: str, stream: BinaryIO, content_type: str = "application/octet-stream") -> int:
    client = _get_s3_client()
    client.upload_fileobj(stream, settings.r2_bucket, key, ExtraArgs={"ContentType": content_type})
    head = client.head_object(Bucket=settings.r2_bucket, Key=key)
    return head["ContentLength"]


def _r2_presigned_download(key: str, filename: str, expires: int = 3600) -> str:
    client = _get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.r2_bucket,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=expires,
    )


def _r2_delete(key: str) -> None:
    client = _get_s3_client()
    client.delete_object(Bucket=settings.r2_bucket, Key=key)


# ── 로컬 (개발) ──

STORAGE_ROOT = Path(__file__).resolve().parents[2] / "storage"
STORAGE_ROOT.mkdir(exist_ok=True)


def _local_save(key: str, stream: BinaryIO) -> int:
    path = STORAGE_ROOT / key
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as out:
        while chunk := stream.read(1024 * 1024):
            out.write(chunk)
    return path.stat().st_size


def _local_resolve(key: str) -> Path:
    path = (STORAGE_ROOT / key).resolve()
    if STORAGE_ROOT.resolve() not in path.parents and path != STORAGE_ROOT.resolve():
        raise ValueError("잘못된 경로")
    return path


def _local_delete(key: str) -> None:
    path = _local_resolve(key)
    if path.exists():
        path.unlink()


# ── 통합 인터페이스 ──

def save_file(key: str, stream: BinaryIO, content_type: str = "application/octet-stream") -> int:
    if settings.use_r2:
        return _r2_upload(key, stream, content_type)
    return _local_save(key, stream)


def get_download_url(key: str, filename: str) -> str | None:
    if settings.use_r2:
        return _r2_presigned_download(key, filename)
    return None


def resolve_local(key: str) -> Path:
    return _local_resolve(key)


def delete(key: str) -> None:
    if settings.use_r2:
        _r2_delete(key)
    else:
        _local_delete(key)
