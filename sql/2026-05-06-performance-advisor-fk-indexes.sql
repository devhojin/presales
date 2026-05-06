-- Supabase Performance Advisor follow-up: add covering indexes for FK columns.

create index if not exists idx_brief_sends_brief_subscription_id
  on public.brief_sends (brief_subscription_id);

create index if not exists idx_brief_sends_subscriber_id
  on public.brief_sends (subscriber_id);

create index if not exists idx_news_items_used_in_brief
  on public.news_items (used_in_brief);

create index if not exists idx_rfp_analysis_report_downloads_job_id
  on public.rfp_analysis_report_downloads (job_id);

create index if not exists idx_subscription_events_brief_subscription_id
  on public.subscription_events (brief_subscription_id);

create index if not exists idx_subscription_events_brief_type_id
  on public.subscription_events (brief_type_id);
