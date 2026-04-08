-- sql/migrate-category-ids.sql
-- TODO: category_id → category_ids 마이그레이션
-- 현재 products 테이블에 category_id (단수)와 category_ids (배열)가 공존
-- 코드에서는 category_ids 우선, 없으면 category_id 사용
-- 향후 category_id 컬럼 제거 예정

-- Step 1: category_ids가 비어있는 행에 category_id 값 복사
-- UPDATE products SET category_ids = ARRAY[category_id] WHERE category_ids IS NULL OR array_length(category_ids, 1) IS NULL;

-- Step 2: 검증
-- SELECT id, title, category_id, category_ids FROM products WHERE category_ids IS NULL OR array_length(category_ids, 1) IS NULL;

-- Step 3: category_id 컬럼 제거 (검증 후)
-- ALTER TABLE products DROP COLUMN category_id;
