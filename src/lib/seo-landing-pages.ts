import { SITE_URL } from '@/lib/constants'

export const SEO_LANDING_LAST_MODIFIED = '2026-05-03T18:00:00+09:00'
export const NAVER_REGISTRATION_DATE = '2026-05-01'
export const NAVER_LANDING_SITE_URL = 'https://www.presales.co.kr'

export const NAVER_REGISTERED_LANDING_SLUGS = [
  'public-procurement-proposal',
  'technical-proposal-template',
  'narajangteo-bid-guide',
  'smartcity-ai-iot-proposal',
  'government-bid-proposal',
  'narajangteo-proposal-template',
  'public-bid-document-template',
  'bid-proposal-writing-guide',
  'government-rfp-response',
  'public-sector-proposal-template',
  'procurement-evaluation-proposal',
  'bid-winning-proposal-reference',
  'technical-proposal-writing',
  'it-technical-proposal',
  'si-project-proposal',
  'software-development-proposal',
  'system-integration-proposal',
  'solution-proposal-template',
  'service-proposal-template',
  'project-proposal-template',
  'proposal-table-of-contents',
  'information-system-proposal',
  'public-it-project-proposal',
  'digital-transformation-proposal',
  'cloud-service-proposal',
  'data-platform-proposal',
  'ai-service-proposal',
  'iot-platform-proposal',
  'security-solution-proposal',
  'homepage-renewal-proposal',
  'app-development-proposal',
  'smartcity-proposal-template',
  'smart-factory-proposal',
  'ai-iot-technical-proposal',
  'urban-data-platform-proposal',
  'digital-twin-proposal',
  'smart-mobility-proposal',
  'smart-safety-proposal',
  'proposal-template-store',
  'free-proposal-template',
  'paid-proposal-template',
  'ppt-proposal-template',
  'pdf-proposal-sample',
  'original-proposal-document',
  'proposal-copy-document',
  'wbs-excel-template',
  'business-proposal-template',
] as const

export const NAVER_UNREGISTERED_LANDING_SLUGS = [
  'project-schedule-template',
  'bid-preparation-guide',
  'proposal-evaluation-strategy',
  'rfp-analysis-guide',
  'proposal-executive-summary',
  'proposal-schedule-plan',
  'proposal-price-strategy',
  'proposal-presentation-template',
  'bid-document-checklist',
  'proposal-consulting',
  'public-bid-consulting',
  'technical-proposal-consulting',
  'startup-support-proposal',
  'government-support-project-proposal',
  'rnd-project-proposal',
  'policy-fund-proposal',
] as const

export type NaverRegistrationStatus = 'registered' | 'unregistered'

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
  commercialIntent?: 'consulting' | 'template' | 'review' | 'research'
  conversionTitle?: string
  conversionBody?: string
  conversionLinks?: Array<{
    href: string
    label: string
  }>
  faqs?: Array<{
    question: string
    answer: string
  }>
  naverRegistrationStatus?: NaverRegistrationStatus
  naverRegistrationDate?: string
}

const CORE_SEO_LANDING_PAGES: SeoLandingPage[] = [
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
  {
    slug: 'bid-proposal-consulting',
    title: '입찰 제안서 컨설팅과 작성 지원',
    shortTitle: '입찰 제안서 컨설팅',
    description:
      '공공입찰 제안서 컨설팅이 필요한 기업을 위해 RFP 분석, 요구사항 대응표, 목차 설계, 제출 전 검수까지 지원 범위를 정리했습니다.',
    primaryKeyword: '입찰 제안서 컨설팅',
    keywords: ['입찰 제안서 컨설팅', '공공입찰 컨설팅', '제안서 작성 지원', '제안서 검토', '나라장터 제안서'],
    audience: '마감은 다가오는데 내부 인력만으로 제안서 구조와 검수를 끝내기 어려운 대표, 영업, 제안 담당자',
    commercialIntent: 'consulting',
    painPoints: [
      'RFP를 읽었지만 제안 전략, 목차, 요구사항 대응표로 옮기는 시간이 부족합니다.',
      '기존 제안서 문장을 재사용하다 보니 이번 공고의 평가 기준과 맞지 않는 부분이 남습니다.',
      '제출 직전 PDF, 파일명, 증빙, 가격서 분리 같은 실무 누락이 반복됩니다.',
    ],
    solutions: [
      '공고문과 제안요청서를 기준으로 요구사항 대응표와 제안서 목차를 먼저 정리합니다.',
      'AI 초안을 그대로 쓰지 않고 근거, 실적, 과업 범위, 제출 조건을 사람이 검수하는 방식으로 품질을 높입니다.',
      '필요한 경우 문서 스토어 템플릿과 컨설팅을 연결해 작성 시간을 줄입니다.',
    ],
    contentSections: [
      {
        title: '컨설팅이 필요한 순간',
        body: '입찰 제안서는 글을 잘 쓰는 문제보다 공고 조건을 빠뜨리지 않고 평가자가 읽을 구조로 바꾸는 문제입니다.',
        bullets: ['참가자격과 제출물 검토', 'RFP 요구사항 추출', '평가항목별 목차 설계', '제출 전 누락 점검'],
      },
      {
        title: '상담 전에 준비하면 좋은 자료',
        body: '공고문, 제안요청서, 별첨 양식, 기존 회사 소개서가 있으면 짧은 상담에서도 위험 지점을 빠르게 볼 수 있습니다.',
        bullets: ['나라장터 공고 URL', '제안요청서 PDF', '정량평가 증빙 후보', '기존 제안서 또는 회사소개서'],
      },
      {
        title: 'PRESALES에서 바로 할 수 있는 일',
        body: '무료 자료로 구조를 잡고, 필요한 부분은 유료 문서나 전문가 검토로 보완하는 흐름을 만들 수 있습니다.',
        bullets: ['AI 제안서 작성법으로 초벌 구조 파악', '문서 스토어에서 유사 제안서 확인', '컨설팅으로 리스크 검토', '입찰공고로 신규 기회 확인'],
      },
    ],
    conversionTitle: '이번 공고에 맞는 제안서 구조부터 점검하세요',
    conversionBody: '공고 URL이나 RFP 파일을 기준으로 참가 가능성, 제안 목차, 누락 위험을 빠르게 검토하는 상담 흐름으로 연결합니다.',
    conversionLinks: [
      { href: '/consulting', label: '제안서 컨설팅 문의' },
      { href: '/ai-proposal-guide', label: 'AI 제안서 작성법 보기' },
    ],
    relatedLinks: [
      { href: '/consulting', label: '제안서 컨설팅 문의' },
      { href: '/landing/rfp-analysis-service', label: 'RFP 분석 지원' },
      { href: '/landing/proposal-review-check', label: '제출 전 검수' },
    ],
    faqs: [
      {
        question: '입찰 제안서 전체 대행도 가능한가요?',
        answer: '공고 범위와 일정에 따라 작성 지원, 구조 설계, 검수 중심으로 상담합니다. 제출 주체와 최종 확인은 입찰 참여 기업이 맡아야 합니다.',
      },
      {
        question: '상담 전에 무엇을 보내야 하나요?',
        answer: '나라장터 공고 URL, 제안요청서, 별첨 양식, 기존 회사소개서가 있으면 검토 범위와 우선순위를 빠르게 정할 수 있습니다.',
      },
    ],
  },
  {
    slug: 'rfp-analysis-service',
    title: 'RFP 분석 서비스: 요구사항 대응표와 제안 전략 정리',
    shortTitle: 'RFP 분석 서비스',
    description:
      '제안요청서 RFP를 과업 범위, 기능 요구사항, 평가 기준, 리스크, 질의 후보로 나누고 제안서 목차와 대응표로 연결하는 방법입니다.',
    primaryKeyword: 'RFP 분석 서비스',
    keywords: ['RFP 분석', '제안요청서 분석', '요구사항 대응표', 'RFP 검토', '제안서 전략'],
    audience: '긴 RFP를 읽고도 무엇을 먼저 제안서에 반영해야 할지 막히는 제안 담당자',
    commercialIntent: 'consulting',
    painPoints: [
      'RFP 분량이 길고 별첨이 많아 요구사항을 빠뜨리기 쉽습니다.',
      '평가 기준과 과업 요구사항이 섞여 제안서 목차가 산만해집니다.',
      '질의해야 할 애매한 조건을 내부 추정으로 처리해 제출 후 리스크가 생깁니다.',
    ],
    solutions: [
      'RFP를 과업, 기능, 비기능, 보안, 산출물, 일정으로 분해합니다.',
      '각 요구사항을 제안서 목차, 증빙, 담당자, 검수 상태에 연결합니다.',
      '질의 후보와 원문 근거를 분리해 제안서 초안의 신뢰도를 높입니다.',
    ],
    contentSections: [
      {
        title: 'RFP 분석 결과물',
        body: '분석 결과는 단순 요약이 아니라 제안서 작성자가 바로 쓸 수 있는 표와 체크리스트여야 합니다.',
        bullets: ['과업 범위 요약', '요구사항 대응표', '평가 배점 대응표', '질의 후보 목록'],
      },
      {
        title: 'AI를 쓸 때 주의할 점',
        body: 'AI는 초벌 분류에 유용하지만 원문에 없는 해석을 만들 수 있으므로 근거 위치를 함께 기록해야 합니다.',
        bullets: ['원문 페이지 번호 기록', '확정/추정/질의 필요 상태 분리', '평가 기준과 요구사항 분리', '별첨 파일 누락 확인'],
      },
      {
        title: '매출 관점의 활용',
        body: 'RFP 분석이 빨라지면 참여 여부 결정, 견적 검토, 컨소시엄 구성까지 앞당길 수 있어 수주 기회를 놓칠 가능성이 줄어듭니다.',
        bullets: ['참여 가능성 조기 판단', '제안 작업 범위 산정', '외부 협력사 역할 분담', '제출 일정 역산'],
      },
    ],
    conversionTitle: 'RFP 분석을 제안서 목차로 바꾸세요',
    conversionBody: '분석만 끝나는 것이 아니라 요구사항 대응표와 목차까지 이어져야 실제 작성 시간이 줄어듭니다.',
    conversionLinks: [
      { href: '/consulting', label: 'RFP 분석 상담' },
      { href: '/ai-proposal-guide/ai-rfp-analysis', label: 'AI RFP 분석 글' },
    ],
    relatedLinks: [
      { href: '/ai-proposal-guide/ai-rfp-analysis', label: 'AI RFP 분석 방법' },
      { href: '/ai-proposal-guide/requirements-response-table', label: '요구사항 대응표 만들기' },
      { href: '/consulting', label: '분석 상담 문의' },
    ],
    faqs: [
      {
        question: 'RFP 분석과 단순 요약은 무엇이 다른가요?',
        answer: '요약은 내용을 줄이는 작업이고, RFP 분석은 요구사항, 평가 기준, 리스크, 질의 후보를 제안서 작성 단위로 재구성하는 작업입니다.',
      },
      {
        question: 'AI 분석만으로 제출해도 되나요?',
        answer: '아닙니다. AI는 초벌 분류에 쓰고, 참가자격, 제출 조건, 실적, 가격서, 보안 조건은 사람이 원문 기준으로 확인해야 합니다.',
      },
    ],
  },
  {
    slug: 'proposal-review-check',
    title: '제안서 검토와 제출 전 체크리스트',
    shortTitle: '제안서 검토',
    description:
      '제안서 제출 전에 누락 서류, 요구사항 대응, PDF 변환, 파일명, 증빙 자료, 가격서 분리 여부를 검토하는 실무 체크리스트입니다.',
    primaryKeyword: '제안서 검토',
    keywords: ['제안서 검토', '제안서 리뷰', '제출 전 체크리스트', '입찰 서류 검수', '제안서 PDF 검수'],
    audience: '제출 직전 누락과 형식 오류를 줄이고 싶은 입찰 담당자와 제안 PM',
    commercialIntent: 'review',
    painPoints: [
      '본문은 완성했지만 RFP 요구사항에 모두 답했는지 확신하기 어렵습니다.',
      'PDF 변환, 인쇄, 파일명, 가격서 분리 같은 형식 오류가 제출 직전에 발견됩니다.',
      '증빙 자료와 정량평가 항목이 본문과 따로 놀아 평가자가 확인하기 어렵습니다.',
    ],
    solutions: [
      '요구사항 대응표를 기준으로 본문 위치와 증빙 위치를 대조합니다.',
      '제출 파일 목록, 파일명, PDF 상태, 가격서 분리 여부를 별도 체크합니다.',
      '위험 문구, 과장 표현, 원문 불일치 표현을 사람 기준으로 수정합니다.',
    ],
    contentSections: [
      {
        title: '제출 전 반드시 보는 항목',
        body: '검토는 맞춤법 확인이 아니라 탈락과 감점 가능성을 줄이는 작업입니다.',
        bullets: ['참가자격 증빙', '요구사항 대응 위치', '정량평가 증빙', '제출 파일명', '가격서 분리'],
      },
      {
        title: 'PDF와 인쇄 검수',
        body: '전자 제출과 오프라인 제출이 함께 있는 공고는 화면에서 보이는 문서와 출력물이 다를 수 있습니다.',
        bullets: ['글꼴 포함 여부', '이미지 해상도', '페이지 번호', '표 잘림', '첨부파일 버전'],
      },
      {
        title: '검토 결과를 작업으로 바꾸기',
        body: '검토표는 발견 목록에서 끝나면 안 됩니다. 담당자, 수정 우선순위, 마감 시간을 붙여야 실제 제출 안정성이 높아집니다.',
        bullets: ['수정 담당자 지정', '필수/권장 구분', '재검토 상태 표시', '최종 제출자 확인'],
      },
    ],
    conversionTitle: '제출 전 마지막 검수로 감점 위험을 줄이세요',
    conversionBody: '완성된 제안서라도 요구사항 누락, 증빙 불일치, 파일 형식 오류가 있으면 평가 전에 문제가 됩니다.',
    conversionLinks: [
      { href: '/consulting', label: '제출 전 검토 문의' },
      { href: '/ai-proposal-guide/final-review', label: '검수 방법 읽기' },
    ],
    relatedLinks: [
      { href: '/ai-proposal-guide/final-review', label: '제출 전 검수 방법' },
      { href: '/ai-proposal-guide/narajangteo-submission', label: '나라장터 제출 절차' },
      { href: '/consulting', label: '검토 상담' },
    ],
    faqs: [
      {
        question: '제안서 검토는 언제 맡기는 것이 좋나요?',
        answer: '본문이 70% 이상 완성되고 제출 파일 목록이 보이는 시점이 좋습니다. 너무 늦으면 발견한 문제를 수정할 시간이 부족합니다.',
      },
      {
        question: '검토에서 가장 자주 나오는 문제는 무엇인가요?',
        answer: '요구사항 대응 위치 누락, 증빙 파일 불일치, 가격서 분리 오류, PDF 변환 후 표 잘림, 공고 변경사항 미반영이 자주 나옵니다.',
      },
    ],
  },
  {
    slug: 'proposal-ppt-template',
    title: '제안서 PPT 템플릿과 발표자료 구성',
    shortTitle: '제안서 PPT 템플릿',
    description:
      '평가 발표와 제안 설명에 필요한 제안서 PPT 템플릿, 발표 목차, 핵심 메시지, 시각자료 구성을 공공입찰 관점에서 정리했습니다.',
    primaryKeyword: '제안서 PPT 템플릿',
    keywords: ['제안서 PPT 템플릿', '입찰 발표자료', '기술제안서 PPT', '제안 발표 PPT', '공공입찰 발표자료'],
    audience: 'PDF 제안서는 있는데 발표자료와 핵심 메시지를 다시 구성해야 하는 영업·제안팀',
    commercialIntent: 'template',
    painPoints: [
      '본문 내용을 PPT로 줄이다가 핵심 메시지가 흐려집니다.',
      '발표 시간이 짧아 평가자가 봐야 할 차별점이 뒤쪽에 묻힙니다.',
      '디자인 시안은 많지만 공공입찰 발표 구조에 맞는 템플릿을 찾기 어렵습니다.',
    ],
    solutions: [
      '평가 기준과 요구사항 대응 순서에 맞춰 발표 흐름을 재구성합니다.',
      '표지, 사업 이해, 해결 전략, 수행 계획, 기대효과를 한 흐름으로 정리합니다.',
      '문서 스토어의 PPT 템플릿과 컨설팅을 함께 활용해 발표 완성도를 높입니다.',
    ],
    contentSections: [
      {
        title: '발표자료 첫 5장 구성',
        body: '심사위원은 짧은 시간 안에 사업 이해와 수행 가능성을 판단합니다. 초반 장표가 전체 인상을 결정합니다.',
        bullets: ['한 줄 제안 메시지', '발주 문제 정의', '우리 접근법', '핵심 차별점', '수행 조직과 일정'],
      },
      {
        title: 'PPT 템플릿 선택 기준',
        body: '공공입찰 PPT는 화려함보다 정보의 위계와 근거 제시가 중요합니다.',
        bullets: ['표와 도식 가독성', '평가항목 연결성', '인쇄 가독성', '수정 편의성'],
      },
      {
        title: 'PDF 제안서와 발표자료 연결',
        body: '발표자료는 PDF 제안서의 축약본이 아니라 평가위원에게 반드시 남겨야 할 메시지의 재구성입니다.',
        bullets: ['목차 용어 통일', '핵심 표 재사용', '증빙 위치 안내', '질의응답 예상 포함'],
      },
    ],
    conversionTitle: '발표자료를 제안 전략에 맞게 다시 구성하세요',
    conversionBody: '기존 제안서 내용을 발표용 메시지로 압축하면 평가장에서 기억되는 포인트가 선명해집니다.',
    conversionLinks: [
      { href: '/store?q=PPT', label: 'PPT 템플릿 보기' },
      { href: '/consulting', label: '발표자료 상담' },
    ],
    relatedLinks: [
      { href: '/store?q=PPT', label: 'PPT 자료 검색' },
      { href: '/landing/technical-proposal-template', label: '기술제안서 템플릿' },
      { href: '/consulting', label: '발표자료 컨설팅' },
    ],
    faqs: [
      {
        question: 'PPT 템플릿만 바꾸면 발표 품질이 좋아지나요?',
        answer: '디자인보다 먼저 발표 순서와 핵심 메시지가 정리되어야 합니다. 템플릿은 그 구조를 빠르게 시각화하는 도구로 쓰는 것이 좋습니다.',
      },
      {
        question: '제안서 PDF와 발표 PPT는 같은 목차여야 하나요?',
        answer: '완전히 같을 필요는 없지만 용어와 핵심 메시지는 일치해야 합니다. 발표자료는 평가자가 기억할 구조로 압축해야 합니다.',
      },
    ],
  },
  {
    slug: 'ai-proposal-writing',
    title: 'AI 제안서 작성: 도구에 상관없는 실무 활용법',
    shortTitle: 'AI 제안서 작성',
    description:
      'AI 도구를 활용해 RFP 분석, 제안서 초안, 요구사항 대응표, 검수 체크리스트를 만들고 사람이 최종 판단하는 실무 방법입니다.',
    primaryKeyword: 'AI 제안서 작성',
    keywords: ['AI 제안서 작성', 'AI 제안서', 'AI 문서 작업', 'AI RFP 분석', '제안서 자동화'],
    audience: 'AI를 제안 업무에 쓰고 싶지만 품질과 위험 문구를 통제해야 하는 실무자',
    commercialIntent: 'research',
    painPoints: [
      'AI가 만든 문장이 그럴듯하지만 원문 근거와 맞는지 확인하기 어렵습니다.',
      '요구사항 대응표, 초안, 검수표를 각각 따로 만들어 작업 흐름이 끊깁니다.',
      '보안, 실적, 가격, 제출 조건처럼 사람이 판단해야 할 항목이 AI 초안에 섞입니다.',
    ],
    solutions: [
      'AI에는 초벌 분류와 반복 문서 작업을 맡기고 최종 판단은 사람이 합니다.',
      'RFP 분석, 요구사항 대응표, 본문 초안, 검수 체크리스트를 하나의 흐름으로 연결합니다.',
      'AI 제안서 작성법 12편과 컨설팅을 통해 실무 적용 범위를 나눌 수 있습니다.',
    ],
    contentSections: [
      {
        title: 'AI가 맡기 좋은 작업',
        body: 'AI는 문서를 빨리 읽고 분류하는 데 강합니다. 반복되는 표와 체크리스트를 만들 때 특히 효과적입니다.',
        bullets: ['RFP 장별 요약', '요구사항 추출', '질의 후보 정리', '본문 초안 작성'],
      },
      {
        title: '사람이 반드시 확인할 작업',
        body: '참가자격, 실적 증빙, 보안 조건, 가격서, 제출 조건은 원문과 회사 자료를 기준으로 사람이 판단해야 합니다.',
        bullets: ['원문 근거 확인', '실적과 숫자 검증', '위험 문구 수정', '최종 제출 조건 확인'],
      },
      {
        title: 'AI 활용 범위를 나누는 방식',
        body: '도구 이름보다 역할 구분이 중요합니다. 분석과 초안, 이미지 시안, 표와 체크리스트 정리, 최종 검수를 나눠야 품질을 통제할 수 있습니다.',
        bullets: ['문서 분석: RFP 요약과 요구사항 추출', '이미지 생성: 시각자료 방향', '자료 정리: 표와 파일 목록', '사람: 검수와 책임 판단'],
      },
    ],
    conversionTitle: 'AI를 쓰되 제출 책임은 통제하세요',
    conversionBody: 'AI 초안이 빠른 만큼 원문 근거, 실적, 제출 조건 검수 체계가 필요합니다.',
    conversionLinks: [
      { href: '/ai-proposal-guide', label: 'AI 제안서 작성법 보기' },
      { href: '/consulting', label: 'AI 제안서 상담' },
    ],
    relatedLinks: [
      { href: '/ai-proposal-guide', label: 'AI 제안서 작성법 12편' },
      { href: '/ai-proposal-guide/ai-document-operations', label: 'AI 자료 정리' },
      { href: '/consulting', label: 'AI 활용 컨설팅' },
    ],
    faqs: [
      {
        question: 'AI로 만든 제안서를 그대로 제출해도 되나요?',
        answer: '권장하지 않습니다. AI는 초안과 정리에 쓰고, 원문 근거, 실적, 보안 조건, 제출 형식은 반드시 사람이 검수해야 합니다.',
      },
      {
        question: 'AI는 제안 업무에서 어떻게 나눠 쓰나요?',
        answer: 'RFP 해석과 초안 작성, 파일 목록 정리, 표와 체크리스트 작성처럼 반복 구조를 만드는 작업에 쓰고 최종 판단은 사람이 맡는 것이 효율적입니다.',
      },
    ],
  },
  {
    slug: 'public-bid-consulting',
    title: '공공입찰 컨설팅: 공고 검토부터 제안서 제출 준비까지',
    shortTitle: '공공입찰 컨설팅',
    description:
      '공공입찰 참여 가능성 검토, 나라장터 공고 확인, 제안서 전략, 증빙 자료, 제출 일정 관리를 한 흐름으로 정리하는 컨설팅 안내입니다.',
    primaryKeyword: '공공입찰 컨설팅',
    keywords: ['공공입찰 컨설팅', '나라장터 컨설팅', '조달청 입찰 컨설팅', '입찰 참여 검토', '제안서 컨설팅'],
    audience: '공공입찰을 매출 채널로 만들고 싶지만 공고 탐색과 제안 준비 체계가 부족한 기업',
    commercialIntent: 'consulting',
    painPoints: [
      '입찰 공고는 많지만 우리 회사가 들어갈 수 있는 공고를 고르는 기준이 없습니다.',
      '제안서 작성과 증빙 준비가 늦어져 좋은 공고를 보고도 참여하지 못합니다.',
      '반복 입찰을 해도 결과를 축적하지 않아 다음 제안서 품질이 개선되지 않습니다.',
    ],
    solutions: [
      '공고 탐색, 참가 가능성 판단, 제안서 준비, 제출 검수를 단계별로 나눕니다.',
      '문서 스토어, 입찰공고, 모닝브리프를 연결해 반복 가능한 수주 운영 흐름을 만듭니다.',
      '컨설팅을 통해 참여 우선순위와 제안서 보완 포인트를 정리합니다.',
    ],
    contentSections: [
      {
        title: '공공입찰을 매출 채널로 보는 기준',
        body: '입찰은 한 번의 제안서가 아니라 적합한 공고를 찾고 반복 학습하는 운영 체계입니다.',
        bullets: ['관심 분야 정의', '참가자격 매칭', '실적과 인증 정리', '제안서 자산화'],
      },
      {
        title: '컨설팅 범위',
        body: '공고 검토부터 제출 전 확인까지 기업 상황에 맞춰 필요한 구간만 선택할 수 있어야 비용과 시간을 통제할 수 있습니다.',
        bullets: ['공고 적합성 검토', '제안 전략 수립', '문서 목차 설계', '제출 전 체크'],
      },
      {
        title: 'PRESALES 활용 흐름',
        body: '입찰공고와 문서 스토어를 같은 사이트 안에서 연결하면 탐색과 작성 사이의 시간이 줄어듭니다.',
        bullets: ['공고 확인', '유사 자료 검색', 'AI 제안서 작성법 학습', '컨설팅 문의'],
      },
    ],
    conversionTitle: '공공입찰을 반복 가능한 매출 파이프라인으로 만드세요',
    conversionBody: '공고를 보는 데서 끝나지 않고 참여 판단, 제안 준비, 제출 검수까지 이어지는 운영 흐름을 잡습니다.',
    conversionLinks: [
      { href: '/announcements', label: '입찰공고 확인' },
      { href: '/consulting', label: '공공입찰 상담' },
    ],
    relatedLinks: [
      { href: '/announcements', label: '입찰공고 보기' },
      { href: '/landing/bid-proposal-consulting', label: '제안서 컨설팅' },
      { href: '/brief', label: '모닝브리프 보기' },
    ],
    faqs: [
      {
        question: '공공입찰 컨설팅은 제안서 작성만 의미하나요?',
        answer: '아닙니다. 공고 적합성 판단, 참가자격, 실적 정리, 제안 전략, 제출 전 검수까지 필요한 구간을 나누어 볼 수 있습니다.',
      },
      {
        question: '입찰 공고를 매일 봐야 하나요?',
        answer: '관심 분야가 정해져 있다면 매일 신규 공고와 마감 공고를 확인하는 편이 좋습니다. 모닝브리프와 공고 페이지를 함께 쓰면 누락을 줄일 수 있습니다.',
      },
    ],
  },
]

type LandingIntent = NonNullable<SeoLandingPage['commercialIntent']>

type LandingCategory =
  | 'publicBid'
  | 'technical'
  | 'smartIndustry'
  | 'templateStore'
  | 'preparation'
  | 'consulting'
  | 'support'

type LandingSeed = {
  slug: string
  title: string
  shortTitle: string
  primaryKeyword: string
  keywords: string[]
  category: LandingCategory
  commercialIntent: LandingIntent
  audience?: string
  description?: string
}

type LandingCategoryCopy = {
  audience: string
  painPoints: string[]
  solutions: string[]
  sectionBullets: [string[], string[], string[]]
  relatedLinks: SeoLandingPage['relatedLinks']
  conversionLinks: NonNullable<SeoLandingPage['conversionLinks']>
}

const LANDING_CATEGORY_COPY: Record<LandingCategory, LandingCategoryCopy> = {
  publicBid: {
    audience: '나라장터, 조달청, 공공기관 입찰을 매출 채널로 만들고 싶은 대표, 영업, 제안 실무자',
    painPoints: [
      '공고문, 제안요청서, 별첨 양식이 흩어져 있어 제안서 목차와 제출물 기준을 맞추기 어렵습니다.',
      '평가항목과 요구사항을 분리하지 못하면 본문은 길어지지만 실제 배점 대응은 약해집니다.',
      '참가자격, 증빙, 가격서, 제출 파일 같은 실무 조건을 늦게 확인하면 좋은 공고도 놓칠 수 있습니다.',
    ],
    solutions: [
      '공고 조건을 제안서 목차, 요구사항 대응표, 제출 체크리스트로 나누어 바로 실행 가능한 단위로 정리합니다.',
      '문서 스토어와 AI 제안서 작성법을 함께 연결해 초안 작성 시간을 줄이고 검수 기준을 남깁니다.',
      '컨설팅, 입찰공고, 모닝브리프 동선을 함께 제공해 검색 유입이 상담과 재방문으로 이어지게 합니다.',
    ],
    sectionBullets: [
      ['참가자격과 제한 조건', '평가항목과 배점', '제출 서류와 파일명', '질의 일정과 마감일'],
      ['요구사항 대응표 작성', '정량 증빙 위치 연결', '수행계획과 일정 정리', '제출 전 검수 항목 분리'],
      ['입찰공고 확인', '관련 템플릿 검색', 'AI 제안서 작성법 학습', '컨설팅 문의로 리스크 점검'],
    ],
    relatedLinks: [
      { href: '/announcements', label: '입찰공고 확인' },
      { href: '/ai-proposal-guide', label: 'AI 제안서 작성법' },
      { href: '/consulting', label: '입찰 컨설팅 문의' },
    ],
    conversionLinks: [
      { href: '/consulting', label: '입찰 컨설팅 문의' },
      { href: '/announcements', label: '공고 확인' },
    ],
  },
  technical: {
    audience: '기술 역량은 있지만 제안서 문서화, 발표자료, 평가 대응 문장으로 바꾸는 데 시간이 부족한 기술기업',
    painPoints: [
      '기술 설명이 기능 나열로 흐르면 평가자가 과업 이해와 수행 가능성을 빠르게 판단하기 어렵습니다.',
      '아키텍처, 일정, 인력, 보안, 유지보수 내용이 서로 다른 문서에 흩어져 수정이 반복됩니다.',
      '기술 장점은 있지만 공공기관 평가 언어와 정량 근거로 연결되지 않아 차별점이 약해집니다.',
    ],
    solutions: [
      '기술 내용을 사업 이해, 수행 방법, 산출물, 품질관리, 기대효과 흐름으로 재구성합니다.',
      'PPT와 PDF 제출본이 같은 메시지를 갖도록 목차, 표, 개념도 기준을 먼저 맞춥니다.',
      'IT피드와 모닝브리프를 연결해 기술 동향과 정책 근거를 제안 배경으로 활용합니다.',
    ],
    sectionBullets: [
      ['사업 목표와 기술 역할', '시스템 구성과 연계 방식', '수행 조직과 일정', '보안과 품질관리'],
      ['기술 강점의 평가 언어화', '아키텍처 도식 정리', '수행 범위와 산출물 연결', '유지보수 계획 보강'],
      ['기술제안서 템플릿 확인', '관련 IT피드 근거 수집', '발표자료 구조 설계', '제출 전 기술 리스크 검토'],
    ],
    relatedLinks: [
      { href: '/landing/technical-proposal-template', label: '기술제안서 템플릿' },
      { href: '/feeds', label: 'IT피드 확인' },
      { href: '/store?q=기술제안서', label: '기술제안서 자료 검색' },
    ],
    conversionLinks: [
      { href: '/store?q=기술제안서', label: '기술제안서 자료 보기' },
      { href: '/consulting', label: '기술제안서 상담' },
    ],
  },
  smartIndustry: {
    audience: '스마트시티, 스마트팩토리, 디지털트윈, AI/IoT 공공사업을 준비하는 제안 담당자와 기술 PM',
    painPoints: [
      '플랫폼, 데이터, 센서, 운영 서비스가 섞여 제안서 구조가 복잡해지고 핵심 메시지가 흐려집니다.',
      '정책 배경과 구축 효과를 정리하지 못하면 기술 도입 필요성이 약하게 보입니다.',
      '현장 운영, 데이터 보안, 유지관리 계획이 부족하면 평가자가 실행 가능성을 낮게 볼 수 있습니다.',
    ],
    solutions: [
      '서비스 시나리오, 데이터 흐름, 시스템 구성, 운영 체계를 분리해 평가자가 읽기 쉬운 구조를 만듭니다.',
      '스마트시티와 AI/IoT 관련 피드, 공고, 템플릿을 함께 연결해 제안 배경 근거를 강화합니다.',
      '도입 효과, 운영 KPI, 유지보수 계획을 제안서의 정량 근거로 정리합니다.',
    ],
    sectionBullets: [
      ['도시 문제와 사용자 시나리오', '데이터 수집과 연계 구조', '운영 대시보드와 KPI', '보안과 개인정보 보호'],
      ['플랫폼 구성도 작성', '현장 장비와 데이터 흐름 정리', '운영 조직과 유지관리 연결', '정량 기대효과 도출'],
      ['스마트시티 자료 검색', 'AI/IoT 피드 확인', '유사 공고 비교', '전문 컨설팅으로 구조 점검'],
    ],
    relatedLinks: [
      { href: '/landing/smartcity-ai-iot-proposal', label: '스마트시티 AI IoT 제안서' },
      { href: '/feeds?topic=ai', label: 'AI/IT피드 확인' },
      { href: '/store?q=스마트시티', label: '스마트시티 자료 검색' },
    ],
    conversionLinks: [
      { href: '/store?q=스마트시티', label: '스마트시티 자료 보기' },
      { href: '/consulting', label: '스마트시티 제안 상담' },
    ],
  },
  templateStore: {
    audience: '제안서 초안, 목차, PPT, 일정표, 가격 전략표를 빠르게 확보해야 하는 영업, 기획, 제안 실무자',
    painPoints: [
      '빈 문서에서 시작하면 목차와 표를 만드는 데 시간이 오래 걸리고 검토 기준도 매번 달라집니다.',
      '무료 자료와 유료 자료를 구분하지 못하면 실제 제출 품질에 필요한 근거가 부족할 수 있습니다.',
      'PPT, PDF, 엑셀 산출물이 서로 다른 형식으로 만들어져 내부 검토와 제출 준비가 늦어집니다.',
    ],
    solutions: [
      '검색 의도별 템플릿 페이지에서 필요한 문서 유형을 먼저 고르고 스토어로 이동할 수 있게 합니다.',
      '목차, 일정, 요약서, 가격 전략, 발표자료처럼 반복되는 제안 산출물을 페이지별로 분리합니다.',
      '자료 구매 후 컨설팅과 AI 제안서 작성법으로 이어지는 후속 동선을 제공합니다.',
    ],
    sectionBullets: [
      ['목차와 표 구조', 'PPT와 PDF 용도 분리', '엑셀 일정표와 WBS', '제출 형식과 파일명'],
      ['기존 자료 재사용 범위 확인', '공고 조건에 맞춘 문구 수정', '증빙 위치와 표 번호 연결', '가격 정보 분리 관리'],
      ['문서 스토어 검색', '무료 자료로 구조 확인', '유료 템플릿으로 시간 단축', '검수 상담으로 제출 리스크 점검'],
    ],
    relatedLinks: [
      { href: '/store', label: '문서 스토어' },
      { href: '/landing/proposal-ppt-template', label: '제안서 PPT 템플릿' },
      { href: '/consulting', label: '문서 검토 상담' },
    ],
    conversionLinks: [
      { href: '/store', label: '문서 스토어 보기' },
      { href: '/consulting', label: '템플릿 활용 상담' },
    ],
  },
  preparation: {
    audience: '입찰 참여 여부를 판단하고 제출 전까지 필요한 작업을 빠짐없이 관리해야 하는 제안 PM',
    painPoints: [
      '일정, 요구사항, 제출 서류, 가격 검토가 동시에 움직여 담당자별 누락이 생기기 쉽습니다.',
      'RFP 분석 결과가 실제 작업표로 이어지지 않으면 마감 직전에 수정과 검수가 몰립니다.',
      '평가 전략과 요약서가 늦게 정리되면 제안서 전체 메시지가 흔들립니다.',
    ],
    solutions: [
      '준비 단계별 체크리스트를 만들어 참여 판단, 작성, 검수, 제출을 하나의 일정으로 관리합니다.',
      'RFP 분석, 평가전략, 요약서, 일정계획, 가격전략을 독립 페이지로 분리해 검색 의도에 맞게 연결합니다.',
      '컨설팅과 스토어 자료를 함께 연결해 부족한 구간만 빠르게 보완할 수 있게 합니다.',
    ],
    sectionBullets: [
      ['마감일 역산', '담당자와 검수자 지정', '필수 제출물 확인', '가격서와 증빙 분리'],
      ['RFP 요구사항 분류', '평가 배점 기준 정리', '핵심 메시지와 요약서 작성', '제출 파일 최종 확인'],
      ['준비 체크리스트 활용', '관련 템플릿 구매', 'AI 초안 작성법 참고', '제출 전 검수 문의'],
    ],
    relatedLinks: [
      { href: '/landing/rfp-analysis-service', label: 'RFP 분석 서비스' },
      { href: '/landing/proposal-review-check', label: '제출 전 검수' },
      { href: '/ai-proposal-guide', label: 'AI 제안서 작성법' },
    ],
    conversionLinks: [
      { href: '/consulting', label: '준비 일정 상담' },
      { href: '/ai-proposal-guide', label: '작성법 보기' },
    ],
  },
  consulting: {
    audience: '제안서 작성 체계를 만들거나 특정 공고의 수주 가능성을 높이기 위해 외부 검토가 필요한 기업',
    painPoints: [
      '내부에서 작성한 제안서가 공고 평가항목과 정확히 맞는지 판단하기 어렵습니다.',
      '반복 입찰을 해도 실패 원인과 개선 기준이 기록되지 않아 다음 제안서에 반영되지 않습니다.',
      '일정이 촉박할수록 전략, 본문, 증빙, 제출 형식이 따로 움직여 리스크가 커집니다.',
    ],
    solutions: [
      '공고 적합성, RFP 분석, 제안 전략, 본문 구조, 제출 전 검수를 필요한 구간별로 나누어 지원합니다.',
      'AI 초안과 기존 자료를 그대로 쓰지 않고 원문 근거와 실적 기준으로 위험 문구를 정리합니다.',
      '컨설팅 이후에도 재사용 가능한 체크리스트와 문서 구조를 남겨 다음 입찰 준비 시간을 줄입니다.',
    ],
    sectionBullets: [
      ['공고 적합성 판단', '제안 전략과 핵심 메시지', '요구사항 대응표', '제출 전 체크리스트'],
      ['기존 제안서 진단', '평가항목별 보완', '위험 문구와 과장 표현 수정', '증빙과 본문 위치 연결'],
      ['컨설팅 문의', 'RFP와 공고 URL 공유', '검토 범위 확정', '수정 우선순위 정리'],
    ],
    relatedLinks: [
      { href: '/consulting', label: '제안서 컨설팅 문의' },
      { href: '/landing/bid-proposal-consulting', label: '입찰 제안서 컨설팅' },
      { href: '/landing/proposal-review-check', label: '제출 전 검토' },
    ],
    conversionLinks: [
      { href: '/consulting', label: '컨설팅 문의' },
      { href: '/landing/proposal-review-check', label: '검토 항목 보기' },
    ],
  },
  support: {
    audience: '정부지원사업, R&D 과제, 정책자금 제안서를 준비하는 스타트업, 중소기업, 사업개발 담당자',
    painPoints: [
      '지원사업은 기술성, 사업성, 예산, 수행역량을 동시에 보여줘야 해서 제안서 구조가 쉽게 흐트러집니다.',
      '정부지원사업 용어와 공공입찰 제안서 문법이 달라 기존 회사소개서만으로는 평가 대응이 부족합니다.',
      '사업계획, 일정, 예산, 성과지표가 연결되지 않으면 심사자가 실행 가능성을 낮게 판단할 수 있습니다.',
    ],
    solutions: [
      '사업 목표, 추진 체계, 예산, 성과지표, 확산 계획을 평가 기준에 맞게 재구성합니다.',
      'R&D와 정책자금 제안서에서 필요한 기술 차별성, 시장성, 수행역량 근거를 분리해 정리합니다.',
      '템플릿, AI 작성법, 컨설팅을 연결해 짧은 공고 기간에도 제출 가능한 구조를 만듭니다.',
    ],
    sectionBullets: [
      ['지원 목적과 평가 기준', '사업계획과 예산', '성과지표와 기대효과', '수행조직과 일정'],
      ['기술성과 사업성 분리', '시장 근거와 고객 문제 연결', '예산 사용 계획 정리', '성과 확산 계획 작성'],
      ['지원사업 템플릿 확인', 'RFP 분석 방식 적용', '요약서와 발표자료 준비', '컨설팅으로 리스크 점검'],
    ],
    relatedLinks: [
      { href: '/store?q=지원사업', label: '지원사업 자료 검색' },
      { href: '/ai-proposal-guide', label: 'AI 제안서 작성법' },
      { href: '/consulting', label: '지원사업 제안 상담' },
    ],
    conversionLinks: [
      { href: '/consulting', label: '지원사업 상담' },
      { href: '/store?q=지원사업', label: '관련 자료 보기' },
    ],
  },
}

function landingSeed(
  slug: string,
  title: string,
  shortTitle: string,
  primaryKeyword: string,
  keywords: string[],
  category: LandingCategory,
  commercialIntent: LandingIntent,
): LandingSeed {
  return { slug, title, shortTitle, primaryKeyword, keywords, category, commercialIntent }
}

const EXPANDED_LANDING_SEEDS: LandingSeed[] = [
  landingSeed('government-bid-proposal', '정부입찰 제안서 작성 자료', '정부입찰 제안서', '정부입찰 제안서', ['정부입찰 제안서', '공공입찰 제안서', '나라장터 제안서', '입찰 제안서 작성'], 'publicBid', 'consulting'),
  landingSeed('narajangteo-proposal-template', '나라장터 제안서 템플릿과 제출 준비', '나라장터 제안서 템플릿', '나라장터 제안서 템플릿', ['나라장터 제안서 템플릿', '나라장터 입찰 제안서', '조달청 제안서 양식', '입찰 제안서 템플릿'], 'publicBid', 'template'),
  landingSeed('public-bid-document-template', '공공입찰 서류 양식과 제출 체크리스트', '공공입찰 서류 양식', '공공입찰 서류 양식', ['공공입찰 서류 양식', '입찰 제출 서류', '나라장터 제출 서류', '입찰 문서 양식'], 'publicBid', 'template'),
  landingSeed('bid-proposal-writing-guide', '입찰 제안서 작성 가이드', '입찰 제안서 작성', '입찰 제안서 작성 가이드', ['입찰 제안서 작성', '제안서 작성 가이드', '공공입찰 제안서 작성', '수주 제안서 작성'], 'publicBid', 'research'),
  landingSeed('government-rfp-response', '공공 RFP 대응 제안서 작성법', '공공 RFP 대응', '공공 RFP 대응', ['공공 RFP 대응', '제안요청서 대응', 'RFP 제안서', '요구사항 대응표'], 'publicBid', 'consulting'),
  landingSeed('public-sector-proposal-template', '공공기관 제안서 템플릿', '공공기관 제안서', '공공기관 제안서 템플릿', ['공공기관 제안서', '공공기관 제안서 템플릿', '공공사업 제안서', '공공기관 입찰 제안서'], 'publicBid', 'template'),
  landingSeed('procurement-evaluation-proposal', '조달 평가항목 대응 제안서', '조달 평가 제안서', '조달 평가항목 제안서', ['조달 평가항목', '입찰 평가 대응', '정성평가 제안서', '평가항목 대응표'], 'publicBid', 'review'),
  landingSeed('bid-winning-proposal-reference', '수주 제안서 레퍼런스와 참고 구조', '수주 제안서 레퍼런스', '수주 제안서 레퍼런스', ['수주 제안서', '제안서 레퍼런스', '입찰 수주 사례', '제안서 참고자료'], 'publicBid', 'research'),
  landingSeed('technical-proposal-writing', '기술제안서 작성법과 평가 대응', '기술제안서 작성', '기술제안서 작성법', ['기술제안서 작성', '기술제안서 작성법', '기술 제안서 목차', '기술 평가 제안서'], 'technical', 'research'),
  landingSeed('it-technical-proposal', 'IT 기술제안서 작성 자료', 'IT 기술제안서', 'IT 기술제안서', ['IT 기술제안서', 'IT 제안서', '정보화사업 제안서', 'SI 제안서'], 'technical', 'consulting'),
  landingSeed('si-project-proposal', 'SI 프로젝트 제안서 템플릿과 작성 기준', 'SI 프로젝트 제안서', 'SI 프로젝트 제안서', ['SI 프로젝트 제안서', '시스템통합 제안서', 'IT 프로젝트 제안서', '구축 제안서'], 'technical', 'template'),
  landingSeed('software-development-proposal', '소프트웨어 개발 제안서 작성 자료', 'SW 개발 제안서', '소프트웨어 개발 제안서', ['소프트웨어 개발 제안서', 'SW 개발 제안서', '개발용역 제안서', '앱 개발 제안서'], 'technical', 'template'),
  landingSeed('system-integration-proposal', '시스템 통합 제안서 작성 자료', '시스템 통합 제안서', '시스템 통합 제안서', ['시스템 통합 제안서', 'SI 제안서', '정보시스템 구축 제안서', '통합 구축 제안서'], 'technical', 'template'),
  landingSeed('solution-proposal-template', '솔루션 제안서 템플릿', '솔루션 제안서', '솔루션 제안서 템플릿', ['솔루션 제안서', '솔루션 제안서 템플릿', 'B2B 제안서', '제품 제안서'], 'templateStore', 'template'),
  landingSeed('service-proposal-template', '서비스 제안서 템플릿', '서비스 제안서', '서비스 제안서 템플릿', ['서비스 제안서', '서비스 제안서 템플릿', '운영 제안서', '용역 제안서'], 'templateStore', 'template'),
  landingSeed('project-proposal-template', '프로젝트 제안서 템플릿', '프로젝트 제안서', '프로젝트 제안서 템플릿', ['프로젝트 제안서', '프로젝트 제안서 템플릿', '사업 제안서', '수행계획서'], 'templateStore', 'template'),
  landingSeed('proposal-table-of-contents', '제안서 목차 구성과 항목별 작성법', '제안서 목차', '제안서 목차', ['제안서 목차', '제안서 구성', '제안서 항목', '제안서 작성 순서'], 'templateStore', 'research'),
  landingSeed('information-system-proposal', '정보시스템 제안서 작성 자료', '정보시스템 제안서', '정보시스템 제안서', ['정보시스템 제안서', '정보화사업 제안서', '시스템 구축 제안서', '공공 IT 제안서'], 'technical', 'consulting'),
  landingSeed('public-it-project-proposal', '공공 IT 사업 제안서 작성 가이드', '공공 IT 사업 제안서', '공공 IT 사업 제안서', ['공공 IT 사업 제안서', '공공정보화 제안서', '공공 IT 입찰', '정보화사업 입찰'], 'technical', 'consulting'),
  landingSeed('digital-transformation-proposal', '디지털 전환 제안서 작성 자료', '디지털 전환 제안서', '디지털 전환 제안서', ['디지털 전환 제안서', 'DX 제안서', '디지털 혁신 제안서', '공공 DX 사업'], 'smartIndustry', 'consulting'),
  landingSeed('cloud-service-proposal', '클라우드 서비스 제안서 작성 자료', '클라우드 제안서', '클라우드 서비스 제안서', ['클라우드 서비스 제안서', '클라우드 구축 제안서', 'SaaS 제안서', '공공 클라우드 제안서'], 'technical', 'template'),
  landingSeed('data-platform-proposal', '데이터 플랫폼 제안서 작성 자료', '데이터 플랫폼 제안서', '데이터 플랫폼 제안서', ['데이터 플랫폼 제안서', '빅데이터 제안서', '데이터 구축 제안서', '데이터 분석 제안서'], 'technical', 'template'),
  landingSeed('ai-service-proposal', 'AI 서비스 제안서 작성 자료', 'AI 서비스 제안서', 'AI 서비스 제안서', ['AI 서비스 제안서', '인공지능 제안서', 'AI 구축 제안서', 'AI 공공사업 제안서'], 'technical', 'template'),
  landingSeed('iot-platform-proposal', 'IoT 플랫폼 제안서 작성 자료', 'IoT 플랫폼 제안서', 'IoT 플랫폼 제안서', ['IoT 플랫폼 제안서', 'IoT 제안서', '사물인터넷 제안서', 'IoT 구축 제안서'], 'technical', 'template'),
  landingSeed('security-solution-proposal', '보안 솔루션 제안서 작성 자료', '보안 솔루션 제안서', '보안 솔루션 제안서', ['보안 솔루션 제안서', '정보보안 제안서', '보안 구축 제안서', '보안 사업 제안서'], 'technical', 'template'),
  landingSeed('homepage-renewal-proposal', '홈페이지 리뉴얼 제안서 템플릿', '홈페이지 리뉴얼 제안서', '홈페이지 리뉴얼 제안서', ['홈페이지 리뉴얼 제안서', '웹사이트 구축 제안서', '홈페이지 구축 제안서', '웹 제안서'], 'technical', 'template'),
  landingSeed('app-development-proposal', '앱 개발 제안서 템플릿', '앱 개발 제안서', '앱 개발 제안서', ['앱 개발 제안서', '모바일 앱 제안서', '앱 구축 제안서', '개발 제안서 템플릿'], 'technical', 'template'),
  landingSeed('smartcity-proposal-template', '스마트시티 제안서 템플릿', '스마트시티 제안서', '스마트시티 제안서 템플릿', ['스마트시티 제안서', '스마트시티 제안서 템플릿', '도시 데이터 플랫폼', '스마트시티 입찰'], 'smartIndustry', 'template'),
  landingSeed('smart-factory-proposal', '스마트팩토리 제안서 작성 자료', '스마트팩토리 제안서', '스마트팩토리 제안서', ['스마트팩토리 제안서', '스마트공장 제안서', '제조 DX 제안서', '스마트 제조 제안서'], 'smartIndustry', 'template'),
  landingSeed('ai-iot-technical-proposal', 'AI IoT 기술제안서 작성 자료', 'AI IoT 기술제안서', 'AI IoT 기술제안서', ['AI IoT 기술제안서', 'AI IoT 제안서', '스마트시티 AI 제안서', 'IoT 기술제안서'], 'smartIndustry', 'template'),
  landingSeed('urban-data-platform-proposal', '도시 데이터 플랫폼 제안서 작성 자료', '도시 데이터 플랫폼 제안서', '도시 데이터 플랫폼 제안서', ['도시 데이터 플랫폼 제안서', '스마트시티 데이터 플랫폼', '도시데이터 제안서', '데이터 허브 제안서'], 'smartIndustry', 'template'),
  landingSeed('digital-twin-proposal', '디지털 트윈 제안서 작성 자료', '디지털 트윈 제안서', '디지털 트윈 제안서', ['디지털 트윈 제안서', '디지털트윈 구축 제안서', '스마트시티 디지털트윈', '공간정보 제안서'], 'smartIndustry', 'template'),
  landingSeed('smart-mobility-proposal', '스마트 모빌리티 제안서 작성 자료', '스마트 모빌리티 제안서', '스마트 모빌리티 제안서', ['스마트 모빌리티 제안서', '교통 플랫폼 제안서', '스마트 교통 제안서', '모빌리티 사업 제안서'], 'smartIndustry', 'template'),
  landingSeed('smart-safety-proposal', '스마트 안전 제안서 작성 자료', '스마트 안전 제안서', '스마트 안전 제안서', ['스마트 안전 제안서', '안전 플랫폼 제안서', '재난안전 제안서', '스마트 안전관리 제안서'], 'smartIndustry', 'template'),
  landingSeed('proposal-template-store', '제안서 템플릿 스토어 안내', '제안서 템플릿 스토어', '제안서 템플릿 스토어', ['제안서 템플릿 스토어', '제안서 템플릿 구매', 'PPT 제안서 템플릿', '공공입찰 템플릿'], 'templateStore', 'template'),
  landingSeed('free-proposal-template', '무료 제안서 템플릿과 활용 기준', '무료 제안서 템플릿', '무료 제안서 템플릿', ['무료 제안서 템플릿', '제안서 무료 양식', '무료 PPT 제안서', '입찰 제안서 무료 자료'], 'templateStore', 'template'),
  landingSeed('paid-proposal-template', '유료 제안서 템플릿 구매 가이드', '유료 제안서 템플릿', '유료 제안서 템플릿', ['유료 제안서 템플릿', '제안서 템플릿 구매', '프리미엄 제안서', '입찰 제안서 자료'], 'templateStore', 'template'),
  landingSeed('ppt-proposal-template', 'PPT 제안서 템플릿 모음', 'PPT 제안서 템플릿', 'PPT 제안서 템플릿', ['PPT 제안서 템플릿', '제안서 PPT 양식', '입찰 발표 PPT', '기술제안서 PPT'], 'templateStore', 'template'),
  landingSeed('pdf-proposal-sample', 'PDF 제안서 샘플과 제출본 검토 기준', 'PDF 제안서 샘플', 'PDF 제안서 샘플', ['PDF 제안서 샘플', '제안서 PDF', '입찰 제안서 샘플', '제출용 제안서'], 'templateStore', 'template'),
  landingSeed('original-proposal-document', '오리지널 제안서 문서와 참고 자료', '오리지널 제안서 문서', '오리지널 제안서 문서', ['오리지널 제안서', '제안서 원본 문서', '제안서 참고자료', '수주 제안서 문서'], 'templateStore', 'template'),
  landingSeed('proposal-copy-document', '제안서 사본 문서 활용과 수정 기준', '제안서 사본 문서', '제안서 사본 문서', ['제안서 사본', '제안서 참고 문서', '제안서 수정 기준', '기존 제안서 활용'], 'templateStore', 'research'),
  landingSeed('wbs-excel-template', 'WBS 엑셀 템플릿과 제안 일정표', 'WBS 엑셀 템플릿', 'WBS 엑셀 템플릿', ['WBS 엑셀 템플릿', '제안 일정표', '프로젝트 일정표', '수행계획 엑셀'], 'templateStore', 'template'),
  landingSeed('business-proposal-template', '사업 제안서 템플릿과 작성 구조', '사업 제안서 템플릿', '사업 제안서 템플릿', ['사업 제안서 템플릿', '비즈니스 제안서', '사업계획 제안서', 'B2B 제안서'], 'templateStore', 'template'),
  landingSeed('project-schedule-template', '프로젝트 일정표 템플릿과 제안 일정 관리', '프로젝트 일정표 템플릿', '프로젝트 일정표 템플릿', ['프로젝트 일정표 템플릿', '제안 일정표', '프로젝트 스케줄', 'WBS 일정표'], 'templateStore', 'template'),
  landingSeed('bid-preparation-guide', '입찰 준비 가이드와 제출 전 일정 관리', '입찰 준비 가이드', '입찰 준비 가이드', ['입찰 준비 가이드', '입찰 준비 체크리스트', '나라장터 입찰 준비', '제안서 준비'], 'preparation', 'research'),
  landingSeed('proposal-evaluation-strategy', '제안서 평가 전략과 배점 대응', '제안서 평가 전략', '제안서 평가 전략', ['제안서 평가 전략', '평가항목 대응', '입찰 배점 대응', '정성평가 전략'], 'preparation', 'review'),
  landingSeed('rfp-analysis-guide', 'RFP 분석 가이드와 요구사항 정리', 'RFP 분석 가이드', 'RFP 분석 가이드', ['RFP 분석 가이드', '제안요청서 분석', '요구사항 정리', 'RFP 대응표'], 'preparation', 'research'),
  landingSeed('proposal-executive-summary', '제안서 요약서 작성법과 핵심 메시지', '제안서 요약서', '제안서 요약서', ['제안서 요약서', 'Executive Summary', '제안서 핵심 메시지', '제안 요약'], 'templateStore', 'research'),
  landingSeed('proposal-schedule-plan', '제안서 일정계획 작성과 수행 일정표', '제안서 일정계획', '제안서 일정계획', ['제안서 일정계획', '수행 일정표', '프로젝트 일정 계획', '제안 일정 관리'], 'preparation', 'template'),
  landingSeed('proposal-price-strategy', '제안서 가격 전략과 비용 산정 기준', '제안서 가격 전략', '제안서 가격 전략', ['제안서 가격 전략', '입찰 가격 전략', '제안 금액 산정', '가격서 작성'], 'preparation', 'review'),
  landingSeed('proposal-presentation-template', '제안 발표자료 템플릿과 PT 구성', '제안 발표자료 템플릿', '제안 발표자료 템플릿', ['제안 발표자료 템플릿', '제안 PT', '입찰 발표자료', '제안서 발표 PPT'], 'templateStore', 'template'),
  landingSeed('bid-document-checklist', '입찰 서류 체크리스트와 제출 전 검수', '입찰 서류 체크리스트', '입찰 서류 체크리스트', ['입찰 서류 체크리스트', '제출 서류 검수', '입찰 제출 체크리스트', '나라장터 제출 확인'], 'preparation', 'review'),
  landingSeed('proposal-consulting', '제안서 컨설팅과 작성 지원 범위', '제안서 컨설팅', '제안서 컨설팅', ['제안서 컨설팅', '제안서 작성 지원', '제안서 검토', '입찰 제안서 상담'], 'consulting', 'consulting'),
  landingSeed('technical-proposal-consulting', '기술제안서 컨설팅과 평가 대응 지원', '기술제안서 컨설팅', '기술제안서 컨설팅', ['기술제안서 컨설팅', '기술 제안서 검토', 'IT 제안서 컨설팅', '기술 평가 대응'], 'consulting', 'consulting'),
  landingSeed('startup-support-proposal', '창업지원사업 제안서 작성 자료', '창업지원사업 제안서', '창업지원사업 제안서', ['창업지원사업 제안서', '스타트업 지원사업 제안서', '창업 사업계획서', '정부지원사업 제안서'], 'support', 'consulting'),
  landingSeed('government-support-project-proposal', '정부지원사업 제안서 작성 가이드', '정부지원사업 제안서', '정부지원사업 제안서', ['정부지원사업 제안서', '지원사업 사업계획서', '정부과제 제안서', '정책사업 제안서'], 'support', 'consulting'),
  landingSeed('rnd-project-proposal', 'R&D 과제 제안서 작성 자료', 'R&D 과제 제안서', 'R&D 과제 제안서', ['R&D 과제 제안서', '연구개발 제안서', '정부 R&D 과제', '기술개발 사업계획서'], 'support', 'consulting'),
  landingSeed('policy-fund-proposal', '정책자금 제안서와 사업계획서 작성', '정책자금 제안서', '정책자금 제안서', ['정책자금 제안서', '정책자금 사업계획서', '정부자금 제안서', '자금지원 사업계획서'], 'support', 'consulting'),
]

function createGeneratedLandingPage(seed: LandingSeed): SeoLandingPage {
  const copy = LANDING_CATEGORY_COPY[seed.category]
  const uniqueKeywords = Array.from(new Set([seed.primaryKeyword, ...seed.keywords])).slice(0, 6)
  return {
    slug: seed.slug,
    title: seed.title,
    shortTitle: seed.shortTitle,
    description:
      seed.description ??
      `${seed.primaryKeyword}을 준비하는 담당자를 위해 검색 의도, 작성 기준, 검토 항목, 문서 구매와 컨설팅 연결 동선을 한 페이지에 정리했습니다.`,
    primaryKeyword: seed.primaryKeyword,
    keywords: uniqueKeywords,
    audience: seed.audience ?? copy.audience,
    commercialIntent: seed.commercialIntent,
    painPoints: [
      `${seed.primaryKeyword}은 공고 조건, 평가 기준, 제출 형식이 함께 움직이기 때문에 초기에 구조를 잡지 못하면 수정이 반복됩니다.`,
      ...copy.painPoints.slice(0, 2),
    ],
    solutions: [
      `${seed.primaryKeyword} 페이지에서 검색 의도와 다음 행동을 분리해 자료 구매, 컨설팅, 공고 확인으로 연결합니다.`,
      ...copy.solutions.slice(0, 2),
    ],
    contentSections: [
      {
        title: `${seed.shortTitle} 준비 기준`,
        body: `${seed.primaryKeyword}을 준비할 때는 키워드만 맞추는 것이 아니라 실제 공고 조건, 평가항목, 제출 형식, 내부 검토 순서를 함께 확인해야 합니다.`,
        bullets: copy.sectionBullets[0],
      },
      {
        title: '제안서 작성과 검토로 연결하는 방법',
        body: '검색으로 들어온 사용자가 바로 떠나지 않도록 목차, 표, 체크리스트, 상담 동선을 연결해 실제 작성 단계로 넘어갈 수 있게 구성합니다.',
        bullets: copy.sectionBullets[1],
      },
      {
        title: 'PRESALES에서 다음 행동 만들기',
        body: '문서 스토어, 입찰공고, AI 제안서 작성법, 컨설팅을 함께 연결하면 단순 정보 탐색을 구매와 문의로 전환할 수 있습니다.',
        bullets: copy.sectionBullets[2],
      },
    ],
    relatedLinks: copy.relatedLinks,
    conversionTitle: `${seed.shortTitle}을 실제 제안 작업으로 연결하세요`,
    conversionBody: `${seed.primaryKeyword} 검색 유입이 문서 구매, 공고 검토, 컨설팅 문의로 이어지도록 필요한 자료와 다음 행동을 함께 제공합니다.`,
    conversionLinks: copy.conversionLinks,
    faqs: [
      {
        question: `${seed.primaryKeyword} 페이지는 어떤 상황에서 쓰나요?`,
        answer: `${seed.primaryKeyword}을 검색한 담당자가 공고 조건, 제안서 목차, 제출 준비, 자료 구매 또는 상담 필요성을 빠르게 판단할 때 사용할 수 있습니다.`,
      },
      {
        question: '자료 구매와 컨설팅은 어떻게 나누면 좋나요?',
        answer: '반복되는 목차와 양식은 문서 스토어 자료로 시간을 줄이고, 공고별 참가자격, 평가 전략, 제출 전 리스크는 컨설팅으로 점검하는 흐름이 적합합니다.',
      },
    ],
  }
}

function withNaverRegistration(page: SeoLandingPage): SeoLandingPage {
  if (NAVER_UNREGISTERED_LANDING_SLUG_SET.has(page.slug)) {
    return { ...page, naverRegistrationStatus: 'unregistered' }
  }
  if (NAVER_REGISTERED_LANDING_SLUG_SET.has(page.slug)) {
    return { ...page, naverRegistrationStatus: 'registered', naverRegistrationDate: NAVER_REGISTRATION_DATE }
  }
  return page
}

function findDuplicateSlugs(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return [...duplicates]
}

const NAVER_REGISTERED_LANDING_SLUG_SET = new Set<string>(NAVER_REGISTERED_LANDING_SLUGS)
const NAVER_UNREGISTERED_LANDING_SLUG_SET = new Set<string>(NAVER_UNREGISTERED_LANDING_SLUGS)
const NAVER_TRACKED_LANDING_SLUGS = Array.from(
  new Set<string>([...NAVER_REGISTERED_LANDING_SLUGS, ...NAVER_UNREGISTERED_LANDING_SLUGS]),
)
const CORE_SEO_LANDING_SLUG_SET = new Set<string>(CORE_SEO_LANDING_PAGES.map((page) => page.slug))
const GENERATED_SEO_LANDING_PAGES = EXPANDED_LANDING_SEEDS
  .filter((seed) => !CORE_SEO_LANDING_SLUG_SET.has(seed.slug))
  .map(createGeneratedLandingPage)

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  ...CORE_SEO_LANDING_PAGES,
  ...GENERATED_SEO_LANDING_PAGES,
].map(withNaverRegistration)

const duplicateSeoLandingSlugs = findDuplicateSlugs(SEO_LANDING_PAGES.map((page) => page.slug))
if (duplicateSeoLandingSlugs.length > 0) {
  throw new Error(`Duplicate SEO landing slugs: ${duplicateSeoLandingSlugs.join(', ')}`)
}

const SEO_LANDING_SLUG_SET = new Set<string>(SEO_LANDING_PAGES.map((page) => page.slug))
const missingTrackedLandingSlugs = NAVER_TRACKED_LANDING_SLUGS.filter((slug) => !SEO_LANDING_SLUG_SET.has(slug))
if (missingTrackedLandingSlugs.length > 0) {
  throw new Error(`Tracked Naver landing slugs are missing pages: ${missingTrackedLandingSlugs.join(', ')}`)
}

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find((page) => page.slug === slug)
}

export function getSeoLandingDescription(page: Pick<SeoLandingPage, 'description' | 'primaryKeyword'>): string {
  const source = page.description.length >= 95
    ? page.description
    : `${page.description} ${page.primaryKeyword} 관련 문서 구매, 컨설팅 문의, RFP 분석, 제출 전 검수까지 이어지는 실무 동선을 확인하세요.`
  return source.length <= 160 ? source : `${source.slice(0, 157).trim()}…`
}

export function getSeoLandingPagesByIntent(intent: SeoLandingPage['commercialIntent']): SeoLandingPage[] {
  return SEO_LANDING_PAGES.filter((page) => page.commercialIntent === intent)
}

export function getNaverLandingPagesByStatus(status: NaverRegistrationStatus): SeoLandingPage[] {
  return SEO_LANDING_PAGES.filter((page) => page.naverRegistrationStatus === status)
}

export function seoLandingUrl(slug: string): string {
  return `${SITE_URL}/landing/${slug}`
}

export function naverLandingUrl(slug: string): string {
  return `${NAVER_LANDING_SITE_URL}/landing/${slug}`
}
