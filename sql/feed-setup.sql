-- ============================================
-- 프리세일즈 IT피드 테이블 설정
-- SPC 스타트업피드 시스템 이식
-- ============================================

-- 1. 피드 게시글 메인 테이블
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'news' CHECK (category IN ('bid','task','policy','news','event')),
  title TEXT NOT NULL,
  author_name TEXT DEFAULT 'IT피드',
  author_role TEXT DEFAULT '',
  author_avatar TEXT DEFAULT '',
  content TEXT,
  attachments JSONB DEFAULT '[]',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('published','hidden','draft')),
  source TEXT DEFAULT 'manual',
  source_name TEXT DEFAULT '직접등록',
  external_id TEXT,
  external_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_is_published ON community_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_source ON community_posts(source);

-- 2. RSS 피드 소스 관리
CREATE TABLE IF NOT EXISTS feed_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT DEFAULT 'rss',
  category TEXT DEFAULT 'news',
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_fetch_count INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 차단 게시글 (완전삭제 시 재수집 방지)
CREATE TABLE IF NOT EXISTS blocked_community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  blocked_by UUID,
  reason TEXT DEFAULT '관리자 완전삭제',
  UNIQUE(source, external_id)
);

-- 4. 피드 로그
CREATE TABLE IF NOT EXISTS feed_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  post_id UUID,
  post_title TEXT,
  source_name TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_logs_created_at ON feed_logs(created_at DESC);

-- 5. RLS 정책
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_logs ENABLE ROW LEVEL SECURITY;

-- 피드: 공개된 것만 누구나 조회, 관리자 전체 관리
CREATE POLICY "Anyone can view published posts" ON community_posts
  FOR SELECT USING (is_published = true AND status = 'published');
CREATE POLICY "Admin can manage all posts" ON community_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 피드 소스: 관리자만
CREATE POLICY "Admin can manage feed_sources" ON feed_sources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 차단: 관리자만
CREATE POLICY "Admin can manage blocked_community_posts" ON blocked_community_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 로그: 관리자만
CREATE POLICY "Admin can view feed_logs" ON feed_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
