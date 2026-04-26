-- 2026-04-22 Storage 버킷 RLS 정책 강화 (Round 4 자율 감사 산출)
--
-- 배경:
--   1) consulting-files 버킷 SELECT 정책이 `bucket_id = 'consulting-files'` 만 있어
--      누구나 SELECT 가능. 버킷이 public=true 라 실제로는 공용 URL 로 anonymous 접근됨.
--      비회원 컨설팅 문의 시 업로드되는 PII(사업자등록증/재무제표 등) URL 노출 리스크.
--   2) chat-files SELECT 정책의 `(auth.role() = 'authenticated') OR (bucket_id = 'chat-files')`
--      뒤 조건이 항상 TRUE — 정책 문구 자체 결함.
--
-- 이 migration 은 "RLS policy 자체를 정리" 하는 1차 조치.
-- 버킷 public flag 를 false 로 전환하려면 기존 public URL 들이 깨지므로
-- **별도 리팩터** 필요(getPublicUrl → createSignedUrl). 이 migration 만으로는
-- 버킷이 여전히 public=true 이므로 RLS 가 무시되고 외부 노출 리스크는 남음.
-- 호진 action 으로 기록됨: 리팩터 후 버킷 public=false 로 전환.

-- 1) consulting-files: SELECT 는 관리자만. INSERT 는 비회원 문의 폼 유지용으로 그대로.
drop policy if exists "Consulting files public read" on storage.objects;
create policy "Consulting files admin read"
on storage.objects for select
using (
  bucket_id = 'consulting-files'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- 2) chat-files: SELECT 정책에서 항상참 조건 제거.
--    인증 사용자 OR 관리자 OR (방 소유자: user_id 일치 또는 service_role 경유) 만.
drop policy if exists "Chat files authenticated read" on storage.objects;
create policy "Chat files scoped read"
on storage.objects for select
using (
  bucket_id = 'chat-files'
  and (
    -- 관리자
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
    -- 회원 본인 방의 파일 (경로 첫 세그먼트 = room_id)
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id::text = (storage.foldername(objects.name))[1]
        and cr.user_id = auth.uid()
    )
  )
);
-- 비회원 guest 는 service_role 경유 signed URL API 로 접근 (별도 리팩터 필요).
