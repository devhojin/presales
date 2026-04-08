-- =============================================
-- RLS 정책 수정 (M-4, M-5)
-- 2026-04-08: 보안 강화
-- =============================================

-- M-4: 다운로드 로그 - 과도하게 개방된 정책 제거
-- 기존: "Anyone can view download logs" → 모든 사용자가 전체 다운로드 로그 조회 가능
-- 수정: 본인 로그만 조회 가능 (관리자는 전체 조회)
DROP POLICY IF EXISTS "Anyone can view download logs" ON download_logs;

CREATE POLICY "Admin can view all download logs" ON download_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- M-5: 컨설팅 요청 - 스팸 방지를 위해 인증 사용자만 작성 가능
-- 기존: "Anyone can create consulting request" WITH CHECK (TRUE)
-- 수정: 로그인한 사용자만 작성 가능
DROP POLICY IF EXISTS "Anyone can create consulting request" ON consulting_requests;

CREATE POLICY "Authenticated users can create consulting request" ON consulting_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
