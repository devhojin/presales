-- ============================================
-- PPT 상품 미리보기 PDF 누락 감사
-- 2026-04-14 · 사용자 요구: "모든 PPT는 PDF 미리보기 필수"
-- ============================================

-- 1) PPT 포맷인데 preview_pdf_url이 비어있는 상품
SELECT
  id,
  title,
  price,
  format,
  file_types,
  preview_pdf_url
FROM products
WHERE (
    format ILIKE '%ppt%'
    OR 'ppt' = ANY(file_types)
    OR 'pptx' = ANY(file_types)
  )
  AND (preview_pdf_url IS NULL OR preview_pdf_url = '')
ORDER BY price DESC;

-- 2) 가격 정책 검증: 공식가 PPT 99,000원 / PDF 49,000원 / 업그레이드 50,000원
SELECT
  id,
  title,
  price,
  format,
  file_types,
  CASE
    WHEN format ILIKE '%ppt%' AND price <> 99000 THEN '⚠ PPT인데 99,000원 아님'
    WHEN format ILIKE '%pdf%' AND price <> 49000 THEN '⚠ PDF인데 49,000원 아님'
    ELSE 'OK'
  END AS price_check
FROM products
WHERE is_active = true
ORDER BY price_check DESC, price DESC;

-- 3) PPT 상품은 있는데 같은 주제의 PDF 상품이 없는 케이스 (업그레이드 대상 매핑 검증)
-- discount_matches 테이블을 사용한다면 그쪽 데이터 확인 필요
SELECT
  p_ppt.id AS ppt_id,
  p_ppt.title AS ppt_title,
  p_ppt.price AS ppt_price
FROM products p_ppt
WHERE p_ppt.is_active = true
  AND p_ppt.format ILIKE '%ppt%'
  AND NOT EXISTS (
    SELECT 1 FROM products p_pdf
    WHERE p_pdf.is_active = true
      AND p_pdf.format ILIKE '%pdf%'
      AND similarity(p_pdf.title, p_ppt.title) > 0.4
  )
ORDER BY p_ppt.title;
-- 주의: similarity()는 pg_trgm 확장 필요. 없으면 `CREATE EXTENSION IF NOT EXISTS pg_trgm;` 실행
