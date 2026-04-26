-- ============================================================================
-- 2026-04-22: chat-files / consulting-files 버킷 public=false 전환
-- ============================================================================
-- 배경:
--   Round 4~5 감사에서 Storage RLS 항상참 조건을 tighten 했지만,
--   버킷 자체가 public=true 인 동안에는 `/storage/v1/object/public/{bucket}/{path}`
--   URL 이 여전히 RLS 와 무관하게 외부에 노출된다.
--   실제 코드는 이미 `/api/storage/signed-url` 을 거쳐 signed URL 만 사용하고
--   DB 에 저장되는 값도 path (또는 legacy public URL — extractStoragePath 에서
--   역호환 처리) 이므로 public=false 전환만으로 공개 노출이 차단된다.
--
-- 사전 점검 (2026-04-22 기준):
--   - chat_messages.file_url 에 /storage/v1/object/public/chat-files/ 포함 행: 0
--   - consulting_requests.message 에 /storage/v1/object/public/consulting-files/ 포함 행: 0
--   - storage.objects { chat-files: 1, consulting-files: 0 }
--   => 전환으로 깨지는 기존 데이터 없음.
--
-- 적용 후 확인:
--   SELECT id, public FROM storage.buckets WHERE id IN ('chat-files','consulting-files');
--   => 둘 다 public=false 여야 함.
-- ============================================================================

UPDATE storage.buckets
   SET public = false
 WHERE id IN ('chat-files', 'consulting-files');
