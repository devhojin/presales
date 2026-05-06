-- morning-brief RLS 정책
-- 원칙:
--   - 구독(/api/brief/subscribe)과 수신거부는 서버 API에서 service_role로 처리
--   - 공개 anon/authenticated 역할은 모닝브리프 원장 테이블에 직접 접근 불가
--   - 조회/관리/발송/아카이브 작업은 service_role 전용

alter table subscribers          enable row level security;
alter table subscriber_sources   enable row level security;
alter table news_items           enable row level security;
alter table briefs               enable row level security;
alter table brief_sends          enable row level security;

drop policy if exists subscribers_anon_insert on subscribers;
drop policy if exists subscribers_anon_update_by_token on subscribers;
drop policy if exists subscribers_anon_select_by_token on subscribers;
drop policy if exists subscriber_sources_anon_upsert on subscriber_sources;

drop policy if exists subscribers_service_role_all on subscribers;
drop policy if exists subscriber_sources_service_role_all on subscriber_sources;
drop policy if exists news_items_service_role_all on news_items;
drop policy if exists briefs_service_role_all on briefs;
drop policy if exists brief_sends_service_role_all on brief_sends;

revoke all on table subscribers from anon, authenticated;
revoke all on table subscriber_sources from anon, authenticated;
revoke all on table news_items from anon, authenticated;
revoke all on table briefs from anon, authenticated;
revoke all on table brief_sends from anon, authenticated;

grant all on table subscribers to service_role;
grant all on table subscriber_sources to service_role;
grant all on table news_items to service_role;
grant all on table briefs to service_role;
grant all on table brief_sends to service_role;

create policy subscribers_service_role_all on subscribers
  for all to service_role
  using (true)
  with check (true);

create policy subscriber_sources_service_role_all on subscriber_sources
  for all to service_role
  using (true)
  with check (true);

create policy news_items_service_role_all on news_items
  for all to service_role
  using (true)
  with check (true);

create policy briefs_service_role_all on briefs
  for all to service_role
  using (true)
  with check (true);

create policy brief_sends_service_role_all on brief_sends
  for all to service_role
  using (true)
  with check (true);
