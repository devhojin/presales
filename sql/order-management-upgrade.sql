-- =============================================
-- 주문관리 업그레이드 (SPC 레퍼런스 적용)
-- 2026-04-08
-- =============================================

-- 1. 주문번호 자동생성 함수
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := (floor(random() * 9) + 1)::INT::TEXT
      || lpad(floor(random() * 10000000000000)::BIGINT::TEXT, 13, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM orders WHERE order_number = candidate
    );
  END LOOP;

  NEW.order_number := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주문번호 컬럼 추가 (없으면)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- 트리거: 주문 생성 시 자동 번호 부여
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- 기존 주문에 번호 소급 적용
DO $$
DECLARE
  order_row RECORD;
  candidate TEXT;
BEGIN
  FOR order_row IN SELECT id FROM orders WHERE order_number IS NULL LOOP
    LOOP
      candidate := (floor(random() * 9) + 1)::INT::TEXT
        || lpad(floor(random() * 10000000000000)::BIGINT::TEXT, 13, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM orders WHERE order_number = candidate
      );
    END LOOP;

    UPDATE orders
    SET order_number = candidate
    WHERE id = order_row.id;
  END LOOP;
END $$;

-- 2. 관리자 메모 테이블
CREATE TABLE IF NOT EXISTS order_memos (
  id bigserial PRIMARY KEY,
  order_id bigint REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid REFERENCES auth.users(id),
  admin_name text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order memos"
  ON order_memos FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. 다운로드 이력에 사용자명 컬럼 추가
ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS user_name text;

-- 4. orders에 결제수단 컬럼 추가 (없으면)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_key text;
