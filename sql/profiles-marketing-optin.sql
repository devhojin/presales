-- ============================================
-- profiles: 마케팅 수신 동의 필드 추가
-- 2026-04-14 · 정보통신망법 제50조(영리목적 광고성 정보 전송)에 따른 별도 동의 기록
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.marketing_opt_in IS '마케팅 정보 수신 동의 여부 (이메일/SMS)';
COMMENT ON COLUMN profiles.marketing_opt_in_at IS '마케팅 동의 시각 (철회 시 NULL)';
