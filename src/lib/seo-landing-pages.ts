import { SITE_URL } from '@/lib/constants'

export type SeoLandingPage = {
  slug: string
  title: string
  shortTitle: string
  description: string
  primaryKeyword: string
  keywords: string[]
  audience: string
  painPoints: string[]
  solutions: string[]
  contentSections: Array<{
    title: string
    body: string
    bullets: string[]
  }>
  relatedLinks: Array<{
    href: string
    label: string
  }>
}

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  {
    slug: 'public-procurement-proposal',
    title: '공공조달 제안서 템플릿과 입찰 준비 자료',
    shortTitle: '공공조달 제안서',
    description:
      '나라장터와 조달청 입찰에 필요한 기술제안서, 수주제안서, 입찰가이드, 구축자료를 빠르게 찾고 제안서 작성 시간을 줄이세요.',
    primaryKeyword: '공공조달 제안서 템플릿',
    keywords: ['공공조달 제안서', '나라장터 제안서', '조달청 입찰 제안서', '수주제안서', '입찰 제안서 양식'],
    audience: '공공기관 입찰에 처음 참여하거나 반복 제안 업무를 줄이고 싶은 기업 담당자',
    painPoints: [
      '입찰 공고마다 요구 문서와 평가 항목이 달라 제안서 구조를 다시 잡아야 합니다.',
      '기술 내용은 있지만 제안서 목차, 표지, 수행계획 구성에 시간이 오래 걸립니다.',
      '기존 문서가 오래되어 최신 조달 시장 표현과 맞지 않는 경우가 많습니다.',
    ],
    solutions: [
      '검증된 제안서 목차와 페이지 흐름을 기반으로 초안을 빠르게 만들 수 있습니다.',
      '공공조달, 스마트시티, AI/IoT 등 분야별 자료를 함께 확인할 수 있습니다.',
      '입찰공고와 IT피드를 같이 보면서 제안서에 넣을 근거 자료를 찾을 수 있습니다.',
    ],
    contentSections: [
      {
        title: '입찰 제안서 작성에서 가장 먼저 잡아야 할 구조',
        body: '공공조달 제안서는 회사 소개보다 과업 이해, 수행 전략, 일정, 인력, 품질관리, 유지보수 계획의 흐름이 먼저 정리되어야 합니다.',
        bullets: ['과업 이해와 요구사항 대응표', '추진 일정과 산출물 관리', '참여 인력과 역할 분담', '품질관리와 리스크 대응'],
      },
      {
        title: '제안서 템플릿을 쓰면 줄일 수 있는 시간',
        body: '템플릿은 문장을 대신 써주는 도구가 아니라 평가자가 읽기 쉬운 정보 배치와 문서 골격을 빠르게 맞추는 기준점입니다.',
        bullets: ['목차 설계 시간 단축', '반복되는 표와 체크리스트 재사용', '제안서 톤과 시각 구조 통일', '팀 내부 리뷰 기준 정리'],
      },
      {
        title: 'PRESALES에서 함께 확인하면 좋은 자료',
        body: '문서 스토어의 템플릿과 수집된 입찰공고, IT피드, 모닝브리프를 함께 보면 제안서 작성 흐름과 시장 근거를 동시에 잡을 수 있습니다.',
        bullets: ['문서 스토어에서 유사 분야 템플릿 확인', '입찰공고에서 지원 조건과 마감일 확인', 'IT피드에서 기술 트렌드 근거 확인', '모닝브리프로 매일 시장 흐름 점검'],
      },
    ],
    relatedLinks: [
      { href: '/store', label: '문서 스토어 보기' },
      { href: '/announcements', label: '입찰공고 확인' },
      { href: '/consulting', label: '제안서 컨설팅 문의' },
    ],
  },
  {
    slug: 'technical-proposal-template',
    title: '기술제안서 PPT, PDF 템플릿과 작성 가이드',
    shortTitle: '기술제안서 템플릿',
    description:
      '기술제안서 PPT와 PDF 문서를 찾는 담당자를 위해 제안서 목차, 수행계획, 기술 구성, 평가 대응 포인트를 정리했습니다.',
    primaryKeyword: '기술제안서 템플릿',
    keywords: ['기술제안서 PPT', '기술제안서 PDF', '제안서 작성 가이드', 'PPT 제안서 템플릿', '제안서 목차'],
    audience: '기술은 보유했지만 제안서 문서화와 발표자료 구성에 시간이 부족한 팀',
    painPoints: [
      '기술 설명은 충분하지만 평가자가 이해하기 쉬운 제안 구조로 정리하기 어렵습니다.',
      'PPT와 PDF 버전의 메시지가 달라져 내부 검토에서 수정이 반복됩니다.',
      '비슷한 제안서를 매번 새로 만들면서 산출물 품질이 일정하지 않습니다.',
    ],
    solutions: [
      '기술 개요, 수행 방법, 일정, 조직, 기대효과를 한 흐름으로 정리합니다.',
      'PPT 발표용과 PDF 제출용을 함께 고려한 문서 구성을 제공합니다.',
      '반복 입찰에 재사용할 수 있는 문서 기준을 만들 수 있습니다.',
    ],
    contentSections: [
      {
        title: '기술제안서에 꼭 들어가야 하는 기본 목차',
        body: '기술제안서는 기능 소개만으로 평가되기 어렵습니다. 요구사항을 어떻게 이해했고 어떤 방식으로 안정적으로 수행할지 보여줘야 합니다.',
        bullets: ['사업 이해와 추진 목표', '핵심 기술 구성', '수행 방법과 일정', '품질관리와 보안', '유지보수와 확장 계획'],
      },
      {
        title: 'PPT와 PDF를 함께 준비할 때의 기준',
        body: 'PPT는 핵심 메시지와 시각 구조가 중요하고, PDF는 세부 근거와 제출 요건 충족이 중요합니다. 두 문서의 기준을 분리하면 수정 비용이 줄어듭니다.',
        bullets: ['PPT는 평가 발표 흐름 중심', 'PDF는 세부 설명과 증빙 중심', '목차와 용어는 동일하게 유지', '가격이나 조건처럼 바뀌는 정보는 한 곳에서 관리'],
      },
      {
        title: '검색과 수집 데이터를 제안서 근거로 활용하기',
        body: 'PRESALES의 IT피드와 모닝브리프는 제안서의 시장 동향, 정책 환경, 기술 변화 파트를 보강하는 참고 자료로 활용할 수 있습니다.',
        bullets: ['최근 IT 정책과 시장 기사 확인', '스마트시티와 AI/IoT 흐름 파악', '공고별 요구 조건 비교', '중복되는 근거 자료 정리'],
      },
    ],
    relatedLinks: [
      { href: '/store?q=기술제안서', label: '기술제안서 자료 검색' },
      { href: '/feeds', label: 'IT피드 보기' },
      { href: '/brief', label: '모닝브리프 구독' },
    ],
  },
  {
    slug: 'narajangteo-bid-guide',
    title: '나라장터 입찰 제안서 작성과 공고 확인 가이드',
    shortTitle: '나라장터 입찰 가이드',
    description:
      '나라장터 입찰을 준비할 때 확인해야 할 공고 조건, 제안서 목차, 제출 일정, 시장 정보 수집 흐름을 정리했습니다.',
    primaryKeyword: '나라장터 입찰 제안서',
    keywords: ['나라장터 입찰', '나라장터 제안서', '입찰 공고 확인', '조달청 입찰', '입찰 가이드'],
    audience: '나라장터와 조달청 입찰을 준비하는 영업, 기획, 제안 담당자',
    painPoints: [
      '공고 확인, 제안서 작성, 가격 검토, 제출 일정 관리가 분산되어 누락이 생깁니다.',
      '공고문을 읽어도 실제 제안서 목차로 옮기는 과정이 막힙니다.',
      '마감 임박 공고와 관련 시장 이슈를 놓치기 쉽습니다.',
    ],
    solutions: [
      '공고 조건과 제안서 목차를 연결해서 확인할 수 있습니다.',
      '문서 스토어와 컨설팅을 통해 부족한 부분을 빠르게 보완할 수 있습니다.',
      '모닝브리프로 신규 공고와 시장 뉴스를 매일 확인할 수 있습니다.',
    ],
    contentSections: [
      {
        title: '입찰 공고에서 먼저 확인할 항목',
        body: '입찰 공고는 제목보다 접수 기간, 지원 대상, 수행 범위, 제출 서류, 평가 기준을 먼저 봐야 합니다.',
        bullets: ['접수 시작일과 마감일', '지원 대상과 제한 조건', '제출 서류 목록', '평가 항목과 배점', '현장 설명회 또는 질의 일정'],
      },
      {
        title: '공고를 제안서 목차로 바꾸는 방법',
        body: '공고의 과업 범위와 평가 기준을 제안서 목차에 직접 연결하면 평가자가 요구사항 대응 여부를 빠르게 확인할 수 있습니다.',
        bullets: ['과업 요구사항별 대응표 작성', '평가 항목 순서에 맞춘 목차 배치', '수행 일정과 산출물 연결', '증빙 자료와 실적 배치'],
      },
      {
        title: 'PRESALES를 입찰 준비 체크리스트로 쓰기',
        body: '입찰공고, 문서 스토어, 컨설팅, 모닝브리프를 함께 쓰면 공고 탐색부터 제안서 보완까지 한 흐름으로 관리할 수 있습니다.',
        bullets: ['공고 리스트에서 신규/마감 공고 확인', '스토어에서 유사 제안서 구조 확인', '컨설팅으로 제안서 위험 요소 점검', '모닝브리프로 매일 변화 확인'],
      },
    ],
    relatedLinks: [
      { href: '/announcements', label: '공고 사업 보기' },
      { href: '/store?category=2', label: '입찰 가이드 자료' },
      { href: '/consulting', label: '입찰 제안서 상담' },
    ],
  },
  {
    slug: 'smartcity-ai-iot-proposal',
    title: '스마트시티, AI, IoT 제안서 작성 자료',
    shortTitle: '스마트시티 AI IoT 제안서',
    description:
      '스마트시티, AI, IoT 분야 공공조달 제안서에 필요한 시장 동향, 기술 구성, 구축자료, 관련 입찰공고를 한 번에 확인하세요.',
    primaryKeyword: '스마트시티 AI IoT 제안서',
    keywords: ['스마트시티 제안서', 'AI 제안서', 'IoT 제안서', '공공조달 기술제안서', '스마트시티 입찰'],
    audience: '스마트시티, AI, IoT 관련 공공사업을 준비하는 기술기업과 제안 담당자',
    painPoints: [
      '기술 키워드는 많지만 공공기관이 이해하는 사업 언어로 정리하기 어렵습니다.',
      '시장 동향과 정책 근거를 찾느라 제안서 작성 시간이 길어집니다.',
      '유사 공고와 최신 IT 이슈를 함께 확인할 창구가 필요합니다.',
    ],
    solutions: [
      '스마트시티, AI, IoT 중심 문서와 시장 정보를 함께 탐색할 수 있습니다.',
      'IT피드와 모닝브리프를 통해 최신 보도자료와 정책 이슈를 확인할 수 있습니다.',
      '기술제안서 구조를 기반으로 수행계획과 기대효과를 구체화할 수 있습니다.',
    ],
    contentSections: [
      {
        title: '스마트시티 제안서의 핵심 구성',
        body: '스마트시티 제안서는 플랫폼, 데이터, 현장 장비, 운영 체계, 시민 서비스가 연결되는 구조를 명확하게 보여줘야 합니다.',
        bullets: ['도시 문제와 서비스 시나리오', 'AI/IoT 데이터 수집 구조', '시스템 아키텍처와 연계 방식', '운영 대시보드와 유지관리', '보안과 개인정보 보호'],
      },
      {
        title: 'AI와 IoT 기술을 평가 언어로 바꾸기',
        body: '기술 설명은 성능보다 문제 해결 방식, 도입 효과, 운영 가능성 중심으로 정리해야 공공기관 평가 문서에 맞습니다.',
        bullets: ['기술 도입 전후 비교', '정량 기대효과', '운영 인력과 유지보수 계획', '데이터 품질과 보안 기준'],
      },
      {
        title: '시장 동향을 제안서 근거로 연결하기',
        body: '전날 뉴스, 보도자료, 정책 이슈를 정리한 모닝브리프와 IT피드를 활용하면 제안 배경과 필요성 파트를 더 구체적으로 쓸 수 있습니다.',
        bullets: ['스마트시티 정책 변화', 'AI/IoT 도입 사례', '보안과 데이터 이슈', '관련 공고와 지원사업 흐름'],
      },
    ],
    relatedLinks: [
      { href: '/store?q=스마트시티', label: '스마트시티 자료 검색' },
      { href: '/feeds?topic=ai', label: 'AI/IT피드 확인' },
      { href: '/brief', label: '모닝브리프 보기' },
    ],
  },
]

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find((page) => page.slug === slug)
}

export function seoLandingUrl(slug: string): string {
  return `${SITE_URL}/landing/${slug}`
}
