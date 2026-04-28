-- Make coupon reservation/rollback safe for bank transfer, admin refund, and webhook retry paths.

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
  v_existing_id bigint;
begin
  select id into v_existing_id
  from public.coupon_uses
  where coupon_id = p_coupon_id
    and user_id = p_user_id
    and order_id = p_order_id
  order by id desc
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object('ok', true, 'skipped', true, 'coupon_use_id', v_existing_id);
  end if;

  select usage_count, max_usage into v_current, v_max
  from public.coupons
  where id = p_coupon_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  end if;

  if v_max is not null and v_current >= v_max then
    return jsonb_build_object('ok', false, 'error', 'max_usage_exceeded');
  end if;

  update public.coupons
     set usage_count = coalesce(usage_count, 0) + 1
   where id = p_coupon_id
  returning usage_count into v_updated;

  insert into public.coupon_uses (coupon_id, user_id, order_id, applied_amount)
  values (p_coupon_id, p_user_id, p_order_id, coalesce(p_applied_amount, 0))
  returning id into v_existing_id;

  update public.user_coupons
     set used_at = now(),
         used_order_id = p_order_id
   where user_id = p_user_id
     and coupon_id = p_coupon_id
     and used_at is null;

  return jsonb_build_object('ok', true, 'usage_count', v_updated, 'coupon_use_id', v_existing_id);
end;
$$;

create or replace function public.rollback_coupon_usage(
  p_coupon_id uuid,
  p_user_id uuid,
  p_order_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_use_deleted integer;
  v_uc_reverted integer;
  v_usage_count integer;
begin
  delete from public.coupon_uses
   where coupon_id = p_coupon_id
     and user_id = p_user_id
     and order_id = p_order_id;
  get diagnostics v_use_deleted = row_count;

  if v_use_deleted = 0 then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'no_coupon_use');
  end if;

  update public.coupons
     set usage_count = greatest(0, coalesce(usage_count, 0) - v_use_deleted)
   where id = p_coupon_id
  returning usage_count into v_usage_count;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  end if;

  update public.user_coupons
     set used_at = null,
         used_order_id = null
   where user_id = p_user_id
     and coupon_id = p_coupon_id
     and used_order_id = p_order_id;
  get diagnostics v_uc_reverted = row_count;

  return jsonb_build_object(
    'ok', true,
    'coupon_uses_deleted', v_use_deleted,
    'user_coupons_reverted', v_uc_reverted,
    'usage_count', v_usage_count
  );
end;
$$;

revoke all on function public.increment_coupon_usage(uuid, uuid, bigint, bigint) from public, anon, authenticated;
revoke all on function public.rollback_coupon_usage(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function public.increment_coupon_usage(uuid, uuid, bigint, bigint) to authenticated, service_role;
grant execute on function public.rollback_coupon_usage(uuid, uuid, bigint) to service_role;
