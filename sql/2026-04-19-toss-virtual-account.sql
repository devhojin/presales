-- 토스 가상계좌 + 현금영수증 자동 발급(C안) 지원 컬럼 추가
-- 적용: Supabase Dashboard > SQL Editor 에서 전체 실행

-- 1) orders 에 가상계좌/현금영수증 메타 컬럼 추가
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS virtual_account TEXT,
  ADD COLUMN IF NOT EXISTS virtual_account_bank TEXT,
  ADD COLUMN IF NOT EXISTS virtual_account_due TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cash_receipt_url TEXT;

-- 2) status CHECK 에 pending_transfer 이미 포함되어 있음 (task #3 완료)
--    확인용: 아무 조작 없음
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid='public.orders'::regclass AND contype='c';

-- 3) 간단 인덱스: webhook 처리 시 orderId/paymentKey 로 자주 조회
CREATE INDEX IF NOT EXISTS idx_orders_payment_key
  ON public.orders(payment_key)
  WHERE payment_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders(status, created_at DESC);

-- 완료 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='orders' AND table_schema='public'
  AND column_name IN ('virtual_account','virtual_account_bank','virtual_account_due','cash_receipt_url');
