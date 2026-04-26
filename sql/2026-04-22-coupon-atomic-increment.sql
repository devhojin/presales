-- 쿠폰 usage_count atomic 증가 + 한도 enforcement
-- 목적: /api/payment/confirm 에서 read→update 2단계 때문에 동시 결제 시 증가 누락 + max_usage 초과 허용 가능성
-- 적용 후: supabase.rpc('increment_coupon_usage', { p_coupon_id, p_user_id, p_order_id, p_applied_amount })

create or replace function public.increment_coupon_usage(
  p_coupon_id uuid,
  p_user_id uuid,
  p_order_id bigint,
  p_applied_amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
  v_max integer;
  v_updated integer;
begin
  -- 1) usage_count 잠그고 읽어서 max_usage 검증
  select usage_count, max_usage into v_current, v_max
  from coupons
  where id = p_coupon_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  end if;

  if v_max is not null and v_current >= v_max then
    return jsonb_build_object('ok', false, 'error', 'max_usage_exceeded');
  end if;

  -- 2) atomic 증가
  update coupons
     set usage_count = coalesce(usage_count, 0) + 1
   where id = p_coupon_id
  returning usage_count into v_updated;

  -- 3) coupon_uses insert (중복 insert 차단 차원에서 unique index 있으면 conflict 처리)
  insert into coupon_uses (coupon_id, user_id, order_id, applied_amount)
  values (p_coupon_id, p_user_id, p_order_id, coalesce(p_applied_amount, 0));

  -- 4) user_coupons 소진 처리
  update user_coupons
     set used_at = now(),
         used_order_id = p_order_id
   where user_id = p_user_id
     and coupon_id = p_coupon_id
     and used_at is null;

  return jsonb_build_object('ok', true, 'usage_count', v_updated);
end;
$$;

revoke all on function public.increment_coupon_usage(uuid, uuid, bigint, bigint) from public;
grant execute on function public.increment_coupon_usage(uuid, uuid, bigint, bigint) to authenticated, service_role;
