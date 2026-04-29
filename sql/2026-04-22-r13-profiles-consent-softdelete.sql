-- R13: profiles 동의 timestamp + soft-delete 컬럼 추가
-- 실행: Supabase Studio → SQL Editor → 이 파일 전체 붙여넣고 Run
-- 작성: 2026-04-22 / 사유: Google OAuth 동의 경로 신설 + 탈퇴 soft-delete 대응 (KISA 5년 보존)

BEGIN;

-- 1) 동의 timestamp + soft-delete 컬럼
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_agreed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_agreed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS overseas_agreed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS age_agreed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason     text;

-- 2) 기존 이메일 가입자: 동의 timestamp 를 created_at 으로 backfill
--    (이메일 가입은 회원가입 페이지에서 이미 4종 동의 받고 있었음)
--    OAuth 가입자는 NULL 로 남겨 → complete-signup 경유하도록 유도
UPDATE profiles p
SET terms_agreed_at    = COALESCE(p.terms_agreed_at, p.created_at),
    privacy_agreed_at  = COALESCE(p.privacy_agreed_at, p.created_at),
    overseas_agreed_at = COALESCE(p.overseas_agreed_at, p.created_at),
    age_agreed_at      = COALESCE(p.age_agreed_at, p.created_at)
FROM auth.users u
WHERE u.id = p.id
  AND COALESCE(u.raw_app_meta_data->>'provider', 'email') = 'email';

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON profiles (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_terms_missing
  ON profiles (id) WHERE terms_agreed_at IS NULL;

-- 4) 컬럼 설명
COMMENT ON COLUMN profiles.terms_agreed_at    IS '이용약관 동의 시각 (NULL=미동의, OAuth 신규는 complete-signup 필요)';
COMMENT ON COLUMN profiles.privacy_agreed_at  IS '개인정보처리방침 동의 시각';
COMMENT ON COLUMN profiles.overseas_agreed_at IS '개인정보 국외이전 안내 확인 시각';
COMMENT ON COLUMN profiles.age_agreed_at      IS '만 14세 이상 확인 시각';
COMMENT ON COLUMN profiles.deleted_at         IS '회원 탈퇴 soft-delete 시각 (NULL=정상, NOT NULL=익명화 완료)';
COMMENT ON COLUMN profiles.deletion_reason    IS '탈퇴 사유 (선택)';

-- 5) profiles self-update 가드 재발행 — deleted_at / deletion_reason 추가 잠금
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (role, email, admin_memo, login_failed_count, login_locked_until,
         deleted_at, deletion_reason)
        IS NOT DISTINCT FROM
        (
          SELECT (p.role, p.email, p.admin_memo, p.login_failed_count,
                  p.login_locked_until, p.deleted_at, p.deletion_reason)
          FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
        )
  );

-- 6) members_with_stats 뷰에 deleted_at / deletion_reason 추가
--    admin members 페이지에서 탈퇴 회원 탭을 필터링하려면 뷰에서 노출 필요
DROP VIEW IF EXISTS public.members_with_stats;

CREATE VIEW public.members_with_stats AS
SELECT p.id,
       p.email,
       p.name,
       p.phone,
       p.company,
       p.role,
       p.admin_memo,
       p.created_at,
       p.deleted_at,
       p.deletion_reason,
       COALESCE(o.order_count, 0::bigint) AS order_count,
       COALESCE(o.total_spent, 0::bigint) AS total_spent,
       COALESCE(r.review_count, 0::bigint) AS review_count
FROM profiles p
LEFT JOIN (
    SELECT orders.user_id,
           count(*)              AS order_count,
           sum(orders.total_amount) AS total_spent
    FROM orders
    WHERE orders.status = ANY (ARRAY['paid'::text, 'completed'::text])
    GROUP BY orders.user_id
) o ON o.user_id = p.id
LEFT JOIN (
    SELECT reviews.user_id,
           count(*) AS review_count
    FROM reviews
    GROUP BY reviews.user_id
) r ON r.user_id = p.id;

COMMIT;

-- 검증 쿼리 (별도 실행)
-- SELECT count(*) FILTER (WHERE terms_agreed_at IS NULL) AS missing_consent,
--        count(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted,
--        count(*) AS total
-- FROM profiles;
