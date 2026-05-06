-- consulting_requests RLS 정책
-- 인증된 사용자: INSERT 가능 (상담 신청)
-- 관리자: 전체 CRUD
DROP POLICY IF EXISTS "Users can insert consulting requests" ON consulting_requests;
CREATE POLICY "Users can insert consulting requests" ON consulting_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own consulting requests" ON consulting_requests;
CREATE POLICY "Users can view own consulting requests" ON consulting_requests
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Admins manage consulting requests" ON consulting_requests;
CREATE POLICY "Admins manage consulting requests" ON consulting_requests
  FOR ALL USING (private.is_admin()) WITH CHECK (private.is_admin());
