/**
 * IT피드 RSS 소스 정의
 * SPC community-sources.ts 이식
 */

export interface FeedSource {
  id: string
  name: string
  url: string
  category: string
  emoji: string
  badgeColor: string
}

// 하드코딩된 RSS 소스 (SPC 동일)
export const FEED_SOURCES: FeedSource[] = [
  {
    id: 'smartcity',
    name: '스마트시티',
    url: 'https://smartcity.go.kr/bbs/rss.php?bo_table=notice',
    category: 'policy',
    emoji: '',
    badgeColor: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'etnews',
    name: '전자신문',
    url: 'https://rss.etnews.com/Section902.xml',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'outstanding',
    name: '아웃스탠딩',
    url: 'https://outstanding.kr/feed',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'aitimes',
    name: 'AI타임스',
    url: 'https://www.aitimes.com/rss/allArticle.xml',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'techm',
    name: '테크엠',
    url: 'https://www.techm.kr/rss/allArticle.xml',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-cyan-100 text-cyan-700',
  },
  {
    id: 'hankyung_it',
    name: '한경IT',
    url: 'https://rss.hankyung.com/feed/it.xml',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-red-100 text-red-700',
  },
  {
    id: 'mk_economy',
    name: '매경이코노미',
    url: 'https://rss.mk.co.kr/mkeco/rss.xml',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'sedaily',
    name: '서울경제',
    url: 'https://www.sedaily.com/RSS/NewsAll/',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'donga_economy',
    name: '동아경제',
    url: 'https://rss.donga.com/economy.xml',
    category: 'news',
    emoji: '',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
]

// 소스 ID로 뱃지 스타일 반환
export function getSourceBadgeStyle(source: string): string {
  const found = FEED_SOURCES.find(s => s.id === source)
  return found?.badgeColor || 'bg-zinc-100 text-zinc-600'
}

export function getSourceName(source: string): string {
  const found = FEED_SOURCES.find(s => s.id === source)
  return found?.name || source
}

// 카테고리 정의
export const FEED_CATEGORIES = [
  { id: 'news', label: '스타트업뉴스', color: 'bg-blue-100 text-blue-700' },
  { id: 'policy', label: '정책소식', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'bid', label: '입찰공고', color: 'bg-orange-100 text-orange-700' },
  { id: 'task', label: '과제공고', color: 'bg-purple-100 text-purple-700' },
  { id: 'event', label: '행사안내', color: 'bg-pink-100 text-pink-700' },
] as const

export function getCategoryLabel(cat: string): string {
  return FEED_CATEGORIES.find(c => c.id === cat)?.label || cat
}

export function getCategoryColor(cat: string): string {
  return FEED_CATEGORIES.find(c => c.id === cat)?.color || 'bg-zinc-100 text-zinc-600'
}
