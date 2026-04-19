from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.core.scheduler import lifespan
from app.api import (
    auth, users, projects, boxes, logs, context_cards, briefs, pickups,
    files, dashboard, crm, admin, activity, search, organization, billing,
)

if not settings.is_production:
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="WHITEFOX ERP", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(boxes.router)
app.include_router(logs.router)
app.include_router(context_cards.router)
app.include_router(briefs.router)
app.include_router(pickups.router)
app.include_router(files.router)
app.include_router(dashboard.router)
app.include_router(crm.companies_router)
app.include_router(crm.contacts_router)
app.include_router(crm.deals_router)
app.include_router(crm.invoices_router)
app.include_router(admin.router)
app.include_router(activity.router)
app.include_router(search.router)
app.include_router(organization.router)
app.include_router(billing.router)


@app.get("/health")
def health():
    return {"status": "ok"}
