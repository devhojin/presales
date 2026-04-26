-- ============================================
-- profiles: 로그인 잠금 컬럼 추가 (KISA: 5회 실패 → 15분 잠금)
-- 2026-04-16 · localStorage 기반 → 서버사이드 마이그레이션
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_failed_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS login_locked_until TIMESTAMPTZ;

COMMENT ON COLUMN profiles.login_failed_count IS '연속 로그인 실패 횟수 (성공 시 0으로 초기화)';
COMMENT ON COLUMN profiles.login_locked_until IS '잠금 해제 시각 (NULL이면 잠금 없음)';
