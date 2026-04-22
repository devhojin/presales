-- Round 9 — order_items INSERT RLS 결제 우회 차단
--
-- 문제:
--   기존 INSERT 정책은 "주문이 내 것이면 OK" 만 검증했음.
--     USING:      (없음)
--     WITH CHECK: EXISTS (orders WHERE orders.id = order_items.order_id
--                          AND orders.user_id = auth.uid())
--
-- 공격 경로 (결제 완전 우회):
--   1. 공격자가 과거에 무료/저가 상품 1회 구매 → orders.status='paid' 주문 소유
--   2. PostgREST 직접 호출로 기존 paid 주문에 고가 상품 order_items 추가:
--      POST /rest/v1/order_items
--      { order_id: <내 paid 주문>, product_id: <고가상품>, price: 0 }
--   3. 기존 INSERT 정책은 "주문 소유권" 만 체크하므로 통과
--   4. /api/download 구매 확인 쿼리 (orders.status IN ('paid','completed')
--      AND order_items.product_id=target) 가 방금 추가한 row 때문에 통과
--   5. product_files RLS 도 동일 구조로 통과 → signed URL 발급
--   6. 결제 없이 고가 상품 다운로드
--
-- 조치:
--   INSERT WITH CHECK 에 "orders.status = 'pending'" 강제.
--   결제 전 주문만 아이템 추가 허용. 정상 checkout 플로우는
--   orders INSERT(status='pending') → order_items INSERT 동시에 일어나므로 영향 없음.

BEGIN;

DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

CREATE POLICY "Users can create order items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = (SELECT auth.uid())
        AND o.status = 'pending'
    )
  );

-- UPDATE/DELETE 정책은 이미 존재하지 않음 (default deny). 추가 조치 불필요.

COMMIT;

-- 확인:
--   select polname, cmd, qual, with_check from pg_policies
--   where tablename='order_items' order by cmd, polname;
