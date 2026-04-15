-- ============================================================
-- Supabase Storage 버킷 구조 및 RLS 정책
-- 2026-04-16
--
-- 발견된 버킷 목록 (코드 분석 기준):
--   1. product-files       - 구매자 다운로드용 실제 파일
--   2. product-thumbnails  - 상품 대표 이미지
--   3. product-previews    - PDF 미리보기 파일
--   4. chat-files          - 채팅 첨부파일
--   5. review-images       - 리뷰 첨부 이미지
--   6. business-certs      - 사업자등록증 (장바구니 업로드)
--   7. consulting-files    - 컨설팅 신청 첨부파일
-- ============================================================


-- ============================================================
-- 1. product-files (유료/무료 상품 다운로드 파일)
--    경로 패턴: products/{product_id}/{file_name}
--    접근: 서비스롤 전용 (서버사이드 서명 URL 발급)
--    공개: false (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-files',
  'product-files',
  false,
  104857600, -- 100MB
  NULL       -- 모든 MIME 허용 (PPT, PDF, HWP, XLS, ZIP 등)
)
ON CONFLICT (id) DO NOTHING;

-- RLS: 업로드는 관리자만 (서비스롤이 직접 처리하므로 anon/user 정책 불필요)
-- 서버에서 createSignedUrl()로 60초 서명 URL 생성 후 클라이언트에 전달
CREATE POLICY "product_files_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-files'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "product_files_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-files'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "product_files_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-files'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- 다운로드 SELECT는 서비스롤이 처리 (anon/authenticated SELECT 정책 없음)


-- ============================================================
-- 2. product-thumbnails (상품 대표 이미지)
--    경로 패턴: {product_id}/{timestamp}-{random}.{ext}
--                또는 temp/{timestamp}-{random}.{ext} (신규 상품 임시)
--    접근: 공개 읽기
--    공개: true (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-thumbnails',
  'product-thumbnails',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 관리자만 업로드/삭제
CREATE POLICY "product_thumbnails_admin_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-thumbnails'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "product_thumbnails_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "product_thumbnails_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-thumbnails'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- 공개 읽기 (public 버킷이므로 별도 SELECT 정책 불필요)


-- ============================================================
-- 3. product-previews (PDF 미리보기 파일)
--    경로 패턴: preview-{product_id}-{timestamp}.pdf
--    접근: 공개 읽기 (미리보기이므로 인증 불필요)
--    공개: true (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-previews',
  'product-previews',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 관리자만 업로드/삭제
CREATE POLICY "product_previews_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-previews'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "product_previews_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-previews'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

CREATE POLICY "product_previews_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-previews'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- 공개 읽기 (public 버킷이므로 별도 SELECT 정책 불필요)


-- ============================================================
-- 4. chat-files (채팅 첨부파일)
--    경로 패턴: {room_id}/{timestamp}_{uuid_short}.{ext}
--    접근: 공개 읽기 (채팅 내에서 URL로 노출)
--    공개: true (public)
--    제한: 10MB 이하, .exe/.bat 등 실행파일 차단 (서버 로직으로 처리)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760, -- 10MB
  NULL       -- MIME 제한은 서버 로직(isFileBlocked)에서 처리
)
ON CONFLICT (id) DO NOTHING;

-- 서비스롤이 업로드 (API Route에서 처리)
-- 공개 읽기 (public 버킷이므로 별도 SELECT 정책 불필요)
-- 관리자 삭제 정책
CREATE POLICY "chat_files_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );


-- ============================================================
-- 5. review-images (리뷰 첨부 이미지)
--    경로 패턴: {user_id}/{timestamp}-{random}.{ext}
--    접근: 공개 읽기
--    공개: true (public)
--    제한: 10MB 이하, image/* 만 허용
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 로그인 사용자만 업로드 (본인 폴더)
CREATE POLICY "review_images_user_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 관리자 또는 본인만 삭제
CREATE POLICY "review_images_owner_or_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- 공개 읽기 (public 버킷이므로 별도 SELECT 정책 불필요)


-- ============================================================
-- 6. business-certs (사업자등록증)
--    경로 패턴: {user_id}/{timestamp}-{sanitized_filename}
--    접근: private (서명 URL 60초, 관리자 열람)
--    공개: false (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-certs',
  'business-certs',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 로그인 사용자만 본인 폴더에 업로드
CREATE POLICY "business_certs_user_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-certs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 본인 또는 관리자만 읽기
CREATE POLICY "business_certs_owner_or_admin_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'business-certs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- 관리자만 삭제
CREATE POLICY "business_certs_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-certs'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );


-- ============================================================
-- 7. consulting-files (컨설팅 신청 첨부파일)
--    경로 패턴: {timestamp}_{filename} (consulting/page.tsx)
--    접근: private (관리자 열람, 서명 URL)
--    공개: false (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consulting-files',
  'consulting-files',
  false,
  20971520, -- 20MB
  NULL       -- PDF, 이미지, 문서 등 제한 없음
)
ON CONFLICT (id) DO NOTHING;

-- 로그인 사용자 업로드 허용 (컨설팅 신청 시)
CREATE POLICY "consulting_files_user_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'consulting-files');

-- 관리자만 읽기
CREATE POLICY "consulting_files_admin_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'consulting-files'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );

-- 관리자만 삭제
CREATE POLICY "consulting_files_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'consulting-files'
    AND (
      SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin'
  );


-- ============================================================
-- 버킷 요약
-- ============================================================
-- 버킷명              | 공개 | 최대크기 | 주요 경로 패턴
-- --------------------|------|----------|---------------------------
-- product-files       | N    | 100MB    | products/{id}/{file_name}
-- product-thumbnails  | Y    | 5MB      | {id}/{ts}-{rand}.{ext}
-- product-previews    | Y    | 50MB     | preview-{id}-{ts}.pdf
-- chat-files          | Y    | 10MB     | {room_id}/{ts}_{uuid}.{ext}
-- review-images       | Y    | 10MB     | {user_id}/{ts}-{rand}.{ext}
-- business-certs      | N    | 10MB     | {user_id}/{ts}-{filename}
-- consulting-files    | N    | 20MB     | {ts}_{filename}
-- ============================================================
