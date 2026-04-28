export type FeedTopicKey =
  | 'all'
  | 'ai'
  | 'platform'
  | 'startup'
  | 'policy'
  | 'cloud'
  | 'hardware'
  | 'smartcity'
  | 'security'

export type FeedPeriodKey = 'all' | 'today' | 'week' | 'month'

export const FEED_TOPIC_OPTIONS: {
  key: FeedTopicKey
  label: string
  keywords: string[]
}[] = [
  { key: 'all', label: '전체 주제', keywords: [] },
  { key: 'ai', label: 'AI', keywords: ['AI', '인공지능', '생성형', '챗GPT', 'ChatGPT', 'LLM', '모델'] },
  { key: 'platform', label: '플랫폼·서비스', keywords: ['플랫폼', '서비스', '앱', '커머스', '콘텐츠', '구독'] },
  { key: 'startup', label: '스타트업·투자', keywords: ['스타트업', '창업', '투자', 'VC', '벤처', '시드', 'Series', 'IPO'] },
  { key: 'policy', label: '공공·정책', keywords: ['정부', '정책', '공공', '규제', '지원사업', '중기부', '과기정통부'] },
  { key: 'cloud', label: '클라우드·데이터', keywords: ['클라우드', '데이터', 'DB', '데이터센터', 'SaaS', '서버'] },
  { key: 'hardware', label: '반도체·하드웨어', keywords: ['반도체', '칩', 'GPU', '하드웨어', '디바이스', '로봇'] },
  { key: 'smartcity', label: '모빌리티·스마트시티', keywords: ['모빌리티', '스마트시티', '자율주행', '교통', '도시'] },
  { key: 'security', label: '보안', keywords: ['보안', '해킹', '랜섬웨어', '침해', '제로트러스트', '개인정보'] },
]

export const FEED_PERIOD_OPTIONS: {
  key: FeedPeriodKey
  label: string
}[] = [
  { key: 'all', label: '전체 기간' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '최근 7일' },
  { key: 'month', label: '최근 30일' },
]
