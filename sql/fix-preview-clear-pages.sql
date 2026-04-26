-- preview_clear_pages가 20을 초과하는 상품 수정
-- 2026-04-16: 선명 페이지 최대 20장 제한 적용

UPDATE products
SET preview_clear_pages = LEAST(preview_clear_pages, 20)
WHERE preview_clear_pages > 20;

-- preview_blur_pages도 최대 5로 제한
UPDATE products
SET preview_blur_pages = LEAST(preview_blur_pages, 5)
WHERE preview_blur_pages > 5;

-- 확인
SELECT id, title, preview_clear_pages, preview_blur_pages, preview_pdf_url
FROM products
WHERE preview_pdf_url IS NOT NULL AND preview_pdf_url != ''
ORDER BY preview_clear_pages DESC;
