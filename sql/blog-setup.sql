-- =============================================
-- 블로그 시스템 (blog_posts)
-- 2026-04-08
-- =============================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,                          -- 요약 (리스트에 표시)
  content_html text NOT NULL,            -- 본문 HTML (TipTap 에디터)
  thumbnail_url text,                    -- 썸네일 이미지
  tags text[] DEFAULT '{}',              -- 해시태그 배열
  category text DEFAULT '일반',           -- 카테고리
  author text DEFAULT '프리세일즈 팀',     -- 작성자
  is_published boolean DEFAULT false,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING gin(tags);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 공개된 글은 누구나 조회
CREATE POLICY "Anyone can read published posts"
  ON blog_posts FOR SELECT USING (is_published = true);

-- 관리자만 전체 관리
CREATE POLICY "Admins can manage all posts"
  ON blog_posts FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
