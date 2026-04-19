-- ============================================================
-- 상태 전이 함수 (State Machine)
-- ============================================================

CREATE OR REPLACE FUNCTION transition_box(
  p_box_id TEXT,
  p_to_status TEXT,
  p_log_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_box RECORD;
  v_user_id TEXT;
  v_user_role TEXT;
  v_allowed TEXT[];
  v_old_status TEXT;
BEGIN
  -- 현재 사용자 확인
  v_user_id := get_my_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  SELECT role INTO v_user_role FROM users WHERE id = v_user_id;

  -- 박스 조회
  SELECT * INTO v_box FROM boxes WHERE id = p_box_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_status := v_box.flow_status;

  -- 전이 규칙 확인
  CASE v_old_status
    WHEN 'wait' THEN v_allowed := ARRAY['working'];
    WHEN 'working' THEN v_allowed := ARRAY['pickup', 'blocked'];
    WHEN 'pickup' THEN v_allowed := ARRAY['working'];
    WHEN 'blocked' THEN v_allowed := ARRAY['review'];
    WHEN 'review' THEN v_allowed := ARRAY['done', 'working'];
    WHEN 'done' THEN v_allowed := ARRAY[]::TEXT[];
    ELSE v_allowed := ARRAY[]::TEXT[];
  END CASE;

  IF NOT (p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_old_status, p_to_status
      USING ERRCODE = 'P0003';
  END IF;

  -- 로그 메시지 검증
  IF p_log_message IS NULL OR length(trim(p_log_message)) < 10 THEN
    RAISE EXCEPTION 'Log message required (min 10 chars)' USING ERRCODE = 'P0004';
  END IF;

  -- 권한 검증
  -- wait → working: 누구나
  IF v_old_status = 'wait' AND p_to_status = 'working' THEN
    -- OK
    NULL;

  -- working → pickup/blocked: owner만
  ELSIF v_old_status = 'working' AND p_to_status IN ('pickup', 'blocked') THEN
    IF v_box.owner_id != v_user_id THEN
      RAISE EXCEPTION 'Only owner can transition from working' USING ERRCODE = 'P0005';
    END IF;

  -- pickup → working: 이전 owner 제외 누구나
  ELSIF v_old_status = 'pickup' AND p_to_status = 'working' THEN
    IF v_box.owner_id = v_user_id THEN
      RAISE EXCEPTION 'Previous owner cannot pick up their own box' USING ERRCODE = 'P0006';
    END IF;

  -- blocked → review: owner 또는 admin
  ELSIF v_old_status = 'blocked' AND p_to_status = 'review' THEN
    IF v_box.owner_id != v_user_id AND v_user_role != 'admin' THEN
      RAISE EXCEPTION 'Only owner or admin can resolve blocked' USING ERRCODE = 'P0005';
    END IF;

  -- review → done: admin만
  ELSIF v_old_status = 'review' AND p_to_status = 'done' THEN
    IF v_user_role != 'admin' THEN
      RAISE EXCEPTION 'Only admin can approve' USING ERRCODE = 'P0005';
    END IF;

  -- review → working: admin만
  ELSIF v_old_status = 'review' AND p_to_status = 'working' THEN
    IF v_user_role != 'admin' THEN
      RAISE EXCEPTION 'Only admin can reject' USING ERRCODE = 'P0005';
    END IF;
  END IF;

  -- 전이 실행
  IF v_old_status = 'wait' AND p_to_status = 'working' THEN
    UPDATE boxes SET flow_status = p_to_status, owner_id = v_user_id,
      status_changed_at = NOW() WHERE id = p_box_id;
  ELSIF v_old_status = 'pickup' AND p_to_status = 'working' THEN
    -- 픽업 기록 생성
    INSERT INTO pickup_records (id, box_id, completed_by, picked_by, note, created_at)
    VALUES (gen_random_uuid()::text, p_box_id, v_box.owner_id, v_user_id, p_log_message, NOW());
    UPDATE boxes SET flow_status = p_to_status, owner_id = v_user_id,
      status_changed_at = NOW() WHERE id = p_box_id;
  ELSE
    UPDATE boxes SET flow_status = p_to_status,
      status_changed_at = NOW() WHERE id = p_box_id;
  END IF;

  -- blocked 시 risk_flag 해제, blocked 진입 시는 타이머 시작 (pg_cron에서 처리)
  IF p_to_status = 'review' AND v_old_status = 'blocked' THEN
    UPDATE boxes SET risk_flag = false WHERE id = p_box_id;
  END IF;

  -- 로그 생성 (append-only)
  INSERT INTO async_logs (id, box_id, author_id, content, log_type, created_at)
  VALUES (gen_random_uuid()::text, p_box_id, v_user_id, p_log_message, 'system', NOW());

  -- 활동 기록
  INSERT INTO activities (id, actor_id, type, subject_type, subject_id, summary, created_at)
  VALUES (
    gen_random_uuid()::text, v_user_id, 'box_transitioned', 'box', p_box_id,
    format('%s → %s: %s', v_old_status, p_to_status, left(p_log_message, 100)),
    NOW()
  );

  -- 결과 반환
  RETURN (SELECT to_jsonb(b) FROM boxes b WHERE b.id = p_box_id);
END;
$$;

-- ============================================================
-- Owner 재지정 함수 (Admin 전용)
-- ============================================================

CREATE OR REPLACE FUNCTION reassign_box_owner(
  p_box_id TEXT,
  p_new_owner_id TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_box RECORD;
  v_user_id TEXT;
  v_old_owner TEXT;
BEGIN
  v_user_id := get_my_user_id();
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'P0005';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Reason required (min 10 chars)' USING ERRCODE = 'P0004';
  END IF;

  SELECT * INTO v_box FROM boxes WHERE id = p_box_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_owner := v_box.owner_id;
  UPDATE boxes SET owner_id = p_new_owner_id WHERE id = p_box_id;

  INSERT INTO async_logs (id, box_id, author_id, content, log_type, created_at)
  VALUES (gen_random_uuid()::text, p_box_id, v_user_id,
    format('Owner 재지정: %s → %s. 사유: %s', COALESCE(v_old_owner, 'none'), COALESCE(p_new_owner_id, 'none'), p_reason),
    'system', NOW());

  INSERT INTO activities (id, actor_id, type, subject_type, subject_id, summary, created_at)
  VALUES (gen_random_uuid()::text, v_user_id, 'box_reassigned', 'box', p_box_id, p_reason, NOW());

  RETURN (SELECT to_jsonb(b) FROM boxes b WHERE b.id = p_box_id);
END;
$$;

-- ============================================================
-- 리스크 체크 함수 (pg_cron으로 매시간 실행)
-- ============================================================

CREATE OR REPLACE FUNCTION check_risk_boxes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE boxes
  SET risk_flag = true
  WHERE flow_status = 'blocked'
    AND risk_flag = false
    AND status_changed_at < NOW() - INTERVAL '24 hours';
END;
$$;
