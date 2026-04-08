-- =============================================
-- 할인 상품 매칭 (Product Discount Matches)
-- PDF 구매 → PPT 할인 등 상품 간 할인 연동
-- 2026-04-08
-- =============================================

CREATE TABLE IF NOT EXISTS product_discount_matches (
  id bigserial PRIMARY KEY,
  source_product_id bigint REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  target_product_id bigint REFERENCES products(id) ON DELETE CASCADE NOT NULL,

  -- 할인 정보
  -- 'auto': 소스 상품 가격만큼 자동 할인
  -- 'manual': discount_amount 값으로 할인
  discount_type varchar(20) NOT NULL DEFAULT 'manual' CHECK (discount_type IN ('auto', 'manual')),
  discount_amount bigint DEFAULT 0 NOT NULL,

  -- 상태
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- 같은 소스→타겟 쌍은 1개만 허용
  UNIQUE(source_product_id, target_product_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_discount_matches_source ON product_discount_matches(source_product_id);
CREATE INDEX IF NOT EXISTS idx_discount_matches_target ON product_discount_matches(target_product_id);
CREATE INDEX IF NOT EXISTS idx_discount_matches_active ON product_discount_matches(is_active);

-- RLS
ALTER TABLE product_discount_matches ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성 매칭 조회 가능 (할인 표시용)
CREATE POLICY "Anyone can read active discount matches"
  ON product_discount_matches FOR SELECT USING (is_active = true);

-- 관리자만 전체 조회/쓰기
CREATE POLICY "Admins can manage all discount matches"
  ON product_discount_matches FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- order_items에 할인 정보 컬럼 추가
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS original_price bigint;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_amount bigint DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_reason varchar(20);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_source_product_id bigint;
