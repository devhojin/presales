-- Reviews system tables and functions
-- Run this in Supabase SQL Editor

-- 1. Add review_count and review_avg to products (if not already present)
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_avg numeric(2,1) DEFAULT 0;

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id bigint REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pros text,
  cons text,
  image_urls text[] DEFAULT '{}',
  helpful_count integer DEFAULT 0,
  is_published boolean DEFAULT true,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Create review_helpful table
CREATE TABLE IF NOT EXISTS review_helpful (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_id bigint REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, review_id)
);

-- 4. RPC: increment helpful count
CREATE OR REPLACE FUNCTION increment_helpful(rid bigint)
RETURNS void AS $$
BEGIN
  UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. RPC: decrement helpful count
CREATE OR REPLACE FUNCTION decrement_helpful(rid bigint)
RETURNS void AS $$
BEGIN
  UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION increment_helpful(bigint) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION decrement_helpful(bigint) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_helpful(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_helpful(bigint) TO service_role;

-- 6. Create storage bucket for review images
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage policy: allow authenticated users to upload
CREATE POLICY "Users can upload review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-images');

-- 8. Public bucket URLs are readable without a broad storage.objects SELECT policy.

-- 9. RLS policies for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published reviews"
ON reviews FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can read all reviews"
ON reviews FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Users can insert own reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
ON reviews FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any review"
ON reviews FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 10. RLS policies for review_helpful
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own helpful votes"
ON review_helpful FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read helpful votes"
ON review_helpful FOR SELECT
USING (true);

-- 11. Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON review_helpful(review_id);
