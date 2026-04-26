-- 채팅 상담: Anthropic Fin AI Agent 패턴 적용
--   1. 비회원도 이메일 제공 가능 (선택) → 관리자 답변 시 메일 알림 수신
--   2. 관리자 → 사용자 방향 알림 중복 방지를 위한 마지막 알림 타임스탬프
--
-- 적용 안전성: 두 컬럼 모두 nullable 추가만 하므로 기존 데이터/쿼리 영향 없음

alter table public.chat_rooms
  add column if not exists guest_email text,
  add column if not exists last_user_notified_at timestamptz;

-- 이메일 형식 완만한 검증 (text 컬럼이지만 잘못된 값 진입 억제)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_rooms_guest_email_format_chk'
  ) then
    alter table public.chat_rooms
      add constraint chat_rooms_guest_email_format_chk
      check (guest_email is null or guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  end if;
end $$;

comment on column public.chat_rooms.guest_email is
  '비회원 답변 알림 수신용 이메일. null 허용. 로그인 유저는 profiles.email 사용';
comment on column public.chat_rooms.last_user_notified_at is
  '관리자 답변 → 사용자 이메일 알림 마지막 발송 시각. 1시간 쿨다운으로 스팸 방지';
