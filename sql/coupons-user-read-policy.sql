-- 일반 회원이 활성 쿠폰을 조회할 수 있도록 정책 추가
DROP POLICY IF EXISTS "Users can view active coupons" ON coupons;
CREATE POLICY "Users can view active coupons" ON coupons
  FOR SELECT USING (is_active = true);
