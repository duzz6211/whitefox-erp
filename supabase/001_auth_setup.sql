-- ============================================================
-- 1. users 테이블에 auth_id 컬럼 추가 (Supabase Auth 연동)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- ============================================================
-- 2. 헬퍼 함수
-- ============================================================

-- 현재 로그인한 사용자의 app user id 반환
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() AND is_active = true
$$;

-- 현재 사용자가 admin인지 확인
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM users WHERE auth_id = auth.uid() AND is_active = true),
    false
  )
$$;

-- 회원가입 시 자동으로 users 테이블에 행 생성하는 트리거
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (id, auth_id, name, email, role, is_active, created_at)
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    true,
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 기존 트리거 제거 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
