# 모닝브리프 스키마

> Supabase 프로젝트: `morning-brief` (ref: `ynvirceyybekzyqbzbxz`)

## 테이블 개요

| 테이블 | 목적 | 1행 = |
|--------|------|-------|
| `subscribers` | 사람 단위 마스터 | 이메일 1개 |
| `subscriber_sources` | 어느 사이트에서 왔는지 (1:N) | (이메일, 사이트) 쌍 |
| `news_items` | 수집된 뉴스 원본 | 기사 1건 |
| `briefs` | 일자별 발송 묶음 | 발송 1회 (날짜 단위) |
| `brief_sends` | 구독자 × 브리프 | 개별 발송 결과 1건 |

## subscribers

```sql
create table subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  status        text not null default 'active' check (status in ('active','unsubscribed','bounced')),
  token         text not null unique,                       -- 수신거부 토큰
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_sent_at  timestamptz,
  send_count    int not null default 0,
  metadata      jsonb not null default '{}'::jsonb
);

create index subscribers_status_idx on subscribers (status);
```

**규칙:**
- email은 lowercase 정규화
- token은 16바이트 base64url
- 같은 이메일이 여러 사이트에서 가입해도 1행만 유지
- 수신거부는 사람 단위 (소스 무관, 한 번 거부하면 전체 거부)

## subscriber_sources

```sql
create table subscriber_sources (
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  source        text not null check (source in ('presales','spc','maruai','admin','import')),
  added_at      timestamptz not null default now(),
  primary key (subscriber_id, source)
);

create index subscriber_sources_source_idx on subscriber_sources (source);
```

**용도:** 어느 사이트에서 얼마나 가입했는지 통계, 출처 표시.

## news_items

```sql
create table news_items (
  id            uuid primary key default gen_random_uuid(),
  collected_at  timestamptz not null default now(),
  pub_date      timestamptz,
  category      text not null,         -- 'AI'/'스마트팩토리'/'경제'/'IoT'/'로봇'
  domain        text,                   -- 자동 태깅: '스마트시티' 등 8개
  title         text not null,
  source_media  text,                   -- 보도매체
  url           text not null,
  url_hash      text not null,          -- sha256(url) — 중복 방지
  summary       text,                   -- AI dedup 후 요약
  raw           jsonb,                  -- 원본 RSS 항목
  used_in_brief uuid references briefs(id),
  unique (url_hash)
);

create index news_items_collected_at_idx on news_items (collected_at desc);
create index news_items_category_idx on news_items (category);
create index news_items_domain_idx on news_items (domain);
```

## briefs

```sql
create table briefs (
  id            uuid primary key default gen_random_uuid(),
  brief_date    date not null unique,    -- YYYY-MM-DD (KST 기준)
  status        text not null default 'pending' check (status in ('pending','collecting','ready','sending','sent','failed')),
  news_count    int not null default 0,
  recipient_count int not null default 0,
  sent_count    int not null default 0,
  failed_count  int not null default 0,
  subject       text,
  html_body     text,
  started_at    timestamptz,
  finished_at   timestamptz,
  error         text
);

create index briefs_status_idx on briefs (status);
```

## brief_sends

```sql
create table brief_sends (
  id            uuid primary key default gen_random_uuid(),
  brief_id      uuid not null references briefs(id) on delete cascade,
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  email         text not null,           -- 발송 시점 스냅샷
  status        text not null default 'pending' check (status in ('pending','sent','failed','bounced')),
  sent_at       timestamptz,
  error         text,
  unique (brief_id, subscriber_id)
);

create index brief_sends_brief_idx on brief_sends (brief_id);
create index brief_sends_status_idx on brief_sends (status);
```

## RLS 정책 요약

- `subscribers`, `subscriber_sources`: anon 키로 INSERT 가능 (구독), 그 외 (SELECT/UPDATE/DELETE)는 service_role만
- `news_items`, `briefs`, `brief_sends`: service_role 전용 (Vercel Cron만 접근)
- 수신거부는 anon 키 + 토큰 일치로 UPDATE 허용 (RLS WITH CHECK)
