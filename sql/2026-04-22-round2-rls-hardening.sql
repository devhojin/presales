-- Round 2 RLS hardening (2026-04-22)
-- 회원 자기수정 권한 상승 방지 + consulting_requests user_id 위조 방지
--
-- 반드시 Supabase Studio SQL Editor에서 수동 실행
--   대시보드 → SQL Editor → 이 파일 전체 붙여넣기 → Run

-- =========================================================
-- 1) reviews UPDATE — 관리자 전용 컬럼 위조 차단
-- =========================================================
-- 기존 정책은 WITH CHECK가 null이어서 USING 과 동일(= user_id 일치만 검사).
-- 결과: 사용자가 자기 리뷰의 admin_reply / product_id / is_verified_purchase /
--      is_published / reviewer_name / reviewer_email 을 임의 수정 가능했음.
--
-- 수정 후: 아래 7개 컬럼은 본인 업데이트에서 NEW == OLD 강제. 다른 컬럼
--       (rating, title, content, pros, cons, image_urls, updated_at) 만 변경 허용.

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (user_id, product_id, is_verified_purchase, is_published,
         admin_reply, reviewer_name, reviewer_email, helpful_count)
        IS NOT DISTINCT FROM
        (SELECT (r.user_id, r.product_id, r.is_verified_purchase, r.is_published,
                 r.admin_reply, r.reviewer_name, r.reviewer_email, r.helpful_count)
         FROM public.reviews r
         WHERE r.id = reviews.id)
  );

-- =========================================================
-- 2) consulting_requests INSERT — user_id 위조 차단
-- =========================================================
-- 기존: WITH CHECK (auth.uid() IS NOT NULL)
--   → 로그인만 되어있으면 임의 user_id로 삽입 가능. 타 회원 이름으로 문의 가능.
-- 수정 후: user_id가 null(비회원 간접 접수)이거나 본인 uid일 때만 허용.

DROP POLICY IF EXISTS "Authenticated users can create consulting request" ON public.consulting_requests;

CREATE POLICY "Authenticated users can create consulting request"
  ON public.consulting_requests
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
  );

-- =========================================================
-- 3) consulting_requests 길이 방어 (DB 오염 방지)
-- =========================================================
-- message/name/email 등에 상한 없는 text. DoS성 대용량 삽입 가능.

ALTER TABLE public.consulting_requests
  DROP CONSTRAINT IF EXISTS consulting_requests_length_guard;

ALTER TABLE public.consulting_requests
  ADD CONSTRAINT consulting_requests_length_guard CHECK (
    char_length(name) <= 100
    AND char_length(email) <= 254
    AND (phone IS NULL OR char_length(phone) <= 50)
    AND (company IS NULL OR char_length(company) <= 200)
    AND (package_type IS NULL OR char_length(package_type) <= 50)
    AND (message IS NULL OR char_length(message) <= 20000)
  );

-- =========================================================
-- 검증 쿼리 (실행 후 확인용)
-- =========================================================
-- SELECT policyname, qual, with_check FROM pg_policies WHERE tablename='reviews' AND cmd='UPDATE';
-- SELECT policyname, with_check FROM pg_policies WHERE tablename='consulting_requests' AND cmd='INSERT';
-- SELECT conname FROM pg_constraint WHERE conrelid='public.consulting_requests'::regclass;
