-- Round 10 — orders UPDATE RLS 복구
--
-- 문제:
--   orders UPDATE 정책이 "Admin can update orders" (role='admin') 하나뿐.
--   사용자 본인의 UPDATE 는 default deny 로 전부 차단되고 있음.
--
--   그래서 깨져 있던 경로:
--     1) checkout/page.tsx 기존 pending 주문 재사용:
--          .update({ total_amount, coupon_id, ... }).eq('id', existingOrder.id)
--        → RLS 차단 → "주문 금액 업데이트에 실패했습니다" 토스트 → /cart 로 튕김
--        → 결제 2회차 진입 자체가 막혀 있었음
--     2) checkout/fail/page.tsx 결제 실패 시:
--          .update({ status: 'cancelled' }).eq('id', ...).eq('status','pending')
--        → 차단 → console.error 로만 남고 실제 DB 는 pending 유지
--     3) checkout/page.tsx paying 실패 rollback 도 동일
--
-- 조치:
--   사용자 본인의 pending 주문만 UPDATE 허용.
--   결과 row 는 여전히 본인 소유여야 하고, status 는 pending 유지 또는 cancelled 로만 전환 가능.
--   (paid / pending_transfer / completed 로의 승격은 여전히 service_role 서버 경로에서만 가능 → 결제 우회 원천 차단)
--
-- 의도된 허용 케이스:
--   - pending 주문의 total_amount / coupon / 세금계산서 메모 등 갱신 (checkout 재진입)
--   - pending → cancelled 전환 (결제 실패, 사용자 취소)
--
-- 의도된 차단 케이스:
--   - paid/pending_transfer/completed 주문에 대한 모든 UPDATE (USING 에서 걸림)
--   - pending → paid 전환 시도 (WITH CHECK 에서 걸림)
--   - 남의 주문에 대한 UPDATE (USING/WITH CHECK 둘 다에서 걸림)

BEGIN;

DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;

CREATE POLICY "Users can update own pending orders" ON public.orders
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status IN ('pending', 'cancelled')
  );

COMMIT;

-- 확인:
--   select policyname, cmd, qual, with_check from pg_policies
--   where tablename='orders' order by cmd, policyname;
