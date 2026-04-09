-- ============================================
-- 프리세일즈 공고 사업 테이블 설정
-- SPC AI 세일즈 공고 시스템 이식
-- ============================================

-- 1. 공고 메인 테이블
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT,
  type VARCHAR(20) DEFAULT 'public',
  budget TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  source VARCHAR(100) DEFAULT 'K-Startup',
  external_id VARCHAR(100),
  is_published BOOLEAN DEFAULT false,
  application_method TEXT,
  target TEXT,
  description TEXT,
  eligibility TEXT,
  department TEXT,
  contact TEXT,
  source_url TEXT,
  field TEXT,
  governing_body TEXT,
  matching_keywords TEXT[] DEFAULT '{}',
  support_areas TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  target_types TEXT[] DEFAULT '{}',
  age_ranges TEXT[] DEFAULT '{}',
  business_years TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_announcements_external_id ON announcements(external_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_end_date ON announcements(end_date);

-- 2. 차단 공고 테이블 (완전삭제 시 재수집 방지)
CREATE TABLE IF NOT EXISTS blocked_announcements (
  external_id TEXT PRIMARY KEY,
  title TEXT,
  reason TEXT DEFAULT '관리자 완전삭제',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 공고 로그 테이블
CREATE TABLE IF NOT EXISTS announcement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  announcement_id UUID REFERENCES announcements(id) ON DELETE SET NULL,
  announcement_title TEXT,
  source TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_logs_created_at ON announcement_logs(created_at DESC);

-- 4. RLS 정책
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_logs ENABLE ROW LEVEL SECURITY;

-- 공고: 누구나 공개된 공고 조회 가능, 관리자만 수정/삭제
CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admin can manage all announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 차단 공고: 관리자만 관리
CREATE POLICY "Admin can manage blocked_announcements" ON blocked_announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 로그: 관리자만 조회
CREATE POLICY "Admin can view announcement_logs" ON announcement_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
