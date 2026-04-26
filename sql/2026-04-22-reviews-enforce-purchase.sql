-- 2026-04-22 리뷰 조작 방지 (Round 3 자율 감사 산출)
--
-- 배경:
--   reviews 테이블 INSERT RLS 가 user_id = auth.uid() 만 검증 → 구매하지 않은 상품에도
--   클라이언트가 임의로 is_verified_purchase=true 를 실어 리뷰를 꽂을 수 있었음.
--   현재 DB 전수 조사 (899건) 결과 위조 흔적 없음 — 구멍만 닫는 예방 조치.
--
-- 조치:
--   1) BEFORE INSERT/UPDATE 트리거로 is_verified_purchase 를 서버가 재계산 (클라이언트 값 폐기).
--   2) INSERT RLS 강화 — 실제 결제 주문(completed|paid) 또는 무료 상품에만 리뷰 작성 허용.

create or replace function public.enforce_review_verified_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_free_product boolean;
  has_paid_order boolean;
begin
  select coalesce(p.is_free, false) into is_free_product
  from public.products p
  where p.id = new.product_id;

  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = new.product_id
      and o.user_id = new.user_id
      and o.status in ('completed','paid')
  ) into has_paid_order;

  new.is_verified_purchase := (has_paid_order or coalesce(is_free_product, false));
  return new;
end;
$$;

drop trigger if exists trg_reviews_enforce_verified on public.reviews;
create trigger trg_reviews_enforce_verified
before insert or update of is_verified_purchase, user_id, product_id on public.reviews
for each row execute function public.enforce_review_verified_purchase();

drop policy if exists "Users can create own reviews" on public.reviews;
create policy "Users can create own reviews"
on public.reviews for insert
with check (
  (select auth.uid()) = user_id
  and (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_free = true
    )
    or exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = product_id
        and o.user_id = user_id
        and o.status in ('completed','paid')
    )
  )
);
