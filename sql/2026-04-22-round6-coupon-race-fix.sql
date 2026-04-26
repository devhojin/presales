-- ============================================================================
-- 2026-04-22 Round 6: 쿠폰 경쟁 조건 + 소유권 우회 차단
-- ============================================================================
-- 배경:
--   /api/payment/confirm 의 기존 흐름은
--     (1) recomputeExpectedAmount 에서 coupons.usage_count < max_usage 확인
--     (2) 토스 confirm 호출 → 결제 승인
--     (3) increment_coupon_usage RPC 호출 → atomic 증가
--   (1)~(3) 사이 race window 가 있어 max_usage=1 쿠폰으로 동시 요청 시
--   두 주문 모두 (1) 통과 → 둘 다 토스 승인 → RPC 는 한 쪽만 성공.
--   진 쪽 요청은 이미 결제 완료된 채 로그만 남고 할인은 그대로 적용됨.
--
--   또한 recomputeExpectedAmount 가 user_coupons (개인 보유 쿠폰) 을 조회하지
--   않아, 공격자가 coupon_id UUID 만 알면 남의 welcome 쿠폰을 재사용할 수 있음.
--
-- 조치 (Round 6):
--   1) rollback_coupon_usage RPC 신설 — 토스 confirm 실패 시 예약 해제용
--   2) payment/confirm 흐름을 "예약 → 토스 confirm → 실패 시 rollback" 으로 변경
--   3) recomputeExpectedAmount 에서 user_coupons 소유 + 미사용 확인
--
-- 적용 후 확인:
--   SELECT proname FROM pg_proc WHERE proname = 'rollback_coupon_usage';
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rollback_coupon_usage(
  p_coupon_id uuid,
  p_user_id uuid,
  p_order_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_use_deleted integer;
  v_uc_reverted integer;
begin
  -- 1) usage_count 잠그고 감소 (0 미만으로 안 내려감)
  update coupons
     set usage_count = greatest(0, coalesce(usage_count, 0) - 1)
   where id = p_coupon_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  end if;

  -- 2) 이 주문으로 기록된 coupon_uses 행 삭제
  delete from coupon_uses
   where coupon_id = p_coupon_id
     and user_id = p_user_id
     and order_id = p_order_id;
  get diagnostics v_use_deleted = row_count;

  -- 3) user_coupons 소진을 되돌림 (이 주문으로 소진한 경우만)
  update user_coupons
     set used_at = null,
         used_order_id = null
   where user_id = p_user_id
     and coupon_id = p_coupon_id
     and used_order_id = p_order_id;
  get diagnostics v_uc_reverted = row_count;

  return jsonb_build_object(
    'ok', true,
    'coupon_uses_deleted', v_use_deleted,
    'user_coupons_reverted', v_uc_reverted
  );
end;
$function$;

-- service_role 로만 호출 (API 라우트가 service_role 로 호출)
REVOKE ALL ON FUNCTION public.rollback_coupon_usage(uuid, uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_coupon_usage(uuid, uuid, bigint) TO service_role;
