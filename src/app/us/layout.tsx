import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '우리는 — 공공조달 제안서의 새로운 기준',
  description: '좋은 기술을 가진 기업이 제안서 때문에 기회를 잃는 건 구조적 불공정입니다. 프리세일즈는 낙찰의 경험을 공유해 실력 있는 기업이 정당하게 선정되는 조달 시장을 만듭니다.',
  alternates: { canonical: `${SITE_URL}/us` },
  openGraph: {
    title: '우리는 — 공공조달 제안서의 새로운 기준',
    description: '낙찰받은 기업의 제안서로 당신의 성공을 설계합니다.',
    url: `${SITE_URL}/us`,
  },
}

export default function UsLayout({ children }: { children: React.ReactNode }) {
  return children
}
