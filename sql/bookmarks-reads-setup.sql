-- ============================================
-- 북마크 + 읽음 추적 테이블 (공고 + IT피드)
-- 2026-04-10
-- ============================================

-- ① 공고 북마크
CREATE TABLE IF NOT EXISTS announcement_bookmarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

-- ② 공고 읽음 추적
CREATE TABLE IF NOT EXISTS announcement_reads (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

-- ③ IT피드 북마크
CREATE TABLE IF NOT EXISTS feed_bookmarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ④ IT피드 읽음 추적
CREATE TABLE IF NOT EXISTS feed_reads (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_announcement_bookmarks_user ON announcement_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_bookmarks_user ON feed_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_reads_user ON feed_reads(user_id);

-- RLS 활성화
ALTER TABLE announcement_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reads ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 CRUD
CREATE POLICY "Users manage own announcement bookmarks" ON announcement_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own announcement reads" ON announcement_reads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own feed bookmarks" ON feed_bookmarks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own feed reads" ON feed_reads
  FOR ALL USING (auth.uid() = user_id);
