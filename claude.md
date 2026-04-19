# 또랑(Ddorang) ERP 시스템 설계 문서

> 작성일: 2026.04.12
> 팀: 북극여우
> 목적: 또랑 시스템을 자체 ERP에 이식하기 위한 시스템 설계 명세

---

## 1. 시스템 개요

또랑은 업무를 **2일 단위의 원자적 박스(Atomic Box)**로 쪼개어, **Pull(이어받기) 모델** 기반으로 비동기 협업을 실현하는 업무 엔진이다.

### 핵심 원칙

1. **로그 없이는 아무것도 안 된다**: 모든 상태 전이, 기획서 수정, owner 재지정에 사유 기록이 강제된다.
2. **상태는 owner만, 열람은 모두에게**: 작업중 박스의 상태 변경은 owner만 가능하지만, 내용 열람과 코멘트는 팀 전원에게 열려 있다.
3. **같은 데이터, 다른 렌즈**: 4개 뷰(Dashboard, Flow Board, Risk View, Pickup Log)는 동일한 Box 데이터를 다른 각도로 쿼리한 결과다.

### 아키텍처 4개 층

| Layer | 역할 | 구성 요소 |
|-------|------|----------|
| Client | 웹 UI | Dashboard, Flow Board, Risk View, Pickup Log |
| API | RESTful 엔드포인트 | /projects, /boxes, /logs, /briefs, /files |
| Engine | 비즈니스 로직 강제 | State Machine, Permission Guard, Risk Detector, Notifier |
| Database | 데이터 영속화 | PostgreSQL, S3 (파일), Redis (캐시) |

---

## 2. 데이터 모델

### 2.1 Project

```
PROJECT
├── id: UUID (PK)
├── name: VARCHAR(200)
├── priority: INT (1~10)
├── category: ENUM
├── status: ENUM (active | archived)
└── created_at: TIMESTAMP
```

### 2.2 Project Brief (기획서/요구조건)

Project와 1:1 관계. 수정 시 자동으로 BRIEF_VERSION에 스냅샷이 생성된다.

```
PROJECT_BRIEF
├── id: UUID (PK)
├── project_id: UUID (FK → PROJECT)
├── requirements: TEXT
├── client_info: TEXT
└── current_version: INT

BRIEF_VERSION
├── id: UUID (PK)
├── brief_id: UUID (FK → PROJECT_BRIEF)
├── version_number: INT
├── snapshot_json: TEXT (수정 시점의 전체 스냅샷)
├── change_reason: VARCHAR(500) (필수)
└── created_at: TIMESTAMP

ATTACHMENT
├── id: UUID (PK)
├── target_type: ENUM (brief | box | log)
├── target_id: UUID
├── file_name: VARCHAR(500)
├── file_url: VARCHAR(1000) (S3 key)
├── file_type: VARCHAR(100)
├── file_size: BIGINT
├── status: ENUM (pending | confirmed | deleted)
├── uploaded_by: UUID (FK → USER)
└── confirmed_at: TIMESTAMP
```

### 2.3 Box (핵심 엔티티)

```
BOX
├── id: UUID (PK)
├── project_id: UUID (FK → PROJECT)
├── owner_id: UUID (FK → USER, nullable)
├── title: VARCHAR(300)
├── flow_status: ENUM (wait | working | pickup | blocked | review | done)
├── deadline: DATE
├── risk_flag: BOOLEAN (default false)
├── week_number: INT
└── created_at: TIMESTAMP
```

### 2.4 Context Card

Box와 1:1 관계. 박스의 존재 이유와 성공 기준을 담는다.

```
CONTEXT_CARD
├── id: UUID (PK)
├── box_id: UUID (FK → BOX, UNIQUE)
├── why: TEXT (이 작업을 왜 하는가)
├── success_criteria: TEXT (뭘 해야 완료인가)
├── decision_history: TEXT (의사결정 배경)
└── updated_at: TIMESTAMP
```

### 2.5 Async Log

Box에 귀속되는 작업 기록. **append-only** — 수정/삭제 불가.

```
ASYNC_LOG
├── id: UUID (PK)
├── box_id: UUID (FK → BOX)
├── author_id: UUID (FK → USER)
├── content: TEXT (최소 10자)
├── log_type: ENUM (work | comment | system)
└── created_at: TIMESTAMP
```

### 2.6 Pickup Record

이어받기 이력. 누가 끝내고 누가 가져갔는지 추적.

```
PICKUP_RECORD
├── id: UUID (PK)
├── box_id: UUID (FK → BOX)
├── completed_by: UUID (FK → USER)
├── picked_by: UUID (FK → USER)
├── note: TEXT
└── created_at: TIMESTAMP
```

### 2.7 User

```
USER
├── id: UUID (PK)
├── name: VARCHAR(100)
├── email: VARCHAR(200, UNIQUE)
├── role: ENUM (admin | member)
└── created_at: TIMESTAMP
```

### 엔티티 관계 요약

```
USER 1──N PROJECT (manages)
PROJECT 1──1 PROJECT_BRIEF (has)
PROJECT 1──N BOX (contains)
PROJECT_BRIEF 1──N BRIEF_VERSION (versions)
PROJECT_BRIEF 1──N ATTACHMENT (attaches)
BOX 1──1 CONTEXT_CARD (has)
BOX 1──N ASYNC_LOG (records)
BOX 1──N PICKUP_RECORD (tracks)
```

---

## 3. 상태 머신 (State Machine)

### 3.1 상태 정의

| 상태 | 코드 | 설명 |
|------|------|------|
| 대기 | `wait` | 백로그. 아직 누구도 작업을 시작하지 않음 |
| 작업중 | `working` | owner가 현재 작업 중 |
| 픽업 대기 | `pickup` | 내 단계 완료. 다음 사람이 가져갈 차례 |
| 외부 대기 | `blocked` | 외부 요인(클라이언트 회신 등)으로 중단 |
| 검토 | `review` | 결과물 검수 단계 |
| 완료 | `done` | 종료. 더 이상 전이 불가 |

### 3.2 전이 규칙

```
TRANSITIONS = {
    "wait":    ["working"],
    "working": ["pickup", "blocked"],
    "pickup":  ["working"],
    "blocked": ["review"],
    "review":  ["done", "working"],
    "done":    []  # 종착점
}
```

### 3.3 전이별 상세 조건

| From → To | 실행 권한 | 선행 조건 | 부수 효과 |
|-----------|----------|----------|----------|
| wait → working | Any member | Box에 현재 owner가 없거나 admin 지정 | owner_id = 요청자, 자동 로그 생성 |
| working → pickup | Owner only | 로그 메시지 필수 (최소 10자) | 팀 전체에 픽업 알림, timestamp 기록 |
| working → blocked | Owner only | 차단 사유 필수 | 리스크 타이머 시작 (24h), admin에 알림 |
| pickup → working | Any member (이전 owner 제외) | 픽업 노트 필수 | owner_id = 새 담당자, pickup_record 생성 |
| blocked → review | Owner 또는 Admin | 해결 기록 필수 | 리스크 타이머 해제, 자동 로그 생성 |
| review → done | Admin only | 승인 기록 | 박스 아카이브, 최종 로그 생성 |
| review → working | Admin only | 반려 사유 필수 | owner 재지정, 수정 로그 생성 |

### 3.4 전이 API 의사코드

```python
def transition_box(box_id, user, to_status, log_message):
    box = get_box(box_id)

    # 1. State Machine: 이 전이가 가능한가?
    if to_status not in TRANSITIONS[box.flow_status]:
        raise 400("허용되지 않는 전이")

    # 2. Permission Guard: 이 사람이 할 수 있는가?
    rule = PERMISSION_RULES[f"{box.flow_status}→{to_status}"]
    if not rule.check(user, box):
        raise 403("권한 없음")

    # 3. Log 강제: 기록이 있는가?
    if not log_message or len(log_message) < 10:
        raise 400("로그 메시지 필수 (최소 10자)")

    # 4. 전이 실행
    old_status = box.flow_status
    box.flow_status = to_status
    create_async_log(box, user, log_message)

    # 5. 부수 효과
    if to_status == "pickup":
        create_pickup_notification(box)
    elif to_status == "blocked":
        start_risk_timer(box, hours=24)
    elif to_status == "done":
        archive_box(box)

    return box
```

---

## 4. 권한 모델 (Permission Guard)

### 4.1 역할 정의

| 역할 | 설명 |
|------|------|
| Admin | 대표. 전체 프로젝트 관리, 검수 승인, 비상 시 owner 재지정 |
| Member | 개발자. 자기 박스의 상태 전이, 모든 박스 열람/코멘트 |

### 4.2 권한 매트릭스 (Box가 Working 상태일 때)

| 동작 | Owner | Member | Admin |
|------|-------|--------|-------|
| Box 열람 (내용 보기) | O | O | O |
| 로그/코멘트 남기기 | O | O | O |
| 상태 전이 | O | X | X |
| Owner 재지정 | X | X | 비상시만 (사유 필수) |
| Context Card 수정 | O | X | O |
| 박스 삭제 | X | X | 비상시만 (사유 필수) |

### 4.3 Owner 재지정 (비상 조치)

```python
def reassign_owner(box, admin, new_owner, reason):
    if not admin.is_admin:
        raise 403("관리자만 재지정할 수 있습니다")
    if not reason or len(reason) < 10:
        raise 400("사유 필수 (최소 10자)")

    box.add_log(admin, f"Owner 재지정: {box.owner} → {new_owner}. 사유: {reason}")
    notify(box.owner, "박스가 재지정되었습니다")
    box.owner = new_owner
```

---

## 5. API 설계

### 5.1 Project API

```
GET    /projects                         # 전체 목록 (priority 순)
POST   /projects                         # 프로젝트 생성
GET    /projects/:id                     # 상세 (brief 포함)
PUT    /projects/:id                     # 수정
```

### 5.2 Brief API

```
GET    /projects/:id/brief               # 기획서 열람
PUT    /projects/:id/brief               # 기획서 수정 → 자동 version 생성
GET    /projects/:id/brief/versions      # 변경 이력
GET    /projects/:id/brief/versions/:ver # 특정 버전 스냅샷
```

### 5.3 Box API

```
GET    /boxes?status=pickup&owner=me     # 필터링 (View Layer 호출)
POST   /projects/:id/boxes              # 박스 생성 (context card 동시 생성)
GET    /boxes/:id                        # 상세 (context + logs + pickups)
PATCH  /boxes/:id                        # 메타 수정 (title, deadline 등)
PATCH  /boxes/:id/transition             # ★ 상태 전이 (핵심 API)
```

상태 전이 Request:
```json
{
  "to": "pickup",
  "log_message": "API 연동 완료. 응답 포맷은 context card 참조",
  "attachments": []
}
```

### 5.4 Log API

```
GET    /boxes/:id/logs                   # 박스의 전체 로그 (시간순)
POST   /boxes/:id/logs                   # 코멘트 추가 (상태 전이 없이)
```

### 5.5 File API

Presigned URL 방식으로 클라이언트가 S3에 직접 업로드.

```
POST   /files/presign                    # 업로드 URL 발급
POST   /files/:id/confirm               # 업로드 완료 확인
GET    /files?target_type=brief&target_id=xxx  # 파일 목록
GET    /files/:id/download              # 다운로드 URL 발급
DELETE /files/:id                        # 파일 삭제 (soft delete)
```

Upload Flow:
1. Client → `POST /files/presign` → Server가 presigned URL + file_id 반환
2. Client → S3에 직접 PUT (presigned URL 사용)
3. Client → `POST /files/:id/confirm` → Server가 S3 존재 확인 후 status를 confirmed로 변경

제약 사항:
- 허용 파일 형식: PDF, PNG, JPEG, WebP, Figma, TXT, Markdown
- 최대 파일 크기: 50MB
- presigned URL 유효 시간: 10분
- 다운로드 URL 유효 시간: 1시간
- pending 상태 파일은 1시간 후 자동 정리 (cron)

S3 키 구조:
```
{target_type}/{target_id}/{uuid}/{원본_파일명}
예: brief/abc-123/def-456/병원프로젝트_요구사항_v2.pdf
```

---

## 6. View Layer (4개 렌즈)

### 6.1 Dashboard

전체 프로젝트 진행률, 리소스 분배, owner별 박스 수.

```
GET /boxes?group_by=project&aggregate=status_count
```

### 6.2 Flow Board (칸반)

6개 상태 컬럼에 박스 카드를 배치. 드래그 시 transition API 호출.

```
GET /boxes?project_id=xxx&sort=status
```

### 6.3 Risk View

Blocked 상태가 24h+ 된 박스를 자동 하이라이트.

```
GET /boxes?status=blocked&blocked_over=24h
```

### 6.4 Pickup Log

박스별 이어받기 이력 타임라인.

```
GET /boxes/:id/pickups?sort=created_at
```

---

## 7. Engine Layer

### 7.1 State Machine

상태 전이 규칙을 코드로 강제. 섹션 3 참조.

### 7.2 Permission Guard

역할 기반 권한 검증. 섹션 4 참조.

### 7.3 Risk Detector

- Blocked 상태 진입 시 타이머 시작 (24h)
- 24h 초과 시 box.risk_flag = true, admin에 알림
- cron job 또는 이벤트 기반 구현

```python
# 매 시간 실행되는 cron job
def check_risk_boxes():
    blocked_boxes = Box.filter(
        flow_status="blocked",
        risk_flag=False,
        status_changed_at__lt=now() - timedelta(hours=24)
    )
    for box in blocked_boxes:
        box.risk_flag = True
        notify_admin(f"[리스크] '{box.title}' 박스가 24시간 이상 외부 대기 중")
```

### 7.4 Notifier

- 픽업 대기 발생 시 → 팀 전체 알림
- 리스크 감지 시 → admin 알림
- 매일 아침 digest → 각 팀원에게 "내 픽업 대기 N건" 요약

---

## 8. 구현 로드맵

### Phase 1: MVP — Core Loop (2~3주)

- User, Project, Box CRUD
- State Machine + transition API
- Async Log (append-only)
- Permission Guard (owner check)
- Flow Board UI (칸반)

> Goal: "기록을 남기고 이어받는" 핵심 루프가 돌아간다.

### Phase 2: Context + Visibility (2~3주)

- Context Card (why + criteria)
- Project Brief + version history
- File Attachment (S3 upload)
- Pickup Record + Pickup Log view
- Dashboard view

> Goal: "왜 이 작업을 하는지"와 "프로젝트 전체 맥락"을 즉시 열람할 수 있다.

### Phase 3: Automation + Insight (2~3주)

- Risk Detector (24h blocked alert)
- Daily digest notification
- Risk View UI
- Owner reassignment (admin)
- Stats and reporting

> Goal: 시스템이 병목을 감지하고 알려준다. "어떻게 돼가나요?" 질문이 사라진다.

---

## 9. 기술 스택 (추천)

| 영역 | 기술 | 비고 |
|------|------|------|
| Backend | Django or FastAPI (Python) | 3인 팀에 적합한 생산성 |
| Frontend | React + Tailwind CSS | Flow Board 칸반에 적합 |
| Database | PostgreSQL | JSONB로 snapshot 저장 가능 |
| File Storage | AWS S3 or MinIO | Presigned URL 지원 |
| Cache | Redis | 세션, 리스크 타이머 |
| Notification | 웹소켓 or Polling | Phase 3에서 구현 |

---

## 부록: S3 키 구조 및 정리 정책

```
ddorang-files/
├── brief/{project_brief_id}/{uuid}/{filename}
├── box/{box_id}/{uuid}/{filename}
└── log/{async_log_id}/{uuid}/{filename}
```

- pending 상태 파일: 1시간 후 자동 삭제 (cron)
- deleted 상태 파일: 30일 후 S3에서 실제 삭제 (lifecycle policy)
- confirmed 파일: 영구 보존
