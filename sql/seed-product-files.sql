-- ============================================
-- 모든 게시중 상품에 샘플 파일 연결
-- 2026-04-10
-- ============================================

-- 기존 product_files 전체 제거 (테스트 데이터 정리)
DELETE FROM product_files;

-- 게시중인 모든 상품에 샘플 파일 레코드 생성
INSERT INTO product_files (product_id, file_url, file_name, file_size, created_at)
SELECT
  id,
  'https://vswkrbemigyclgjrpgqt.supabase.co/storage/v1/object/public/product-files/test_document.pdf',
  'test_document.pdf',
  500000,
  NOW()
FROM products
WHERE is_published = true;

-- 결과 확인
SELECT COUNT(*) AS 생성된_product_files_건수 FROM product_files;
