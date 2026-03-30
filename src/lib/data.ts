export interface Product {
  id: number
  title: string
  vendor: string
  price: number
  originalPrice: number
  category: string
  format: string
  pages: number
  size: string
  downloads: number
  description: string
  thumbnail: string
  tags: string[]
  docTypes: string[]
  tier: 'basic' | 'premium' | 'package'
}

export const products: Product[] = [
  {
    id: 1,
    title: '공공기관 기술제안서 표준 템플릿 (IT/SW)',
    vendor: '프리세일즈 공식',
    price: 89000,
    originalPrice: 130000,
    category: '기술제안서',
    format: 'PPTX, HWP',
    pages: 55,
    size: '18MB',
    downloads: 0,
    description:
      '공공기관 및 지자체 IT/SW 사업 입찰에 최적화된 기술제안서 표준 양식입니다. 정성평가 항목별 작성 가이드와 실제 수주 성공 사례 분석이 포함되어 있습니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['공공기관', '나라장터', 'IT사업', '기술평가', '정성평가'],
    docTypes: ['기술제안서', '사업제안서'],
    tier: 'premium',
  },
  {
    id: 2,
    title: '나라장터 입찰 서류 체크리스트 + 가이드',
    vendor: '프리세일즈 공식',
    price: 35000,
    originalPrice: 50000,
    category: '입찰 가이드',
    format: 'PDF, EXCEL',
    pages: 15,
    size: '3MB',
    downloads: 0,
    description:
      '처음 공공입찰에 참여하는 기업을 위한 서류 준비 체크리스트입니다. 입찰 공고 분석법, 필수 서류 목록, 주의사항을 한눈에 정리했습니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['입찰서류', '체크리스트', '나라장터', '처음입찰', '가이드'],
    docTypes: ['입찰가이드', '체크리스트'],
    tier: 'basic',
  },
  {
    id: 3,
    title: '정량평가 + 정성평가 대응 통합 제안서 (건설/시설)',
    vendor: '프리세일즈 공식',
    price: 120000,
    originalPrice: 180000,
    category: '기술제안서',
    format: 'PPTX, HWP',
    pages: 70,
    size: '25MB',
    downloads: 0,
    description:
      '건설·시설관리 분야 공공입찰 제안서입니다. 정량평가(가격/실적/인력)와 정성평가(기술성/사업이해도/수행방안)를 모두 커버하는 통합 구조입니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['건설', '시설관리', '정량평가', '정성평가', '통합제안'],
    docTypes: ['기술제안서', '가격제안서'],
    tier: 'premium',
  },
  {
    id: 4,
    title: '발표 PT 시나리오 + 슬라이드 양식 (공공사업)',
    vendor: '프리세일즈 공식',
    price: 55000,
    originalPrice: 80000,
    category: '발표자료',
    format: 'PPTX',
    pages: 25,
    size: '8MB',
    downloads: 0,
    description:
      '공공사업 제안 발표(PT)용 시나리오와 슬라이드 표준 양식입니다. 3분/10분 버전별 스크립트 구조, 평가위원 질문 대응 가이드가 포함됩니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['발표PT', '시나리오', '슬라이드', '프레젠테이션', 'Q&A대응'],
    docTypes: ['발표자료', 'PT스크립트'],
    tier: 'basic',
  },
  {
    id: 5,
    title: '원가계산서 + 가격제안서 모델 (용역/SW)',
    vendor: '프리세일즈 공식',
    price: 65000,
    originalPrice: 90000,
    category: '가격제안',
    format: 'EXCEL, HWP',
    pages: 10,
    size: '4MB',
    downloads: 0,
    description:
      '공공사업 가격제안에 필요한 원가계산서, 투입인력 산출, SW사업 대가산정(기능점수/투입공수) 양식을 제공합니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['원가계산', '가격제안', '대가산정', '기능점수', '투입공수'],
    docTypes: ['가격제안서', '원가계산서'],
    tier: 'basic',
  },
  {
    id: 6,
    title: '[패키지] 공공입찰 풀세트: 기술제안 + 발표PT + 가격제안 + 30분 컨설팅',
    vendor: '프리세일즈 공식',
    price: 250000,
    originalPrice: 380000,
    category: '풀 패키지',
    format: 'PPTX, HWP, EXCEL',
    pages: 90,
    size: '45MB',
    downloads: 0,
    description:
      '공공입찰에 필요한 모든 문서를 한 번에. 기술제안서 + 발표PT + 가격제안서 + 체크리스트 풀세트에, 30분 화상 컨설팅(공고 분석 및 전략 브리핑)이 포함된 프리미엄 패키지입니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['풀세트', '패키지', '컨설팅포함', '올인원', '베스트'],
    docTypes: ['기술제안서', '발표자료', '가격제안서', '입찰가이드'],
    tier: 'package',
  },
  {
    id: 7,
    title: '공공 SI/SM 사업 제안서 템플릿',
    vendor: '프리세일즈 공식',
    price: 95000,
    originalPrice: 140000,
    category: '기술제안서',
    format: 'PPTX, HWP',
    pages: 60,
    size: '20MB',
    downloads: 0,
    description:
      '시스템통합(SI) 및 시스템운영(SM) 공공사업 제안서 전문 템플릿입니다. WBS, 추진체계, 기술아키텍처, 품질관리 방안 등 핵심 섹션이 구조화되어 있습니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['SI', 'SM', '시스템통합', '운영유지보수', 'WBS'],
    docTypes: ['기술제안서', '사업제안서'],
    tier: 'premium',
  },
  {
    id: 8,
    title: '정부 R&D 과제 사업계획서 (KEIT/NIPA/NIA)',
    vendor: '프리세일즈 공식',
    price: 110000,
    originalPrice: 160000,
    category: '사업계획서',
    format: 'HWP, PDF',
    pages: 40,
    size: '10MB',
    downloads: 0,
    description:
      'KEIT, NIPA, NIA 등 정부 R&D 과제 신청서 작성 템플릿입니다. 연구목표, 연구내용, 기대효과, 연구비 산출 등 평가기준에 맞춘 구조입니다.',
    thumbnail:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?auto=format&fit=crop&q=80&w=800&h=600',
    tags: ['정부R&D', 'KEIT', 'NIPA', 'NIA', '연구과제'],
    docTypes: ['사업계획서', '연구계획서'],
    tier: 'premium',
  },
]

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}

export const allCategories = ['기술제안서', '입찰 가이드', '발표자료', '가격제안', '풀 패키지', '사업계획서']

export const allTiers = [
  { id: 'basic', label: '기본', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'premium', label: '프리미엄', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'package', label: '패키지', color: 'bg-amber-50 text-amber-700 border-amber-200' },
]
