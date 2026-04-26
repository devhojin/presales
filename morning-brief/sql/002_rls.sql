-- morning-brief RLS 정책
-- 원칙:
--   - 구독(/api/brief/subscribe)은 anon 키로 가능
--   - 수신거부는 token 일치로 anon 키로 가능
--   - 그 외 (조회/관리)는 service_role 전용

alter table subscribers          enable row level security;
alter table subscriber_sources   enable row level security;
alter table news_items           enable row level security;
alter table briefs               enable row level security;
alter table brief_sends          enable row level security;

-- ============================================================================
-- subscribers: anon 가입/재구독, 토큰 기반 수신거부
-- ============================================================================

-- INSERT: anon 허용 (가입)
drop policy if exists subscribers_anon_insert on subscribers;
create policy subscribers_anon_insert on subscribers
  for insert
  to anon
  with check (true);

-- UPDATE: anon은 자기 토큰 일치할 때만 (수신거부/재구독)
drop policy if exists subscribers_anon_update_by_token on subscribers;
create policy subscribers_anon_update_by_token on subscribers
  for update
  to anon
  using (token = current_setting('request.jwt.claims', true)::json->>'token'
         or token = (current_setting('request.headers', true)::json->>'x-subscriber-token'))
  with check (true);

-- SELECT: anon은 자기 토큰으로만 (수신거부 페이지에서 본인 확인용)
drop policy if exists subscribers_anon_select_by_token on subscribers;
create policy subscribers_anon_select_by_token on subscribers
  for select
  to anon
  using (token = (current_setting('request.headers', true)::json->>'x-subscriber-token'));

-- ============================================================================
-- subscriber_sources: anon 가입 시 추가 가능 (idempotent upsert)
-- ============================================================================
drop policy if exists subscriber_sources_anon_upsert on subscriber_sources;
create policy subscriber_sources_anon_upsert on subscriber_sources
  for insert
  to anon
  with check (true);

-- ============================================================================
-- news_items / briefs / brief_sends: service_role 전용
-- (별도 정책 없으면 anon은 RLS에 의해 차단됨)
-- ============================================================================
-- 위 테이블들은 정책 추가 안 함 → RLS 활성 + 정책 0개 = anon 모두 차단

-- service_role은 RLS 우회하므로 별도 grant 불필요
