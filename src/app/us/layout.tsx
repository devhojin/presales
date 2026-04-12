import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '우리는 | PRESALES — 낙찰받은 제안서가 여기 있습니다',
  description: '공공조달 입찰의 불공정을 해소합니다. 실제 낙찰된 제안서 템플릿, 매일 아침 시장동향 브리프, 전문가 1:1 컨설팅으로 입찰 성공을 돕습니다.',
  openGraph: {
    title: '우리는 PRESALES — 낙찰받은 제안서가 여기 있습니다',
    description: '공공조달 입찰에 필요한 모든 것. 검증된 제안서, 시장동향, 전문가 컨설팅.',
    url: `${SITE_URL}/us`,
    type: 'website',
    siteName: 'PRESALES by AMARANS Partners',
  },
  twitter: {
    card: 'summary_large_image',
    title: '우리는 PRESALES',
    description: '낙찰받은 제안서가 여기 있습니다',
  },
  alternates: { canonical: `${SITE_URL}/us` },
}

export default function UsLayout({ children }: { children: React.ReactNode }) {
  return children
}
