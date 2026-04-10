-- ============================================
-- user01@test.com 샘플 주문 12건 생성
-- 2026-04-10
-- 주의: 참조 무결성 보장 (주문→order_items→products 모두 연결)
-- ============================================

DO $$
DECLARE
  target_user_id UUID;
  selected_products RECORD;
  new_order_id BIGINT;
  order_items_count INT;
  order_total INT;
  i INT;
  j INT;
  days_ago INT;
  order_status TEXT;
  product_ids INT[];
  picked_ids INT[];
  picked_id INT;
BEGIN
  -- 1) 타겟 사용자 확인
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'user01@test.com' LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user01@test.com 사용자가 존재하지 않습니다';
  END IF;

  -- 2) 기존 테스트 데이터 제거 (중복 방지)
  DELETE FROM download_logs WHERE user_id = target_user_id;
  DELETE FROM orders WHERE user_id = target_user_id;

  -- 3) 유료 상품 풀 확보 (다양한 카테고리에서)
  SELECT ARRAY(
    SELECT id FROM products
    WHERE is_published = true AND is_free = false AND price > 0
    ORDER BY RANDOM()
    LIMIT 20
  ) INTO product_ids;

  IF array_length(product_ids, 1) < 12 THEN
    RAISE EXCEPTION '유료 상품이 12개 미만입니다 (현재: %)', array_length(product_ids, 1);
  END IF;

  -- 4) 주문 12건 생성
  FOR i IN 1..12 LOOP
    -- 주문당 1~3개 상품, 시기 분산, 상태 분산
    order_items_count := 1 + (RANDOM() * 2)::INT;
    days_ago := (RANDOM() * 90)::INT;  -- 최근 90일 내

    -- 상태 분포: 9건 paid, 2건 cancelled, 1건 pending
    IF i <= 9 THEN
      order_status := 'paid';
    ELSIF i <= 11 THEN
      order_status := 'cancelled';
    ELSE
      order_status := 'pending';
    END IF;

    -- 이번 주문에 포함할 상품 선택 (중복 방지)
    picked_ids := ARRAY[]::INT[];
    FOR j IN 1..order_items_count LOOP
      LOOP
        picked_id := product_ids[1 + (RANDOM() * (array_length(product_ids, 1) - 1))::INT];
        EXIT WHEN NOT (picked_id = ANY(picked_ids));
      END LOOP;
      picked_ids := array_append(picked_ids, picked_id);
    END LOOP;

    -- 총액 계산
    SELECT COALESCE(SUM(price), 0) INTO order_total
    FROM products WHERE id = ANY(picked_ids);

    -- 주문 insert
    INSERT INTO orders (user_id, total_amount, status, created_at, paid_at, payment_method)
    VALUES (
      target_user_id,
      order_total,
      order_status,
      NOW() - (days_ago || ' days')::INTERVAL,
      CASE WHEN order_status = 'paid' THEN NOW() - (days_ago || ' days')::INTERVAL + INTERVAL '5 minutes' ELSE NULL END,
      'card'
    )
    RETURNING id INTO new_order_id;

    -- order_items insert
    FOR selected_products IN
      SELECT id, price FROM products WHERE id = ANY(picked_ids)
    LOOP
      INSERT INTO order_items (order_id, product_id, price, original_price)
      VALUES (new_order_id, selected_products.id, selected_products.price, selected_products.price);

      -- 5) paid 주문의 상품에 대해 다운로드 이력 생성 (1~4회 랜덤)
      IF order_status = 'paid' THEN
        FOR j IN 1..(1 + (RANDOM() * 3)::INT) LOOP
          INSERT INTO download_logs (user_id, product_id, file_name, downloaded_at)
          SELECT
            target_user_id,
            selected_products.id,
            COALESCE(p.title, '파일') || '.pdf',
            NOW() - (days_ago || ' days')::INTERVAL + (j || ' hours')::INTERVAL
          FROM products p WHERE p.id = selected_products.id;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'user01@test.com 샘플 데이터 생성 완료: 주문 12건';
END $$;

-- 결과 확인
SELECT
  (SELECT COUNT(*) FROM orders WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user01@test.com')) AS 주문수,
  (SELECT COUNT(*) FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user01@test.com'))) AS 주문아이템수,
  (SELECT COUNT(*) FROM download_logs WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user01@test.com')) AS 다운로드이력수,
  (SELECT SUM(total_amount) FROM orders WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user01@test.com') AND status = 'paid') AS 실결제총액;
