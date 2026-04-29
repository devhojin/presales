export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://presales.co.kr'
export const SITE_NAME = '프리세일즈'
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-D6P9XZ78RK'

/** 컨설팅 패키지 가격 (한 곳에서 관리 — 각 페이지·이메일·API 가 모두 참조) */
export const CONSULTING_PACKAGES = {
  spot: {
    value: 'spot' as const,
    name: '스팟 상담',
    priceWon: 150_000,
    priceLabel: '150,000원 / 30분',
    duration: '30분',
  },
  review: {
    value: 'review' as const,
    name: '제안서 리뷰 패키지',
    priceWon: 500_000,
    priceLabel: '500,000원 / 건',
    duration: '건당',
  },
  project: {
    value: 'project' as const,
    name: '프로젝트 컨설팅',
    priceWon: 3_000_000,
    priceLabel: '3,000,000원~ / 프로젝트',
    duration: '프로젝트',
  },
} as const

/** 업계 평균 컨설팅 외주 가격 (하한선, 마케팅 카피용) */
export const INDUSTRY_CONSULTING_PRICE_FLOOR_WON = 5_000_000

/** 10만원 단위 한글 포매터 (500만원, 15만원 등) */
export function formatWonShort(won: number): string {
  if (won >= 10_000_000) return `${Math.round(won / 10_000_000 * 10) / 10}천만원`
  if (won >= 1_000_000) return `${Math.round(won / 1_000_000)}00만원`.replace('0만', '만')
  if (won >= 10_000) return `${Math.round(won / 10_000)}만원`
  return `${won.toLocaleString()}원`
}
