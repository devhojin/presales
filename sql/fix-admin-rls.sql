-- ============================================
-- 관리자 RLS 정책 보강
-- 2026-04-10
-- ============================================

-- ① profiles: 관리자가 전체 조회 가능
-- (본인 프로필 조회 정책은 유지)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ② coupons: WITH CHECK 추가 (INSERT/UPDATE 허용)
DROP POLICY IF EXISTS "Admin full access" ON coupons;
CREATE POLICY "Admin full access" ON coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ③ orders: 관리자 전체 조회 + 수정 (회원 관리의 주문 통계용)
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ④ reviews: 관리자 전체 조회 (회원 관리의 리뷰 통계용)
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
CREATE POLICY "Admins can view all reviews" ON reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
