-- Supabase Security Advisor remediation for morning-brief/public brief tables.
-- Goal:
--   - Enable RLS on all public morning brief tables flagged by the advisor.
--   - Remove direct anon/authenticated table access for service-owned ingestion,
--     archive, subscription, and send-log data.
--   - Convert members_with_stats to a security invoker view so it respects the
--     caller's privileges instead of running as the view owner.

begin;

alter table if exists public.subscribers enable row level security;
alter table if exists public.subscriber_sources enable row level security;
alter table if exists public.brief_subscriptions enable row level security;
alter table if exists public.brief_types enable row level security;
alter table if exists public.brief_keywords enable row level security;
alter table if exists public.subscription_events enable row level security;
alter table if exists public.brief_runs enable row level security;
alter table if exists public.briefs enable row level security;
alter table if exists public.news_items enable row level security;
alter table if exists public.brief_sends enable row level security;

drop policy if exists subscribers_anon_insert on public.subscribers;
drop policy if exists subscribers_anon_update_by_token on public.subscribers;
drop policy if exists subscribers_anon_select_by_token on public.subscribers;
drop policy if exists subscriber_sources_anon_upsert on public.subscriber_sources;

drop policy if exists subscribers_service_role_all on public.subscribers;
drop policy if exists subscriber_sources_service_role_all on public.subscriber_sources;
drop policy if exists brief_subscriptions_service_role_all on public.brief_subscriptions;
drop policy if exists brief_types_service_role_all on public.brief_types;
drop policy if exists brief_keywords_service_role_all on public.brief_keywords;
drop policy if exists subscription_events_service_role_all on public.subscription_events;
drop policy if exists brief_runs_service_role_all on public.brief_runs;
drop policy if exists briefs_service_role_all on public.briefs;
drop policy if exists news_items_service_role_all on public.news_items;
drop policy if exists brief_sends_service_role_all on public.brief_sends;

revoke all on table public.subscribers from anon, authenticated;
revoke all on table public.subscriber_sources from anon, authenticated;
revoke all on table public.brief_subscriptions from anon, authenticated;
revoke all on table public.brief_types from anon, authenticated;
revoke all on table public.brief_keywords from anon, authenticated;
revoke all on table public.subscription_events from anon, authenticated;
revoke all on table public.brief_runs from anon, authenticated;
revoke all on table public.briefs from anon, authenticated;
revoke all on table public.news_items from anon, authenticated;
revoke all on table public.brief_sends from anon, authenticated;

grant all on table public.subscribers to service_role;
grant all on table public.subscriber_sources to service_role;
grant all on table public.brief_subscriptions to service_role;
grant all on table public.brief_types to service_role;
grant all on table public.brief_keywords to service_role;
grant all on table public.subscription_events to service_role;
grant all on table public.brief_runs to service_role;
grant all on table public.briefs to service_role;
grant all on table public.news_items to service_role;
grant all on table public.brief_sends to service_role;

create policy subscribers_service_role_all on public.subscribers
  for all to service_role
  using (true)
  with check (true);

create policy subscriber_sources_service_role_all on public.subscriber_sources
  for all to service_role
  using (true)
  with check (true);

create policy brief_subscriptions_service_role_all on public.brief_subscriptions
  for all to service_role
  using (true)
  with check (true);

create policy brief_types_service_role_all on public.brief_types
  for all to service_role
  using (true)
  with check (true);

create policy brief_keywords_service_role_all on public.brief_keywords
  for all to service_role
  using (true)
  with check (true);

create policy subscription_events_service_role_all on public.subscription_events
  for all to service_role
  using (true)
  with check (true);

create policy brief_runs_service_role_all on public.brief_runs
  for all to service_role
  using (true)
  with check (true);

create policy briefs_service_role_all on public.briefs
  for all to service_role
  using (true)
  with check (true);

create policy news_items_service_role_all on public.news_items
  for all to service_role
  using (true)
  with check (true);

create policy brief_sends_service_role_all on public.brief_sends
  for all to service_role
  using (true)
  with check (true);

alter view if exists public.members_with_stats set (security_invoker = true);
revoke all on table public.members_with_stats from anon, authenticated;
revoke all on table public.members_with_stats from service_role;
grant select on table public.members_with_stats to service_role;

commit;
