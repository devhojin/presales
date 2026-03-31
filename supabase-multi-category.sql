-- 상품 다중 카테고리 지원
-- category_id (단일) → category_ids (배열) 변환

-- 1. 새 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids INT[] DEFAULT '{}';

-- 2. 기존 category_id 데이터를 category_ids로 마이그레이션
UPDATE products SET category_ids = ARRAY[category_id] WHERE category_id IS NOT NULL AND (category_ids IS NULL OR category_ids = '{}');

-- 3. 확인
SELECT id, title, category_id, category_ids FROM products LIMIT 10;
