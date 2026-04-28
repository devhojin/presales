-- Reward points system
-- Applies a cash-like reward balance after catalog discounts, purchase-history discounts, and coupons.

alter table public.profiles
  add column if not exists reward_balance bigint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_reward_balance_nonnegative'
  ) then
    alter table public.profiles
      add constraint profiles_reward_balance_nonnegative check (reward_balance >= 0);
  end if;
end $$;

alter table public.orders
  add column if not exists reward_discount bigint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_reward_discount_nonnegative'
  ) then
    alter table public.orders
      add constraint orders_reward_discount_nonnegative check (reward_discount >= 0);
  end if;
end $$;

create table if not exists public.reward_point_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  review_id bigint references public.reviews(id) on delete set null,
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  type text not null check (
    type in ('signup', 'review', 'purchase', 'use', 'refund', 'cancel', 'admin_adjust')
  ),
  status text not null default 'confirmed' check (
    status in ('pending', 'confirmed', 'cancelled')
  ),
  source_key text not null unique,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reward_point_ledger_user_created
  on public.reward_point_ledger (user_id, created_at desc);
create index if not exists idx_reward_point_ledger_order
  on public.reward_point_ledger (order_id);
create index if not exists idx_reward_point_ledger_review
  on public.reward_point_ledger (review_id);
create index if not exists idx_reward_point_ledger_status
  on public.reward_point_ledger (status);

alter table public.reward_point_ledger enable row level security;

drop policy if exists "Users can view own reward ledger" on public.reward_point_ledger;
create policy "Users can view own reward ledger"
on public.reward_point_ledger for select
using ((select auth.uid()) = user_id);

drop policy if exists "Admin can manage reward ledger" on public.reward_point_ledger;
create policy "Admin can manage reward ledger"
on public.reward_point_ledger for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

create or replace function public.set_reward_ledger_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reward_ledger_updated_at on public.reward_point_ledger;
create trigger trg_reward_ledger_updated_at
before update on public.reward_point_ledger
for each row execute function public.set_reward_ledger_updated_at();

create or replace function public.grant_reward_points(
  p_user_id uuid,
  p_amount bigint,
  p_type text,
  p_source_key text,
  p_order_id bigint default null,
  p_review_id bigint default null,
  p_memo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance bigint;
  next_balance bigint;
  existing_id bigint;
  ledger_id bigint;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'non_positive_amount');
  end if;

  if p_type not in ('signup', 'review', 'purchase', 'refund', 'admin_adjust') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_type');
  end if;

  select reward_balance into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  end if;

  select id into existing_id
  from public.reward_point_ledger
  where source_key = p_source_key;

  if existing_id is not null then
    return jsonb_build_object('ok', true, 'skipped', true, 'ledger_id', existing_id);
  end if;

  next_balance := current_balance + p_amount;

  update public.profiles
  set reward_balance = next_balance
  where id = p_user_id;

  insert into public.reward_point_ledger (
    user_id, order_id, review_id, amount, balance_after, type, status, source_key, memo
  ) values (
    p_user_id, p_order_id, p_review_id, p_amount, next_balance, p_type, 'confirmed', p_source_key, p_memo
  )
  returning id into ledger_id;

  return jsonb_build_object('ok', true, 'ledger_id', ledger_id, 'balance_after', next_balance);
end;
$$;

create or replace function public.reserve_reward_points(
  p_user_id uuid,
  p_order_id bigint,
  p_amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance bigint;
  next_balance bigint;
  existing public.reward_point_ledger%rowtype;
  ledger_id bigint;
  source text;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'zero_amount');
  end if;

  source := 'use:order:' || p_order_id::text;

  select reward_balance into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  end if;

  select * into existing
  from public.reward_point_ledger
  where source_key = source;

  if existing.id is not null and existing.status in ('pending', 'confirmed') then
    return jsonb_build_object('ok', true, 'skipped', true, 'ledger_id', existing.id);
  end if;

  if current_balance < p_amount then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_balance',
      'balance', current_balance
    );
  end if;

  next_balance := current_balance - p_amount;

  update public.profiles
  set reward_balance = next_balance
  where id = p_user_id;

  if existing.id is not null and existing.status = 'cancelled' then
    update public.reward_point_ledger
    set amount = -p_amount,
        balance_after = next_balance,
        status = 'pending',
        type = 'use',
        order_id = p_order_id,
        memo = '적립금 사용 예약 재시도'
    where id = existing.id
    returning id into ledger_id;
  else
    insert into public.reward_point_ledger (
      user_id, order_id, amount, balance_after, type, status, source_key, memo
    ) values (
      p_user_id, p_order_id, -p_amount, next_balance, 'use', 'pending', source, '주문 적립금 사용 예약'
    )
    returning id into ledger_id;
  end if;

  return jsonb_build_object('ok', true, 'ledger_id', ledger_id, 'balance_after', next_balance);
end;
$$;

create or replace function public.confirm_reward_points(p_order_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  update public.reward_point_ledger
  set status = 'confirmed',
      memo = coalesce(memo, '주문 적립금 사용 확정')
  where order_id = p_order_id
    and type = 'use'
    and status = 'pending';

  get diagnostics updated_count = row_count;

  return jsonb_build_object('ok', true, 'updated', updated_count);
end;
$$;

create or replace function public.rollback_reward_points(p_order_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.reward_point_ledger%rowtype;
  current_balance bigint;
  next_balance bigint;
begin
  select * into entry
  from public.reward_point_ledger
  where order_id = p_order_id
    and type = 'use'
    and status in ('pending', 'confirmed')
  order by id desc
  limit 1
  for update;

  if entry.id is null then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'no_pending_use');
  end if;

  select reward_balance into current_balance
  from public.profiles
  where id = entry.user_id
  for update;

  if current_balance is null then
    return jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  end if;

  next_balance := current_balance + abs(entry.amount);

  update public.profiles
  set reward_balance = next_balance
  where id = entry.user_id;

  update public.reward_point_ledger
  set status = 'cancelled',
      balance_after = next_balance,
      memo = coalesce(memo, '주문 적립금 사용 예약 취소')
  where id = entry.id;

  return jsonb_build_object('ok', true, 'ledger_id', entry.id, 'balance_after', next_balance);
end;
$$;

revoke all on function public.grant_reward_points(uuid, bigint, text, text, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.reserve_reward_points(uuid, bigint, bigint) from public, anon, authenticated;
revoke all on function public.confirm_reward_points(bigint) from public, anon, authenticated;
revoke all on function public.rollback_reward_points(bigint) from public, anon, authenticated;

grant execute on function public.grant_reward_points(uuid, bigint, text, text, bigint, bigint, text) to service_role;
grant execute on function public.reserve_reward_points(uuid, bigint, bigint) to service_role;
grant execute on function public.confirm_reward_points(bigint) to service_role;
grant execute on function public.rollback_reward_points(bigint) to service_role;

insert into public.site_settings (key, value) values
  ('reward.enabled', 'true'),
  ('reward.signup_bonus', '3000'),
  ('reward.review_bonus', '3000'),
  ('reward.accrual_base', 'after_discount'),
  ('reward.purchase_rate_percent', '0'),
  ('reward.use_limit_per_order', '10000')
on conflict (key) do nothing;
