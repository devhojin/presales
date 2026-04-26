-- morning-brief 초기 스키마
-- 적용 대상: Supabase project ynvirceyybekzyqbzbxz (morning-brief)
-- 작성: 2026-04-26

create extension if not exists "pgcrypto";

-- ============================================================================
-- subscribers : 사람 단위 마스터
-- ============================================================================
create table if not exists subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text,
  status          text not null default 'active' check (status in ('active','unsubscribed','bounced')),
  token           text not null unique,
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_sent_at    timestamptz,
  send_count      int not null default 0,
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists subscribers_status_idx on subscribers (status);
create index if not exists subscribers_email_lower_idx on subscribers (lower(email));

-- ============================================================================
-- subscriber_sources : 어느 사이트에서 왔는지 (1:N)
-- ============================================================================
create table if not exists subscriber_sources (
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  source        text not null check (source in ('presales','spc','maruai','admin','import')),
  added_at      timestamptz not null default now(),
  primary key (subscriber_id, source)
);

create index if not exists subscriber_sources_source_idx on subscriber_sources (source);

-- ============================================================================
-- news_items : 수집된 뉴스 원본
-- ============================================================================
create table if not exists news_items (
  id            uuid primary key default gen_random_uuid(),
  collected_at  timestamptz not null default now(),
  pub_date      timestamptz,
  category      text not null,
  domain        text,
  title         text not null,
  source_media  text,
  url           text not null,
  url_hash      text not null unique,
  summary       text,
  raw           jsonb,
  used_in_brief uuid
);

create index if not exists news_items_collected_at_idx on news_items (collected_at desc);
create index if not exists news_items_category_idx on news_items (category);
create index if not exists news_items_domain_idx on news_items (domain);

-- ============================================================================
-- briefs : 일자별 발송 묶음
-- ============================================================================
create table if not exists briefs (
  id              uuid primary key default gen_random_uuid(),
  brief_date      date not null unique,
  status          text not null default 'pending' check (status in ('pending','collecting','ready','sending','sent','failed')),
  news_count      int not null default 0,
  recipient_count int not null default 0,
  sent_count      int not null default 0,
  failed_count    int not null default 0,
  subject         text,
  html_body       text,
  started_at      timestamptz,
  finished_at     timestamptz,
  error           text
);

create index if not exists briefs_status_idx on briefs (status);

-- 외래키 (news_items → briefs)
alter table news_items
  drop constraint if exists news_items_used_in_brief_fkey;
alter table news_items
  add constraint news_items_used_in_brief_fkey
  foreign key (used_in_brief) references briefs(id) on delete set null;

-- ============================================================================
-- brief_sends : 구독자 × 브리프 발송 결과
-- ============================================================================
create table if not exists brief_sends (
  id            uuid primary key default gen_random_uuid(),
  brief_id      uuid not null references briefs(id) on delete cascade,
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  email         text not null,
  status        text not null default 'pending' check (status in ('pending','sent','failed','bounced')),
  sent_at       timestamptz,
  error         text,
  unique (brief_id, subscriber_id)
);

create index if not exists brief_sends_brief_idx on brief_sends (brief_id);
create index if not exists brief_sends_status_idx on brief_sends (status);
