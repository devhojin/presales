-- 2026-04-19: Supabase Performance Advisor unindexed_foreign_keys 17건 해소
-- FK 컬럼에 covering index 추가. CREATE INDEX IF NOT EXISTS 로 재실행 안전.
-- 적용 경로: Supabase Management API /database/query (애란이 자동 적용)

CREATE INDEX IF NOT EXISTS idx_announcement_logs_announcement_id ON public.announcement_logs (announcement_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_chat_payment_requests_admin_id ON public.chat_payment_requests (admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_payment_requests_message_id ON public.chat_payment_requests (message_id);
CREATE INDEX IF NOT EXISTS idx_consulting_requests_user_id ON public.consulting_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_order_id ON public.coupon_uses (order_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_product_id ON public.download_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_user_id ON public.download_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON public.orders (coupon_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_product_files_product_id ON public.product_files (product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON public.review_helpful (review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_used_order_id ON public.user_coupons (used_order_id);
