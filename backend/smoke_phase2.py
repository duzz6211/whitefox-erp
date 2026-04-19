"""Phase 2 엔드포인트 스모크 테스트."""
import httpx
import sys

BASE = "http://127.0.0.1:8000"


def die(msg, resp=None):
    print(f"[FAIL] {msg}")
    if resp is not None:
        print(f"  status={resp.status_code} body={resp.text[:200]}")
    sys.exit(1)


with httpx.Client(base_url=BASE) as c:
    # login admin
    r = c.post("/auth/login", data={"username": "admin@arcticfox.kr", "password": "admin1234"})
    if r.status_code != 200:
        die("admin login", r)
    admin_token = r.json()["access_token"]
    adminH = {"Authorization": f"Bearer {admin_token}"}

    # login alice
    r = c.post("/auth/login", data={"username": "alice@arcticfox.kr", "password": "alice1234"})
    alice = r.json()["user"]
    alice_token = r.json()["access_token"]
    aliceH = {"Authorization": f"Bearer {alice_token}"}

    # find project + working box (alice's)
    pid = c.get("/projects", headers=adminH).json()[0]["id"]
    boxes = c.get("/boxes", params={"status": "working"}, headers=adminH).json()
    box = next(b for b in boxes if b["owner_id"] == alice["id"])
    bid = box["id"]
    print(f"project={pid[:8]} box={bid[:8]} ({box['title']})")

    # context card as alice (owner)
    r = c.put(f"/boxes/{bid}/context", headers=aliceH, json={
        "why": "JWT 로그인 플로우 확립",
        "success_criteria": "토큰 발급 + /auth/me 성공",
        "decision_history": "bcrypt + jose 채택",
    })
    if r.status_code != 200:
        die("context PUT as owner", r)
    print(f"[OK] context PUT: why='{r.json()['why'][:20]}...'")

    # context PUT as non-owner non-admin should 403 (bob)
    r = c.post("/auth/login", data={"username": "bob@arcticfox.kr", "password": "bob1234"})
    bob_token = r.json()["access_token"]
    bobH = {"Authorization": f"Bearer {bob_token}"}
    r = c.put(f"/boxes/{bid}/context", headers=bobH, json={"why": "x", "success_criteria": "y", "decision_history": "z"})
    if r.status_code != 403:
        die(f"bob should be 403 but got {r.status_code}", r)
    print(f"[OK] context PUT blocked for non-owner: {r.status_code}")

    # brief update (admin only)
    r = c.put(f"/projects/{pid}/brief", headers=aliceH, json={
        "requirements": "x", "client_info": "y", "change_reason": "test",
    })
    if r.status_code != 403:
        die(f"brief PUT as member should be 403 but got {r.status_code}", r)
    print(f"[OK] brief PUT blocked for member: {r.status_code}")

    r = c.put(f"/projects/{pid}/brief", headers=adminH, json={
        "requirements": "또랑 ERP 이식", "client_info": "내부", "change_reason": "최초 초안",
    })
    if r.status_code != 200:
        die("brief PUT v1->v2", r)
    assert r.json()["current_version"] == 2
    print(f"[OK] brief v1->v2")

    r = c.put(f"/projects/{pid}/brief", headers=adminH, json={
        "requirements": "또랑 ERP + 첨부파일", "client_info": "내부", "change_reason": "첨부 요구사항 추가",
    })
    assert r.json()["current_version"] == 3
    print(f"[OK] brief v2->v3")

    versions = c.get(f"/projects/{pid}/brief/versions", headers=adminH).json()
    assert len(versions) == 2  # 스냅샷 2개 (v1, v2)
    print(f"[OK] versions count={len(versions)}, reasons={[v['change_reason'] for v in versions]}")

    # pickup record via transition pickup->working as bob
    # find pickup box owned by bob
    pickup_boxes = c.get("/boxes", params={"status": "pickup"}, headers=adminH).json()
    if pickup_boxes:
        pbid = pickup_boxes[0]["id"]
        # alice picks up bob's box
        r = c.patch(f"/boxes/{pbid}/transition", headers=aliceH, json={
            "to": "working", "log_message": "밥이 넘긴 칸반 UI 이어받음",
        })
        if r.status_code != 200:
            die("pickup transition", r)
        pickups = c.get(f"/boxes/{pbid}/pickups", headers=aliceH).json()
        assert len(pickups) == 1
        print(f"[OK] pickup record auto-created: {pickups[0]['note'][:20]}...")

    # dashboard
    dash = c.get("/dashboard", headers=adminH).json()
    assert len(dash["projects"]) >= 1
    print(f"[OK] dashboard projects={len(dash['projects'])} owners={len(dash['owners'])}")
    print(f"     done_ratio={dash['projects'][0]['done_ratio']:.2f}")

    # file upload
    files = {"file": ("test.txt", b"hello phase 2", "text/plain")}
    r = c.post("/files", headers=adminH, data={
        "target_type": "box", "target_id": bid,
    }, files=files)
    if r.status_code != 201:
        die("file upload", r)
    att_id = r.json()["id"]
    assert r.json()["status"] == "confirmed"
    print(f"[OK] file upload: {r.json()['file_size']} bytes, status=confirmed")

    # file list
    lst = c.get("/files", params={"target_type": "box", "target_id": bid}, headers=adminH).json()
    assert len(lst) == 1
    print(f"[OK] file list count={len(lst)}")

    # file download
    r = c.get(f"/files/{att_id}/download", headers=adminH)
    if r.status_code != 200 or r.content != b"hello phase 2":
        die("download", r)
    print(f"[OK] download bytes match")

    # file delete
    r = c.delete(f"/files/{att_id}", headers=adminH)
    if r.status_code != 204:
        die("delete", r)
    lst = c.get("/files", params={"target_type": "box", "target_id": bid}, headers=adminH).json()
    assert len(lst) == 0
    print(f"[OK] soft delete: list empty")

print("\n=== Phase 2 smoke test ALL PASS ===")
