# WHITEFOX ERP

2일 단위 박스(Atomic Box) 기반 비동기 협업 ERP 시스템.
Pull(이어받기) 모델로 업무를 추적하고, CRM/결제 관리까지 통합 제공합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | FastAPI · SQLAlchemy · Alembic · APScheduler |
| Frontend | React 19 · TypeScript · Tailwind CSS v4 · Vite |
| Database | SQLite (개발) · Supabase PostgreSQL (프로덕션) |
| Storage | 로컬 파일 (개발) · Cloudflare R2 (프로덕션) |
| Auth | JWT (python-jose + passlib) |

---

## 실행 방법

### 사전 요구사항

- Python 3.11+
- Node.js 20+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # 필요시 수정
uvicorn app.main:app --reload
```

- API 서버: http://localhost:8000
- API 문서: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- 개발 서버: http://localhost:5173
- `/api` 경로는 Vite 프록시를 통해 백엔드로 전달

### 시드 데이터

```bash
cd backend
python seed.py
```

### DB 마이그레이션

```bash
cd backend
alembic revision --autogenerate -m "설명"
alembic upgrade head
```

---

## 프로젝트 구조

```
├── backend/
│   ├── app/
│   │   ├── api/            # REST API 라우터
│   │   │   ├── auth.py         인증
│   │   │   ├── boxes.py        박스 CRUD + 상태 전이
│   │   │   ├── billing.py      결제 관리 (admin)
│   │   │   ├── briefs.py       기획서 + 버전
│   │   │   ├── crm.py          CRM (회사/딜/인보이스)
│   │   │   ├── dashboard.py    대시보드 집계
│   │   │   ├── files.py        파일 업로드/다운로드
│   │   │   └── ...
│   │   ├── core/           # 설정, DB, 보안, 스토리지
│   │   ├── engine/         # 상태 머신, 권한, 리스크 감지
│   │   ├── models/         # SQLAlchemy 모델
│   │   └── schemas/        # Pydantic 스키마
│   ├── alembic/            # DB 마이그레이션
│   ├── Dockerfile
│   ├── fly.toml
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios 클라이언트 + 엔드포인트
│   │   ├── components/     # UI 컴포넌트
│   │   ├── pages/          # 페이지
│   │   ├── lib/            # 유틸 (auth, users)
│   │   └── types/          # TypeScript 타입
│   ├── public/
│   └── vite.config.ts
│
└── CLAUDE.md               # 시스템 설계 명세
```

---

## 핵심 개념

### Box 상태 흐름

```
wait → working → pickup → working → ... → review → done
                    ↘                        ↗
                   blocked ──────────────────┘
```

| 상태 | 설명 |
|------|------|
| `wait` | 백로그 |
| `working` | 작업 중 |
| `pickup` | 이어받기 대기 |
| `blocked` | 외부 대기 |
| `review` | 검토 |
| `done` | 완료 |

### 주요 기능

- **플로우 보드** — 6개 상태 컬럼 칸반
- **대시보드** — 프로젝트별 진행률, 리소스 분배
- **리스크 뷰** — 24h+ blocked 박스 자동 감지
- **CRM** — 고객사, 딜 파이프라인, 인보이스
- **결제 관리** — 내부 결제 항목 및 월별 지출 추적 (admin)
- **활동 로그** — 전체 이력 타임라인

---

## 배포

| 영역 | 서비스 |
|------|--------|
| Frontend | Cloudflare Pages |
| Backend | Fly.io (도쿄) |
| Database | Supabase PostgreSQL |
| Storage | Cloudflare R2 |

### 환경 변수

**Backend (.env)**

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `ENVIRONMENT` | 실행 환경 | `development` |
| `DATABASE_URL` | DB 연결 문자열 | `sqlite:///./whitefox.db` |
| `SECRET_KEY` | JWT 시크릿 키 | (프로덕션에서 변경 필수) |
| `CORS_ORIGINS` | 허용 오리진 | `http://localhost:5173` |
| `R2_ACCOUNT_ID` | Cloudflare R2 계정 ID | - |
| `R2_ACCESS_KEY_ID` | R2 Access Key | - |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key | - |
| `R2_BUCKET` | R2 버킷 이름 | `whitefox-erp-files` |

**Frontend**

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `VITE_API_URL` | 백엔드 API URL | `/api` (Vite 프록시) |

---

## 라이선스

Internal use only. DUZZ TEAM.
