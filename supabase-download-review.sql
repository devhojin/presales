-- =============================================
-- 파일 다운로드 로그 + 리뷰 시스템 테이블
-- =============================================

-- 1. 다운로드 로그
CREATE TABLE IF NOT EXISTS download_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id INT NOT NULL REFERENCES products(id),
  file_name TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own downloads" ON download_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own downloads" ON download_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view download logs" ON download_logs FOR SELECT USING (TRUE);

-- 2. 리뷰 테이블
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id INT NOT NULL REFERENCES products(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  image_urls TEXT[] DEFAULT '{}',
  helpful_count INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published reviews" ON reviews FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage reviews" ON reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. 리뷰 도움이 됐어요 (helpful)
CREATE TABLE IF NOT EXISTS review_helpful (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view helpful" ON review_helpful FOR SELECT USING (TRUE);
CREATE POLICY "Users can toggle helpful" ON review_helpful FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove helpful" ON review_helpful FOR DELETE USING (auth.uid() = user_id);

-- 4. products 테이블에 리뷰 통계 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_avg DECIMAL(2,1) DEFAULT 0;

-- 5. 리뷰 이미지 저장소
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('review-images', 'review-images', TRUE, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view review images" ON storage.objects FOR SELECT USING (bucket_id = 'review-images');
CREATE POLICY "Users can upload review images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'review-images');
