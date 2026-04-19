-- 2026-04-19: Supabase Performance Advisor auth_rls_initplan 60건 해소 PLAN
-- ⚠️ 호란 승인 전 적용 금지. RLS 정책 변경은 잘못 건드리면 access loss / 데이터 노출 위험.
--
-- 원리: 각 정책에서 `auth.uid()`, `auth.jwt()`, `auth.role()` 등을 `(select auth.uid())` 형태로
--      서브쿼리 래핑 → Postgres가 row 마다 호출하지 않고 query 당 1회 호출. 결과 동일, 성능만 향상.
--      Supabase 공식 권장 패턴: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 자동 적용 흐름 (호란 OK 후):
--   1. 다음 쿼리로 영향 정책 60개 dump
--   2. 각 정책별 DROP + CREATE (qual, with_check 안에서만 auth.uid() → (select auth.uid()))
--   3. advisor 재호출 → 0건 확인
--
-- 사전 dump 쿼리 (로컬 검토용):

select
  schemaname, tablename, policyname, cmd, roles,
  qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual ~ 'auth\.(uid|jwt|role)\(\)' or with_check ~ 'auth\.(uid|jwt|role)\(\)')
order by tablename, policyname;

-- 영향 테이블 (advisor 기준):
--   profiles, products, categories, orders, order_items, consulting_requests,
--   cart_items, product_files, consulting_packages, team_members, site_settings,
--   download_logs, reviews, review_helpful, product_discount_matches,
--   blog_posts, announcements, blocked_announcements, announcement_logs,
--   community_posts, feed_sources, blocked_community_posts, feed_logs,
--   announcement_bookmarks, announcement_reads, feed_bookmarks, feed_reads,
--   chat_rooms, chat_messages, chat_payment_requests, coupon_uses, user_coupons,
--   daily_briefs, brief_items, brief_subscribers, page_views

-- 호란 승인 받으면 애란이가 위 dump 결과를 받아 60개 ALTER POLICY 스크립트 자동 생성 후 적용.
