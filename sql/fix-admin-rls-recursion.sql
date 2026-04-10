-- ============================================
-- 긴급 수정: 관리자 RLS 재귀 버그
-- 2026-04-10
-- ============================================

-- ① SECURITY DEFINER 함수 생성 (RLS 우회해서 역할 확인)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ② 재귀 정책 삭제 후 재생성 (is_admin() 사용)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (public.is_admin());

-- ③ 다른 테이블도 동일 함수로 교체 (일관성)
DROP POLICY IF EXISTS "Admin full access" ON coupons;
CREATE POLICY "Admin full access" ON coupons
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (public.is_admin());

-- 확인 쿼리 (실행 결과로 admin 계정이 정상 조회되는지 확인)
-- SELECT id, email, role FROM profiles WHERE email = 'admin@amarans.co.kr';
