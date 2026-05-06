-- Supabase Security Advisor follow-up.
-- Keeps public read URLs working for public storage buckets while removing
-- object-list policies, and moves privileged helper RPCs behind server/service use.

begin;

alter function public.set_rfp_analysis_jobs_updated_at()
  set search_path = public, pg_temp;

alter function public.set_reward_ledger_updated_at()
  set search_path = public, pg_temp;

drop policy if exists "Public read access for product-previews" on storage.objects;
drop policy if exists "Anyone can view thumbnails" on storage.objects;
drop policy if exists "Anyone can view review images" on storage.objects;
drop policy if exists "Public can read review images" on storage.objects;

revoke execute on function public.enforce_review_verified_purchase() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.increment_coupon_usage(uuid, uuid, bigint, bigint) from public, anon, authenticated;
revoke execute on function public.increment_helpful(integer) from public, anon, authenticated;
revoke execute on function public.decrement_helpful(integer) from public, anon, authenticated;

grant execute on function public.enforce_review_verified_purchase() to service_role;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.increment_coupon_usage(uuid, uuid, bigint, bigint) to service_role;
grant execute on function public.increment_helpful(integer) to service_role;
grant execute on function public.decrement_helpful(integer) to service_role;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

alter policy "Admin full access" on public.coupons
  using (private.is_admin())
  with check (private.is_admin());

alter policy "faq_categories_admin_all" on public.faq_categories
  using (private.is_admin());

alter policy "faqs_admin_all" on public.faqs
  using (private.is_admin());

alter policy "Admins can view all orders" on public.orders
  using (private.is_admin());

alter policy "Admin can view all profiles" on public.profiles
  using (((select auth.uid()) = id) or private.is_admin());

alter policy "Admins can delete profiles" on public.profiles
  using (private.is_admin());

alter policy "Admins can update all profiles" on public.profiles
  using (private.is_admin())
  with check (private.is_admin());

alter policy "Admins can view all profiles" on public.profiles
  using (private.is_admin());

alter policy "Admins can view all reviews" on public.reviews
  using (private.is_admin());

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to service_role;

commit;
