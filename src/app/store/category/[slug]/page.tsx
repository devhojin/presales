import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

const CATEGORY_MAP: Record<string, { id: number; name: string; description: string }> = {
  'technical-proposal': { id: 1, name: '기술제안서', description: '공공조달 기술제안서 템플릿 — 실제 낙찰된 기술제안서 구성을 그대로 활용하세요.' },
  'bidding-guide': { id: 2, name: '입찰가이드', description: '나라장터 입찰가이드 템플릿 — 입찰 절차와 평가 기준을 정리한 가이드 문서.' },
  'presentation': { id: 3, name: '발표자료', description: '공공조달 발표자료 PPT 템플릿 — 평가위원을 설득하는 발표 구성.' },
  'price-proposal': { id: 4, name: '가격제안', description: '공공조달 가격제안서 템플릿 — 원가 산출과 가격 전략 문서.' },
  'full-package': { id: 5, name: '풀패키지', description: '공공조달 제안서 풀패키지 — 기술제안서+발표자료+가격제안 통합 세트.' },
  'business-plan': { id: 6, name: '사업계획서', description: '사업계획서 템플릿 — 정부과제·스타트업 사업계획서 작성 가이드.' },
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const cat = CATEGORY_MAP[slug]
  if (!cat) return { title: '카테고리를 찾을 수 없습니다' }

  return {
    title: `${cat.name} 템플릿 — PRESALES`,
    description: cat.description,
    alternates: { canonical: `${SITE_URL}/store/category/${slug}` },
    openGraph: {
      title: `${cat.name} 템플릿 — 공공조달 제안서 마켓플레이스`,
      description: cat.description,
      url: `${SITE_URL}/store/category/${slug}`,
    },
  }
}

export function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map(slug => ({ slug }))
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const cat = CATEGORY_MAP[slug]
  if (!cat) redirect('/store')
  redirect(`/store?category=${cat.id}`)
}
