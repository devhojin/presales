-- 2026-04-22 리뷰 INSERT RLS 자기참조 버그 수정
--
-- 원본 sql/2026-04-22-reviews-enforce-purchase.sql 의 INSERT 정책 서브쿼리에서
-- `oi.product_id = product_id`, `o.user_id = user_id` 가 바깥 reviews 행이 아닌
-- 서브쿼리 내부 동명 컬럼을 참조(oi.product_id = oi.product_id, o.user_id = o.user_id)
-- 해 사실상 TRUE 로 평가됨 → "아무 주문이라도 한 적 있는 유저는 아무 상품 리뷰 가능".
-- 바깥 reviews 컬럼을 명시적으로 qualify 해서 교체.

drop policy if exists "Users can create own reviews" on public.reviews;
create policy "Users can create own reviews"
on public.reviews for insert
with check (
  (select auth.uid()) = reviews.user_id
  and (
    exists (
      select 1 from public.products p
      where p.id = reviews.product_id and p.is_free = true
    )
    or exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = reviews.user_id
        and o.status in ('completed','paid')
    )
  )
);
