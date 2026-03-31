-- =============================================
-- 추가 테이블: 컨설팅 패키지, 팀원, 사이트 설정
-- =============================================

-- 1. 컨설팅 패키지
CREATE TABLE IF NOT EXISTS consulting_packages (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  price_unit TEXT DEFAULT '/ 건',
  features TEXT[] DEFAULT '{}',
  is_best BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consulting_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view packages" ON consulting_packages FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage packages" ON consulting_packages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO consulting_packages (slug, name, description, price, price_unit, features, is_best, sort_order) VALUES
('spot', '스팟 상담', '빠른 피드백이 필요할 때', '150,000원', '/ 30분', ARRAY['화상 미팅 30분','사전 공고/자료 검토','핵심 피드백 요약 제공','이메일 후속 Q&A 1회'], FALSE, 1),
('review', '제안서 리뷰 패키지', '완성도 높은 제안서를 위한 전문가 리뷰', '500,000원', '/ 건', ARRAY['제안서 전체 리뷰 (50p 이내)','평가항목별 점수 예측','수정 방향 리포트 (10p)','30분 화상 디브리핑','1회 재리뷰 포함'], TRUE, 2),
('project', '프로젝트 컨설팅', '입찰 전 과정을 함께하는 풀 서포트', '3,000,000원~', '/ 프로젝트', ARRAY['전담 컨설턴트 배정','입찰공고 분석 및 전략 수립','제안서 공동 작성/코칭','발표 PT 리허설','프로젝트 완료 후 30일 지원'], FALSE, 3);

-- 2. 팀원
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image_url TEXT,
  career TEXT[] DEFAULT '{}',
  expertise TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view team" ON team_members FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage team" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO team_members (name, role, image_url, career, expertise, sort_order) VALUES
('채호진', '대표 / 프리세일즈 디렉터', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300', ARRAY['前 삼성SDS 사업기획팀','前 카카오엔터프라이즈 BD','한양대 경영학 MBA'], ARRAY['프리세일즈','사업기획','BD'], 1),
('박지영', '공공조달 / 제안서 리드', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=300&h=300', ARRAY['前 LG CNS 공공사업부','前 한국정보화진흥원 평가위원','이화여대 행정학과'], ARRAY['공공조달','기술제안서','조달전략'], 2),
('최민호', '공공사업 / 정부과제 시니어', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300&h=300', ARRAY['前 KISTI 기술사업화팀','前 정보통신산업진흥원 PM','충남대 컴퓨터공학과'], ARRAY['정부R&D','공공사업','기술사업화'], 3);

-- 3. 사이트 설정 (키-값)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON site_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage settings" ON site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO site_settings (key, value) VALUES
('company_name', 'AMARANS Partners'),
('ceo_name', '채호진'),
('business_number', '확인 필요'),
('commerce_number', '준비 중'),
('address', '서울특별시 강남구 테헤란로 123'),
('email', 'contact@presales.co.kr'),
('phone', '010-9940-7909'),
('phone_hours', '11:00-16:00 (평일)'),
('copyright', '© 2025 AMARANS Partners. All rights reserved.'),
('mission', '공공조달 시장의 진입 장벽을 낮추고, 중소기업이 공정하게 경쟁할 수 있는 환경을 만듭니다.'),
('vision', '대한민국 No.1 공공조달 제안서 플랫폼으로, 모든 기업이 실력으로 평가받는 시장을 지향합니다.'),
('value_statement', '실전 경험 기반의 콘텐츠, 투명한 가격 정책, 고객의 수주 성공이 우리의 성공입니다.'),
('timeline_2023', '사업 기획 착수'),
('timeline_2024', '법인 설립 (AMARANS Partners)'),
('timeline_2025', '베타 오픈 + 템플릿 스토어 런칭');
