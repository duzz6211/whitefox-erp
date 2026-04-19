"""백그라운드 스케줄러 — APScheduler 기반."""
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from app.engine.risk import run_risk_check_job


logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    _scheduler = BackgroundScheduler(timezone="Asia/Seoul")
    _scheduler.add_job(run_risk_check_job, "interval", hours=1, id="risk_check", next_run_time=None)
    _scheduler.start()
    logger.info("scheduler started (risk_check every hour)")
    # 시작 직후 한 번 실행
    try:
        run_risk_check_job()
    except Exception:
        logger.exception("initial risk check failed")
    yield
    _scheduler.shutdown(wait=False)
    logger.info("scheduler stopped")
