"""개발용 시드 데이터 — 4인 스타트업 (대표 1 + 개발 2 + 디자인 1) + CRM 샘플."""
from datetime import date, datetime, timedelta, timezone

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.project import Project, ProjectCategory
from app.models.box import Box, FlowStatus
from app.models.crm import Company, CompanyStatus, Contact, Deal, DealStage, Invoice, InvoiceStatus
from app.models.organization import OrganizationInfo


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).first():
            print("이미 데이터가 있습니다. 중단.")
            return

        # === 멤버 ===
        ceo = User(
            name="북극여우",
            email="ceo@arcticfox.kr",
            password_hash=hash_password("admin1234"),
            role=UserRole.admin,
            job_title="대표",
        )
        dev_a = User(
            name="앨리스",
            email="alice@arcticfox.kr",
            password_hash=hash_password("alice1234"),
            role=UserRole.member,
            job_title="개발자",
        )
        dev_b = User(
            name="밥",
            email="bob@arcticfox.kr",
            password_hash=hash_password("bob1234"),
            role=UserRole.member,
            job_title="개발자",
        )
        designer = User(
            name="이브",
            email="eve@arcticfox.kr",
            password_hash=hash_password("eve12345"),
            role=UserRole.member,
            job_title="디자이너",
        )
        db.add_all([ceo, dev_a, dev_b, designer])
        db.flush()

        # === 자사 정보 ===
        db.add(OrganizationInfo(
            business_name="WHITEFOX 주식회사",
            representative_name="북극여우",
            business_number="123-45-67890",
            corporate_number="110111-1234567",
            business_type="서비스업",
            business_item="소프트웨어 개발, 디자인",
            address="서울특별시 강남구 테헤란로 123, 북극빌딩 4층",
            phone="02-1234-5678",
            email="hello@arcticfox.kr",
            website="https://arcticfox.kr",
            established_date=date(2024, 3, 15),
            notes="4인 스타트업. 자체 ERP로 업무·고객·재무 통합 관리.",
        ))

        # === 고객사 ===
        client_co = Company(
            name="주식회사 푸른숲",
            domain="pureunsoop.co.kr",
            industry="교육",
            notes="2025년 12월 첫 미팅. 내부 LMS 개편 의뢰.",
        )
        prospect_co = Company(
            name="해바라기 의료재단",
            domain="sunflower-med.org",
            industry="의료",
            notes="병원 환자 포털 리뉴얼 검토 중.",
        )
        db.add_all([client_co, prospect_co])
        db.flush()

        db.add_all([
            Contact(
                company_id=client_co.id,
                name="김수연",
                title="교육사업부 팀장",
                email="sy.kim@pureunsoop.co.kr",
                phone="010-1111-2222",
            ),
            Contact(
                company_id=prospect_co.id,
                name="박정호",
                title="IT팀장",
                email="jh.park@sunflower-med.org",
            ),
        ])

        # === 딜 파이프라인 ===
        deal_client = Deal(
            company_id=client_co.id,
            title="푸른숲 LMS 개편",
            amount=35_000_000,
            stage=DealStage.won,
            expected_close_date=date.today() - timedelta(days=10),
            owner_id=ceo.id,
            notes="계약 완료. 킥오프 예정",
        )
        deal_prospect = Deal(
            company_id=prospect_co.id,
            title="해바라기 환자 포털 리뉴얼",
            amount=50_000_000,
            stage=DealStage.proposal,
            expected_close_date=date.today() + timedelta(days=30),
            owner_id=ceo.id,
            notes="제안서 발송 완료",
        )
        db.add_all([deal_client, deal_prospect])
        db.flush()

        # === 인보이스 샘플 ===
        db.add_all([
            Invoice(
                company_id=client_co.id,
                deal_id=deal_client.id,
                invoice_number="INV-2026-0001",
                title="푸른숲 LMS 개편 1차 선금",
                amount=17_500_000,
                status=InvoiceStatus.paid,
                issued_date=date.today() - timedelta(days=15),
                due_date=date.today() - timedelta(days=1),
                paid_date=date.today() - timedelta(days=3),
                created_by=ceo.id,
                notes="계약금 50%",
            ),
            Invoice(
                company_id=client_co.id,
                deal_id=deal_client.id,
                invoice_number="INV-2026-0002",
                title="푸른숲 LMS 개편 잔금",
                amount=17_500_000,
                status=InvoiceStatus.sent,
                issued_date=date.today() - timedelta(days=2),
                due_date=date.today() + timedelta(days=28),
                created_by=ceo.id,
            ),
        ])

        # === 프로젝트 — 범용화 예시 (Work 모듈이 개발/마케팅/디자인 모두 소화) ===
        p_internal = Project(
            name="또랑 ERP 이식",
            priority=9,
            category=ProjectCategory.internal_ops,
        )
        p_client = Project(
            name="푸른숲 LMS 개편",
            priority=10,
            category=ProjectCategory.client_work,
            company_id=client_co.id,
        )
        p_marketing = Project(
            name="4월 인스타 캠페인",
            priority=6,
            category=ProjectCategory.marketing,
        )
        db.add_all([p_internal, p_client, p_marketing])
        db.flush()

        # === 박스 샘플 (마감일 일부 포함) ===
        today = date.today()
        db.add_all([
            Box(project_id=p_internal.id, title="DB 스키마 마이그레이션", flow_status=FlowStatus.wait),
            Box(
                project_id=p_internal.id,
                title="인증 API 구현",
                flow_status=FlowStatus.working,
                owner_id=dev_a.id,
                deadline=today + timedelta(days=2),
            ),
            Box(
                project_id=p_internal.id,
                title="Flow Board 칸반 UI",
                flow_status=FlowStatus.pickup,
                owner_id=dev_b.id,
                deadline=today + timedelta(days=5),
            ),
            Box(
                project_id=p_client.id,
                title="LMS 학습 기록 데이터 모델",
                flow_status=FlowStatus.working,
                owner_id=dev_a.id,
                deadline=today - timedelta(days=1),  # 지난 마감
            ),
            Box(
                project_id=p_client.id,
                title="대시보드 와이어프레임",
                flow_status=FlowStatus.working,
                owner_id=designer.id,
                deadline=today,  # 오늘 마감
            ),
            Box(
                project_id=p_marketing.id,
                title="4월 1주차 릴스 스크립트",
                flow_status=FlowStatus.working,
                owner_id=designer.id,
                deadline=today + timedelta(days=3),
            ),
            Box(project_id=p_marketing.id, title="브랜드 키 메시지 정리", flow_status=FlowStatus.wait),
            # 리스크 탐지 테스트용: 25시간 전에 blocked 처리됨
            Box(
                project_id=p_client.id,
                title="푸른숲 클라이언트 피드백 대기",
                flow_status=FlowStatus.blocked,
                owner_id=dev_b.id,
                status_changed_at=datetime.now(timezone.utc) - timedelta(hours=25),
            ),
        ])
        db.commit()

        print("시드 완료.")
        print("  대표 (admin): ceo@arcticfox.kr / admin1234")
        print("  개발자 앨리스: alice@arcticfox.kr / alice1234")
        print("  개발자 밥: bob@arcticfox.kr / bob1234")
        print("  디자이너 이브: eve@arcticfox.kr / eve12345")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
