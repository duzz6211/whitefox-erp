from pydantic import BaseModel


class StatusCounts(BaseModel):
    wait: int = 0
    working: int = 0
    pickup: int = 0
    blocked: int = 0
    review: int = 0
    done: int = 0


class ProjectProgress(BaseModel):
    project_id: str
    project_name: str
    priority: int
    counts: StatusCounts
    total: int
    done_ratio: float
    risk_count: int


class OwnerWorkload(BaseModel):
    owner_id: str
    owner_name: str
    working: int
    pickup: int
    blocked: int


class DashboardResponse(BaseModel):
    projects: list[ProjectProgress]
    owners: list[OwnerWorkload]
