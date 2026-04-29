-- Optional local-site audit columns for Presales morning-brief applications.
-- The central source of truth is the standalone Morning Brief service.

alter table brief_subscribers add column if not exists central_subscriber_id uuid;
alter table brief_subscribers add column if not exists central_subscription_id uuid;
alter table brief_subscribers add column if not exists central_status text;
alter table brief_subscribers add column if not exists central_synced_at timestamptz;
alter table brief_subscribers add column if not exists source_member_state text not null default 'unknown';
alter table brief_subscribers add column if not exists source_user_id uuid;
