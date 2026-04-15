-- ============================================
-- products 테이블 누락 컬럼 보강
-- 2026-04-15
-- ============================================
-- 배경: 관리자 상품 수정 페이지에서 '저장 오류: Could not find the badge_best column of products
--       in the schema cache [PGRST204]' 발생. UI 는 있는데 DB 컬럼이 없는 케이스.
--       admin UI 가 쓰는 컬럼 중 products 테이블에 없을 수 있는 것들을 일괄 보강.

ALTER TABLE products
  -- 배지
  ADD COLUMN IF NOT EXISTS badge_new  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_best BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_sale BOOLEAN DEFAULT false,

  -- 상세 내용 (배열/객체)
  ADD COLUMN IF NOT EXISTS overview   JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS features   JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specs      JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS file_types JSONB   DEFAULT '[]'::jsonb,

  -- 기타 메타
  ADD COLUMN IF NOT EXISTS document_orientation TEXT   DEFAULT 'landscape',
  ADD COLUMN IF NOT EXISTS seller               TEXT,

  -- 미리보기 관련 (이미 있을 가능성 큼, 안전하게 IF NOT EXISTS)
  ADD COLUMN IF NOT EXISTS preview_pdf_url     TEXT,
  ADD COLUMN IF NOT EXISTS preview_clear_pages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_blur_pages  INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS preview_note        TEXT,

  -- 관련 상품
  ADD COLUMN IF NOT EXISTS related_product_ids INTEGER[] DEFAULT '{}';

-- PostgREST 스키마 캐시 갱신 (Supabase 는 NOTIFY pgrst,'reload schema' 로 반영)
NOTIFY pgrst, 'reload schema';
