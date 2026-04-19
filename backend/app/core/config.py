import os
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict


DEV_SECRET = "dev-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./whitefox.db"
    secret_key: str = DEV_SECRET
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"  # development | production

    # Cloudflare R2 (S3 호환)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "whitefox-erp-files"
    r2_public_url: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def use_r2(self) -> bool:
        return bool(self.r2_account_id and self.r2_access_key_id)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()


# 프로덕션 환경에서는 dev 기본값 SECRET_KEY 차단
if settings.environment == "production" and settings.secret_key == DEV_SECRET:
    sys.stderr.write(
        "\n[BOOT FAILED] SECRET_KEY가 dev 기본값으로 설정되어 있습니다.\n"
        "프로덕션 환경(.env의 ENVIRONMENT=production)에서는 SECRET_KEY를 반드시 변경해야 합니다.\n"
        "예: openssl rand -hex 32\n\n"
    )
    os._exit(1)
