-- 2026-05-05: AI RFP analysis service
-- 회원 전용 무료 RFP 분석 이력, 리포트 다운로드 이력, private storage bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rfp-analysis',
  'rfp-analysis',
  false,
  52428800,
  array['application/pdf', 'text/html']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.rfp_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'created'
    check (status in ('created', 'extracting', 'analyzing', 'rendering', 'completed', 'failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  step text null,
  rfp_file_name text not null,
  rfp_file_path text not null,
  rfp_file_size bigint not null check (rfp_file_size > 0),
  task_file_name text null,
  task_file_path text null,
  task_file_size bigint null check (task_file_size is null or task_file_size > 0),
  project_title text null,
  result_json jsonb null,
  report_html_path text null,
  error_message text null,
  openai_response_id text null,
  source_page_count integer null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rfp_analysis_jobs_user_created
  on public.rfp_analysis_jobs (user_id, created_at desc);

create index if not exists idx_rfp_analysis_jobs_created
  on public.rfp_analysis_jobs (created_at desc);

create index if not exists idx_rfp_analysis_jobs_status_created
  on public.rfp_analysis_jobs (status, created_at desc);

create table if not exists public.rfp_analysis_report_downloads (
  id bigserial primary key,
  job_id uuid not null references public.rfp_analysis_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create index if not exists idx_rfp_analysis_downloads_user_downloaded
  on public.rfp_analysis_report_downloads (user_id, downloaded_at desc);

create index if not exists idx_rfp_analysis_downloads_job
  on public.rfp_analysis_report_downloads (job_id);

alter table public.rfp_analysis_jobs enable row level security;
alter table public.rfp_analysis_report_downloads enable row level security;

drop policy if exists "Users can view own RFP analysis jobs" on public.rfp_analysis_jobs;
create policy "Users can view own RFP analysis jobs"
  on public.rfp_analysis_jobs for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can view own RFP report downloads" on public.rfp_analysis_report_downloads;
create policy "Users can view own RFP report downloads"
  on public.rfp_analysis_report_downloads for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "rfp_analysis_owner_insert" on storage.objects;
create policy "rfp_analysis_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rfp-analysis'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "rfp_analysis_owner_select" on storage.objects;
create policy "rfp_analysis_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'rfp-analysis'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "rfp_analysis_owner_delete" on storage.objects;
create policy "rfp_analysis_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rfp-analysis'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.set_rfp_analysis_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rfp_analysis_jobs_updated_at on public.rfp_analysis_jobs;
create trigger trg_rfp_analysis_jobs_updated_at
before update on public.rfp_analysis_jobs
for each row execute function public.set_rfp_analysis_jobs_updated_at();
