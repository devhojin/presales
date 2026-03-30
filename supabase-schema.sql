-- =============================================
-- PRESALES DB Schema
-- Supabase SQL Editor에서 실행해주세요
-- =============================================

-- 1. 프로필 (회원 정보)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  company TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 상품 카테고리
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 상품
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL DEFAULT 0,
  original_price INT DEFAULT 0,
  category_id INT REFERENCES categories(id),
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'premium', 'package')),
  format TEXT,
  pages INT,
  file_size TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 상품 파일 (다운로드용)
CREATE TABLE product_files (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 주문
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  total_amount INT NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_key TEXT,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 주문 항목
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  price INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 컨설팅 신청
CREATE TABLE consulting_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  package_type TEXT NOT NULL CHECK (package_type IN ('spot', 'review', 'project')),
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 장바구니
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- =============================================
-- 초기 카테고리 데이터
-- =============================================
INSERT INTO categories (name, slug, sort_order) VALUES
  ('기술제안서', 'tech-proposal', 1),
  ('입찰 가이드', 'bid-guide', 2),
  ('발표자료', 'presentation', 3),
  ('가격제안', 'price-proposal', 4),
  ('풀 패키지', 'full-package', 5),
  ('사업계획서', 'business-plan', 6);

-- =============================================
-- 초기 상품 데이터 (프로토타입 기준 8개)
-- =============================================
INSERT INTO products (title, description, price, original_price, category_id, tier, format, pages, file_size, thumbnail_url, tags, is_published) VALUES
  ('공공기관 기술제안서 표준 템플릿 (IT/SW)', '공공기관 및 지자체 IT/SW 사업 입찰에 최적화된 기술제안서 표준 양식입니다. 정성평가 항목별 작성 가이드와 실제 수주 성공 사례 분석이 포함되어 있습니다.', 89000, 130000, 1, 'premium', 'PPTX, HWP', 55, '18MB', 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['공공기관','나라장터','IT사업','기술평가','정성평가'], TRUE),
  ('나라장터 입찰 서류 체크리스트 + 가이드', '처음 공공입찰에 참여하는 기업을 위한 서류 준비 체크리스트입니다. 입찰 공고 분석법, 필수 서류 목록, 주의사항을 한눈에 정리했습니다.', 35000, 50000, 2, 'basic', 'PDF, EXCEL', 15, '3MB', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['입찰서류','체크리스트','나라장터','처음입찰','가이드'], TRUE),
  ('정량평가 + 정성평가 대응 통합 제안서 (건설/시설)', '건설·시설관리 분야 공공입찰 제안서입니다. 정량평가와 정성평가를 모두 커버하는 통합 구조입니다.', 120000, 180000, 1, 'premium', 'PPTX, HWP', 70, '25MB', 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['건설','시설관리','정량평가','정성평가','통합제안'], TRUE),
  ('발표 PT 시나리오 + 슬라이드 양식 (공공사업)', '공공사업 제안 발표(PT)용 시나리오와 슬라이드 표준 양식입니다. 3분/10분 버전별 스크립트 구조가 포함됩니다.', 55000, 80000, 3, 'basic', 'PPTX', 25, '8MB', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['발표PT','시나리오','슬라이드','프레젠테이션'], TRUE),
  ('원가계산서 + 가격제안서 모델 (용역/SW)', '공공사업 가격제안에 필요한 원가계산서, 투입인력 산출, SW사업 대가산정 양식을 제공합니다.', 65000, 90000, 4, 'basic', 'EXCEL, HWP', 10, '4MB', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['원가계산','가격제안','대가산정','기능점수'], TRUE),
  ('[패키지] 공공입찰 풀세트: 기술제안 + 발표PT + 가격제안 + 30분 컨설팅', '공공입찰에 필요한 모든 문서를 한 번에. 30분 화상 컨설팅이 포함된 프리미엄 패키지입니다.', 250000, 380000, 5, 'package', 'PPTX, HWP, EXCEL', 90, '45MB', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['풀세트','패키지','컨설팅포함','올인원','베스트'], TRUE),
  ('공공 SI/SM 사업 제안서 템플릿', '시스템통합(SI) 및 시스템운영(SM) 공공사업 제안서 전문 템플릿입니다.', 95000, 140000, 1, 'premium', 'PPTX, HWP', 60, '20MB', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['SI','SM','시스템통합','운영유지보수','WBS'], TRUE),
  ('정부 R&D 과제 사업계획서 (KEIT/NIPA/NIA)', 'KEIT, NIPA, NIA 등 정부 R&D 과제 신청서 작성 템플릿입니다.', 110000, 160000, 6, 'premium', 'HWP, PDF', 40, '10MB', 'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['정부R&D','KEIT','NIPA','NIA','연구과제'], TRUE);

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================

-- 프로필
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 상품 (누구나 조회 가능, 관리자만 수정)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published products" ON products FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admin can do anything with products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 카테고리 (누구나 조회)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 주문 (본인 것만)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can update orders" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 주문 항목
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can create order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admin can view all order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 컨설팅 신청
ALTER TABLE consulting_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create consulting request" ON consulting_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can view own requests" ON consulting_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage consulting requests" ON consulting_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 장바구니
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- 상품 파일 (구매자 + 관리자만)
ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view purchased files" ON product_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = product_files.product_id
    AND o.user_id = auth.uid()
    AND o.status = 'paid'
  )
);
CREATE POLICY "Admin can manage product files" ON product_files FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 자동 프로필 생성 함수
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Storage 버킷 (상품 파일 + 썸네일)
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-thumbnails', 'product-thumbnails', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-files', 'product-files', FALSE);

-- 썸네일은 누구나 조회
CREATE POLICY "Anyone can view thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'product-thumbnails');
CREATE POLICY "Admin can upload thumbnails" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'product-thumbnails' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 상품 파일은 관리자만 업로드, 구매자만 다운로드
CREATE POLICY "Admin can upload product files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'product-files' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can manage product files storage" ON storage.objects FOR ALL USING (
  bucket_id = 'product-files' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
