/**
 * 모닝브리프 카테고리 정의 — daily-news.py 의 DEFAULT_CATEGORIES 와 1:1 일치.
 * 변경 시 _legacy/daily-news/daily-news.py 와 함께 비교할 것.
 */
export const CATEGORIES: Record<string, string[]> = {
  '공공조달 & 조달시장': ['공공조달'],
  '창업 & 벤처 생태계': [
    '창업패키지',
    '모두의창업',
    '에코스타트업',
    '창업사관학교',
    '벤처지원사업',
    '창조경제혁신센터',
    '기술 인력 양성',
  ],
  'AI & IoT 기술': ['AI IoT', '중소공장 AI'],
  '스마트 팩토리 & 시스템': ['스마트팩토리', '스마트 시스템', '관제 시스템'],
  '스마트시티 & 도시재생': [
    '스마트시티',
    '스마트시티 솔루션',
    '스마트빌리지',
    '스마트빌리지 보급 및 확산사업',
    '조성 확산사업',
    '생활밀착형 도시재생',
  ],
}

export const ITEMS_PER_CATEGORY = Number(process.env.ITEMS_PER_CATEGORY ?? 10)
export const ITEMS_PER_KEYWORD_FETCH = Number(process.env.ITEMS_PER_KEYWORD_FETCH ?? 15)
export const CROSS_DAY_DEDUP_DAYS = Number(process.env.CROSS_DAY_DEDUP_DAYS ?? 3)

/** 도메인 자동 태깅 키워드 (news_archive.py 의 DOMAIN_KEYWORDS 포팅) */
export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  '스마트시티': ['스마트시티', '스마트 시티', '스마트빌리지', '도시재생', '디지털트윈', '도시 플랫폼', '통합 관제'],
  '스마트팩토리': ['스마트팩토리', '스마트 팩토리', '스마트공장', '스마트 공장', '제조 AI', '설비 예지보전', '공장 자동화', '스마트제조'],
  'AI & 머신러닝': ['인공지능', 'AI ', '머신러닝', '딥러닝', 'LLM', '생성형 AI', '생성 AI', 'AI 모델', '초거대 AI'],
  'IoT & 센서': ['IoT', '사물인터넷', '센서 네트워크', 'LPWAN', 'LoRa', 'NB-IoT', '엣지 컴퓨팅'],
  '공공조달': ['공공조달', '나라장터', '조달청', '정부 발주', '공공 발주', '지방계약', '수의계약', '입찰', '용역 공고'],
  '창업 지원사업': ['창업패키지', '예비창업', '초기창업', '창업도약', '창업지원', '모두의창업', '에코스타트업', '창업사관학교', '창조경제혁신센터', '벤처 지원', '엑셀러레이터'],
  '정보보안': ['정보보안', '사이버 보안', '침해대응', 'KISA', '개인정보 보호', '보안관제', '제로트러스트'],
  '인력 양성': ['인력 양성', '교육훈련', '디지털 인재', 'AI 인재', '청년 일자리', '직무교육'],
}

export function detectDomains(text: string): string[] {
  if (!text) return []
  const matched: string[] = []
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some((kw) => text.includes(kw))) matched.push(domain)
  }
  return matched
}
