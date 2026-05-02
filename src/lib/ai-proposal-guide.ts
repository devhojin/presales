import { SITE_URL } from '@/lib/constants'

export const AI_PROPOSAL_GUIDE_BASE_PATH = '/ai-proposal-guide'
export const AI_PROPOSAL_GUIDE_PUBLISHED_AT = '2026-05-02T09:00:00+09:00'
export const AI_PROPOSAL_GUIDE_SETTING_KEY = 'ai_proposal_guide_content'
export const AI_PROPOSAL_GUIDE_TITLE = 'AI 제안서 작성법'
export const AI_PROPOSAL_GUIDE_DESCRIPTION =
  'ChatGPT, 이미지 생성, Codex를 활용해 RFP 분석부터 나라장터 입찰 제출까지 따라가는 AI 제안서 작성 실무 콘텐츠입니다.'
export const AI_PROPOSAL_GUIDE_OG_IMAGE = '/images/hero-ai-readiness.webp'
export const AI_PROPOSAL_GUIDE_KEYWORDS = [
  'AI 제안서 작성법',
  'ChatGPT 제안서',
  'Codex 제안서',
  '나라장터 입찰',
  'RFP 분석',
]

export const AI_PROPOSAL_COVER_THEMES = [
  'ink',
  'blueprint',
  'copper',
  'mint',
  'rose',
  'sand',
  'violet',
  'graphite',
] as const

export type AiProposalCoverTheme = typeof AI_PROPOSAL_COVER_THEMES[number]

export type AiProposalGuideCategory = {
  id: string
  slug: string
  title: string
  eyebrow: string
  description: string
  sortOrder: number
  isPublished: boolean
}

export type AiProposalGuideSeed = {
  slug: string
  step: number
  title: string
  shortTitle: string
  description: string
  primaryKeyword: string
  keywords: string[]
  readingMinutes: number
  situation: string[]
  aiUse: string[]
  humanCheck: string[]
  promptExample: string
  outputExample: {
    title: string
    items: string[]
  }
  nextAction: string
}

export type AiProposalGuideStep = AiProposalGuideSeed & {
  id: string
  categorySlug: string
  sortOrder: number
  isPublished: boolean
  publishedAt: string
  updatedAt: string
  coverTitle: string
  coverSubtitle: string
  coverTheme: AiProposalCoverTheme
  coverImageUrl: string
  bodyHtml: string
}

export type AiProposalGuideContent = {
  version: 1
  updatedAt: string
  categories: AiProposalGuideCategory[]
  articles: AiProposalGuideStep[]
}

export const AI_PROPOSAL_GUIDE_CATEGORIES: AiProposalGuideCategory[] = [
  {
    id: 'rfp-analysis',
    slug: 'rfp-analysis',
    title: 'RFP 분석',
    eyebrow: '01-04',
    description: '발주 흐름, 공고 조건, RFP 요구사항, 대응표까지 제안 준비의 앞단을 정리합니다.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    id: 'proposal-writing',
    slug: 'proposal-writing',
    title: '제안서 작성',
    eyebrow: '05-08',
    description: '수주 전략, 목차, 본문 초안, 제안서용 이미지까지 문서의 설득력을 만듭니다.',
    sortOrder: 2,
    isPublished: true,
  },
  {
    id: 'submission-review',
    slug: 'submission-review',
    title: '검수와 제출',
    eyebrow: '09-12',
    description: 'Codex 자료 정리, 컨소시엄 역할, 최종 검수, 나라장터 제출 확인까지 마무리합니다.',
    sortOrder: 3,
    isPublished: true,
  },
]

const AI_PROPOSAL_GUIDE_SEEDS: AiProposalGuideSeed[] = [
  {
    slug: 'rfp-origin',
    step: 1,
    title: 'RFP는 어떻게 만들어지는가',
    shortTitle: 'RFP 발생 과정',
    description:
      '발주 계획, 사전규격, 본공고로 이어지는 RFP 발생 과정을 이해하고 AI로 제안 준비 타임라인을 정리하는 방법을 설명합니다.',
    primaryKeyword: 'RFP 발생 과정',
    keywords: ['RFP', '사전규격', '발주 계획', '나라장터 입찰', '공공사업 발주'],
    readingMinutes: 7,
    situation: [
      '제안서는 공고가 올라온 날 갑자기 시작되는 일이 아닙니다. 현업 부서의 필요, 예산 편성, 정보 수집, 사전규격 공개, 본공고 등록의 흐름이 먼저 있습니다.',
      '처음 입찰을 준비하는 팀은 본공고만 보고 움직이기 쉽지만, 실제로는 사전규격 단계에서 과업 범위와 평가 방향을 미리 읽어야 준비 시간이 생깁니다.',
    ],
    aiUse: [
      'ChatGPT에 발주 단계별 용어를 정리시키고, 사전규격과 본공고에서 바뀔 수 있는 항목을 표로 비교합니다.',
      'AI에게 일정표 초안을 만들게 한 뒤 담당자 확인, 질의 기간, 내부 리뷰, 가격 검토 마감일을 역산합니다.',
      'Codex는 여러 공고 PDF나 메모에서 반복되는 마감일, 제출물, 질의 일정을 표 형태로 정리할 때 활용합니다.',
    ],
    humanCheck: [
      'AI가 만든 일정은 법정 공휴일, 회사 내부 결재일, 현장설명회 참석 조건을 반드시 사람이 다시 확인합니다.',
      '사전규격의 표현을 본공고 확정 조건으로 오해하지 않습니다.',
      '발주기관의 과거 유사 공고가 있으면 일정과 평가방식이 반복되는지 비교합니다.',
    ],
    promptExample:
      '아래 사전규격/RFP 내용을 발주 준비 흐름 관점에서 정리해줘. 1) 발주 배경 2) 본공고 전에 준비할 자료 3) 일정 리스크 4) 제안팀이 오늘 확인할 질문으로 나눠줘.',
    outputExample: {
      title: '초기 산출물',
      items: ['발주 단계 타임라인', '사전규격 확인 체크리스트', '본공고 전 준비물 목록', '질의 후보 목록'],
    },
    nextAction: '다음 단계에서는 실제 나라장터 공고 화면에서 무엇을 먼저 읽어야 하는지 확인합니다.',
  },
  {
    slug: 'narajangteo-notice-check',
    step: 2,
    title: '나라장터 공고에서 먼저 봐야 할 것',
    shortTitle: '공고 핵심 확인',
    description:
      '나라장터 입찰 공고에서 참가자격, 마감, 평가, 제출물을 먼저 확인하고 AI로 공고 요약표를 만드는 방법을 정리합니다.',
    primaryKeyword: '나라장터 공고 확인',
    keywords: ['나라장터 공고', '입찰 참가자격', '제안서 제출물', '입찰 마감', '평가 기준'],
    readingMinutes: 8,
    situation: [
      '공고 제목과 사업명만 보고 참여 여부를 판단하면 위험합니다. 참가자격, 공동수급 허용 여부, 실적 조건, 제출 방식, 평가 배점이 실제 의사결정을 좌우합니다.',
      '공고문, 제안요청서, 과업지시서, 별첨 양식이 분리되어 있을 때는 파일별 역할을 먼저 구분해야 합니다.',
    ],
    aiUse: [
      'ChatGPT로 공고문을 요약하되, 참여 가능 여부를 판단하는 항목만 별도 표로 뽑습니다.',
      'AI에게 “탈락 조건”을 먼저 찾게 하면 놓치기 쉬운 제한 조건을 빨리 볼 수 있습니다.',
      'Codex를 쓰면 여러 첨부 파일의 파일명, 버전, 제출 양식을 한 목록으로 만들 수 있습니다.',
    ],
    humanCheck: [
      '입찰참가자격은 AI 요약만 믿지 말고 공고 원문과 조달청 시스템 화면을 직접 대조합니다.',
      '마감 시간은 날짜만이 아니라 시각, 제출 방식, 공동수급협정서 제출 기한까지 확인합니다.',
      '제출 서류가 “제안서 파일” 하나로 보이더라도 정량, 정성, 발표자료, 가격서가 분리되는지 확인합니다.',
    ],
    promptExample:
      '이 공고에서 우리 회사가 입찰 참여 여부를 판단하기 위해 먼저 봐야 할 항목을 표로 정리해줘. 참가자격, 실적, 공동수급, 제출기한, 평가방식, 필수 제출물, 위험 조건을 포함해줘.',
    outputExample: {
      title: '공고 판독표',
      items: ['참가 가능성 판단표', '필수 제출물 목록', '마감 역산 일정', '질의 필요 항목'],
    },
    nextAction: '다음 단계에서는 RFP 본문을 AI로 읽혀 과업 범위와 요구사항을 구조화합니다.',
  },
  {
    slug: 'chatgpt-rfp-analysis',
    step: 3,
    title: 'ChatGPT로 RFP 초벌 분석하기',
    shortTitle: 'RFP AI 분석',
    description:
      'ChatGPT를 활용해 RFP의 과업 범위, 요구사항, 평가 포인트, 리스크를 초벌 분석하고 사람이 검토할 기준을 세웁니다.',
    primaryKeyword: 'ChatGPT RFP 분석',
    keywords: ['ChatGPT 제안서', 'RFP 분석', 'AI 제안서 작성', '과업 범위 분석', '요구사항 추출'],
    readingMinutes: 9,
    situation: [
      'RFP는 분량이 길고 반복 문장이 많아서 처음부터 정독하면 시간이 오래 걸립니다. AI는 전체 구조를 빨리 파악하고 중요 항목을 분류하는 데 유용합니다.',
      '하지만 AI는 원문에 없는 해석을 섞을 수 있으므로, 초벌 분석과 최종 판단을 분리해야 합니다.',
    ],
    aiUse: [
      'RFP를 목차, 과업 범위, 기능 요구사항, 비기능 요구사항, 평가 기준, 제출 형식으로 나누어 요약시킵니다.',
      'AI에게 “제안서에 반드시 답해야 하는 질문”을 만들게 하면 목차 설계가 쉬워집니다.',
      '긴 문서는 한 번에 넣기보다 장별로 나누고, 각 장의 핵심 요구사항 ID를 붙입니다.',
    ],
    humanCheck: [
      'AI 요약 옆에는 반드시 원문 페이지나 조항 번호를 붙입니다.',
      '평가 기준과 과업 요구사항을 섞지 않습니다. 평가 기준은 점수의 언어이고, 과업 요구사항은 수행의 언어입니다.',
      '애매한 요구사항은 임의 해석하지 않고 질의 후보로 분류합니다.',
    ],
    promptExample:
      '아래 RFP를 분석해줘. 출력은 1) 과업 범위 2) 기능 요구사항 3) 비기능 요구사항 4) 평가자가 볼 핵심 포인트 5) 원문 확인이 필요한 애매한 표현 6) 질의 후보로 나눠줘. 각 항목에는 원문 근거를 붙여줘.',
    outputExample: {
      title: 'RFP 분석 산출물',
      items: ['과업 범위 요약', '요구사항 목록', '리스크 목록', '질의 후보', '목차 초안 재료'],
    },
    nextAction: '다음 단계에서는 분석 결과를 요구사항 대응표로 바꾸어 제안서 목차와 연결합니다.',
  },
  {
    slug: 'requirements-response-table',
    step: 4,
    title: '요구사항 대응표 만들기',
    shortTitle: '요구사항 대응표',
    description:
      'RFP 요구사항과 평가항목을 제안서 목차에 연결하는 대응표를 만들고 AI가 빠뜨린 항목을 검수하는 방법을 설명합니다.',
    primaryKeyword: '요구사항 대응표',
    keywords: ['요구사항 대응표', '제안서 목차', 'RFP 요구사항', '평가항목 대응', '제안서 체크리스트'],
    readingMinutes: 8,
    situation: [
      '제안서 목차는 보기 좋게 나열하는 것이 아니라, RFP가 묻는 질문에 빠짐없이 답하는 구조여야 합니다.',
      '요구사항 대응표가 없으면 본문을 많이 써도 평가자가 원하는 답을 놓칠 수 있습니다.',
    ],
    aiUse: [
      'ChatGPT로 RFP 요구사항을 표로 추출하고, 각 요구사항에 대응할 제안서 장과 절을 매칭합니다.',
      'AI에게 평가항목별 증빙 자료 후보를 만들게 하면 정량 파트 준비가 빨라집니다.',
      'Codex는 CSV, Markdown, 표 형식으로 요구사항 대응표를 정리하는 데 활용합니다.',
    ],
    humanCheck: [
      '요구사항이 “지원한다”로 끝나지 않고 구체적 수행 방법, 산출물, 책임자를 포함하는지 확인합니다.',
      '평가 배점이 큰 항목은 제안서 앞쪽과 요약서에 반복 노출합니다.',
      '요구사항 번호가 바뀌거나 중복될 수 있으므로 최종 RFP와 다시 대조합니다.',
    ],
    promptExample:
      'RFP 요구사항을 요구사항 ID, 원문 요약, 제안서 대응 목차, 필요한 증빙, 담당 부서, 확인 상태 컬럼으로 표를 만들어줘. 평가 배점이 큰 항목은 우선순위를 높게 표시해줘.',
    outputExample: {
      title: '대응표 구성',
      items: ['요구사항 ID', '원문 요약', '제안서 대응 위치', '증빙 자료', '담당자', '검수 상태'],
    },
    nextAction: '다음 단계에서는 대응표를 바탕으로 이 제안서가 이겨야 할 핵심 메시지를 정합니다.',
  },
  {
    slug: 'proposal-strategy-message',
    step: 5,
    title: '제안 전략 잡기',
    shortTitle: '핵심 메시지',
    description:
      'AI로 경쟁 구도와 평가 포인트를 정리하고, 사람이 최종적으로 선택해야 하는 제안서 핵심 메시지와 차별점을 만듭니다.',
    primaryKeyword: '제안 전략',
    keywords: ['제안 전략', '수주 전략', '제안서 차별점', '핵심 메시지', '공공입찰 제안'],
    readingMinutes: 8,
    situation: [
      '좋은 제안서는 기능을 많이 나열한 문서가 아니라 발주기관의 문제를 가장 잘 이해했다는 신호를 주는 문서입니다.',
      'AI는 후보 메시지를 빠르게 많이 만들 수 있지만, 실제 수주 가능성을 판단하는 일은 경험과 현장 이해가 필요합니다.',
    ],
    aiUse: [
      'ChatGPT에 발주기관의 문제, 평가 기준, 우리 회사 강점을 넣고 핵심 메시지 후보를 여러 개 만들게 합니다.',
      'AI에게 경쟁사가 쓸 법한 평범한 표현을 예상하게 한 뒤, 피해야 할 문장을 제거합니다.',
      '이미지 생성 도구는 전략 메시지를 한 장짜리 개념도나 표지 방향으로 시각화할 때 사용합니다.',
    ],
    humanCheck: [
      '핵심 메시지가 우리 회사의 실제 수행 역량과 맞는지 확인합니다.',
      '발주기관의 용어와 맞지 않는 과장된 표현은 제거합니다.',
      '차별점은 “최고”, “혁신” 같은 형용사가 아니라 수행 방식, 검증 경험, 리스크 대응으로 증명합니다.',
    ],
    promptExample:
      '이 RFP와 우리 회사 강점을 기준으로 제안서 핵심 메시지 후보 5개를 만들어줘. 각 후보마다 평가자에게 주는 인상, 필요한 증빙, 과장 위험을 함께 써줘.',
    outputExample: {
      title: '전략 산출물',
      items: ['핵심 메시지 1문장', '차별점 3개', '요약서 첫 페이지 문안', '표지 또는 개념도 방향'],
    },
    nextAction: '다음 단계에서는 핵심 메시지를 실제 정량, 정성, 요약서 목차로 배치합니다.',
  },
  {
    slug: 'proposal-outline',
    step: 6,
    title: '제안서 목차 설계하기',
    shortTitle: '목차 설계',
    description:
      '정량제안서, 정성제안서, 제안요약서의 역할을 나누고 AI로 목차 초안을 만든 뒤 평가 흐름에 맞게 고치는 방법입니다.',
    primaryKeyword: '제안서 목차',
    keywords: ['제안서 목차', '정량제안서', '정성제안서', '제안요약서', '제안서 구조'],
    readingMinutes: 8,
    situation: [
      '제안서 목차는 회사가 말하고 싶은 순서가 아니라 평가자가 점수를 매기는 순서에 맞아야 합니다.',
      '정량, 정성, 요약서는 같은 내용을 반복하는 문서가 아니라 서로 다른 역할을 맡는 문서입니다.',
    ],
    aiUse: [
      'ChatGPT로 평가항목 순서에 맞춘 목차 초안을 만들고, 각 장의 목적과 필요한 증빙을 붙입니다.',
      'AI에게 요약서 1페이지 흐름을 먼저 만들게 하면 전체 목차의 메시지가 흔들리지 않습니다.',
      'Codex는 목차 번호, 파일명, 산출물 목록처럼 반복 정리가 필요한 항목을 일관되게 맞출 때 사용합니다.',
    ],
    humanCheck: [
      '목차가 평가 배점과 맞는지 확인합니다. 배점이 큰 항목은 분량과 위치가 충분해야 합니다.',
      '정성제안서에 들어갈 내용을 요약서에 너무 많이 넣어 심사위원의 집중을 흐리지 않습니다.',
      '제출 양식에서 요구한 목차가 있으면 임의로 바꾸지 않습니다.',
    ],
    promptExample:
      '아래 평가항목과 요구사항 대응표를 기준으로 정성제안서 목차를 설계해줘. 각 장마다 목적, 핵심 메시지, 들어갈 표 또는 그림, 필요한 증빙을 함께 제안해줘.',
    outputExample: {
      title: '목차 산출물',
      items: ['정성제안서 목차', '정량 증빙 목록', '제안요약서 흐름', '장별 핵심 메시지'],
    },
    nextAction: '다음 단계에서는 목차별 본문 초안을 AI로 만들고 사람이 고치는 기준을 정합니다.',
  },
  {
    slug: 'ai-draft-writing',
    step: 7,
    title: '본문 초안 작성하기',
    shortTitle: 'AI 본문 초안',
    description:
      'ChatGPT로 제안서 본문 초안을 만들고, 과장 표현과 빈 문장을 제거해 평가자가 읽을 수 있는 문장으로 고치는 방법입니다.',
    primaryKeyword: 'AI 제안서 본문',
    keywords: ['AI 제안서 작성', 'ChatGPT 제안서 초안', '제안서 문장', '본문 작성', '제안서 리라이팅'],
    readingMinutes: 9,
    situation: [
      'AI는 빈 페이지를 채우는 데 강하지만, 실제 수행 근거가 없는 문장도 자연스럽게 만들어냅니다.',
      '제안서 본문은 문장이 유려한지보다 요구사항에 답하고, 실행 방법과 산출물을 명확히 쓰는지가 중요합니다.',
    ],
    aiUse: [
      'ChatGPT에는 목차, 요구사항, 우리 회사 수행 방식, 금지할 표현을 함께 넣어 초안을 만듭니다.',
      '초안 작성 후에는 AI에게 “근거 없는 문장”, “평가자가 질문할 문장”, “수치가 필요한 문장”을 찾아달라고 요청합니다.',
      'Codex는 여러 장의 문체를 통일하거나 표 제목, 그림 캡션, 체크리스트 문구를 정리할 때 활용합니다.',
    ],
    humanCheck: [
      'AI가 만든 수행 경험, 인증, 수치, 인력 이름은 실제 근거가 없으면 모두 삭제합니다.',
      '한 문단에 하나의 주장만 남기고, 주장마다 방법 또는 산출물을 붙입니다.',
      '발주기관이 쓰는 용어와 다른 AI식 표현은 원문 용어로 되돌립니다.',
    ],
    promptExample:
      '이 목차의 본문 초안을 작성해줘. 조건은 1) RFP 요구사항에 직접 답할 것 2) 수행 방법과 산출물을 포함할 것 3) 근거 없는 실적이나 수치를 만들지 말 것 4) 공공기관 평가 문체로 쓸 것.',
    outputExample: {
      title: '본문 작성 산출물',
      items: ['장별 본문 초안', '근거 확인 목록', '삭제할 과장 표현', '표와 그림 후보'],
    },
    nextAction: '다음 단계에서는 본문을 보완할 표지, 개념도, 프로세스 이미지를 만듭니다.',
  },
  {
    slug: 'proposal-visuals',
    step: 8,
    title: '제안서용 이미지 만들기',
    shortTitle: '시각자료 제작',
    description:
      '이미지 생성 도구를 활용해 제안서 표지, 개념도, 프로세스 그림의 방향을 잡고 실제 문서에 맞게 검수하는 방법입니다.',
    primaryKeyword: 'AI 제안서 이미지',
    keywords: ['AI 이미지 생성', '제안서 표지', '제안서 개념도', '프로세스 이미지', '제안서 디자인'],
    readingMinutes: 8,
    situation: [
      '제안서 이미지는 보기 좋은 장식이 아니라 복잡한 수행 구조를 심사위원이 빨리 이해하게 만드는 장치입니다.',
      '이미지 생성 도구는 표지 무드와 장면 콘셉트를 빠르게 잡는 데 유용하지만, 시스템 구조도나 평가 근거를 정확히 그려주지는 않습니다.',
    ],
    aiUse: [
      'ChatGPT로 먼저 그림의 목적, 들어갈 요소, 피해야 할 표현을 정리한 뒤 이미지 생성 프롬프트로 바꿉니다.',
      '표지는 사업 분야와 발주기관의 성격에 맞춰 차분한 톤으로 만들고, 과한 미래 도시나 추상 이미지는 피합니다.',
      '프로세스와 아키텍처는 이미지 생성 결과를 그대로 쓰기보다, 사람이 PPT나 도식 도구에서 다시 정리할 초안으로 사용합니다.',
    ],
    humanCheck: [
      '발주기관 로고, 실제 기관명, 특정 제품 UI를 허가 없이 이미지에 넣지 않습니다.',
      '이미지 속 글자는 깨지거나 틀릴 수 있으므로 최종 텍스트는 PPT에서 별도로 입력합니다.',
      '제안서에 넣는 그림은 본문 주장과 연결되어야 하며, 설명 없는 장식 이미지는 제거합니다.',
    ],
    promptExample:
      '이 제안서의 표지 이미지를 위한 프롬프트를 만들어줘. 주제는 공공기관 AI 기반 업무관리 시스템이고, 분위기는 신뢰감, 안정성, 현장 적용성이다. 과한 SF 느낌, 추상 구름, 읽기 어려운 글자는 제외해줘.',
    outputExample: {
      title: '이미지 산출물',
      items: ['표지 이미지 방향', '사업 개념도 초안', '프로세스 도식 초안', '그림 캡션 문구'],
    },
    nextAction: '다음 단계에서는 Codex를 활용해 체크리스트, 표, 반복 문서 작업을 정리합니다.',
  },
  {
    slug: 'codex-document-operations',
    step: 9,
    title: 'Codex로 자료 정리하기',
    shortTitle: 'Codex 자료정리',
    description:
      'Codex를 활용해 요구사항 표, 체크리스트, 파일 목록, 반복 문서 작업을 구조화하고 제안팀의 검수 속도를 높이는 방법입니다.',
    primaryKeyword: 'Codex 제안서 작성',
    keywords: ['Codex', '제안서 체크리스트', '문서 자동화', '제안서 표 정리', '입찰 자료 정리'],
    readingMinutes: 8,
    situation: [
      '제안서 작성에는 창의적인 문장보다 반복 정리 업무가 많습니다. 파일명 정리, 요구사항 표, 증빙 목록, 검수 체크리스트가 대표적입니다.',
      'Codex는 코딩만이 아니라 작업 공간의 파일과 텍스트를 읽고 구조화하는 업무 보조자로 쓸 수 있습니다.',
    ],
    aiUse: [
      '첨부 파일 목록, 목차, 요구사항 표를 Codex에 읽히고 누락된 번호나 중복 항목을 찾아냅니다.',
      'Markdown, CSV, JSON처럼 다시 편집하기 쉬운 형식으로 체크리스트를 만들어 팀 공유 자료로 씁니다.',
      '반복되는 표 제목, 캡션, 파일명 규칙을 한 번에 통일합니다.',
    ],
    humanCheck: [
      'Codex가 파일을 실제로 읽었는지, 일부만 읽었는지 확인합니다.',
      '자동 정리 결과가 원문 제출 조건과 다르면 원문을 우선합니다.',
      '영업기밀, 개인정보, 가격 정보는 필요한 범위에서만 다루고 외부 공유를 제한합니다.',
    ],
    promptExample:
      '이 폴더의 제안 관련 파일 목록을 기준으로 제출물 체크리스트를 만들어줘. 파일명 규칙, 누락 의심 파일, 정량/정성/가격/증빙 구분, 최종 검수 상태 컬럼을 포함해줘.',
    outputExample: {
      title: 'Codex 산출물',
      items: ['제출물 체크리스트', '파일명 규칙표', '요구사항 대응표 CSV', '누락 의심 항목 목록'],
    },
    nextAction: '다음 단계에서는 공동수급과 컨소시엄 구조에서 역할과 실적을 정리합니다.',
  },
  {
    slug: 'consortium-role-split',
    step: 10,
    title: '컨소시엄과 역할 분담',
    shortTitle: '컨소시엄 정리',
    description:
      '공동수급, 분담이행, 지분율, 실적 정리를 AI와 함께 표준화하고 제안서에 넣을 역할 분담 구조를 만듭니다.',
    primaryKeyword: '컨소시엄 제안서',
    keywords: ['공동수급', '분담이행', '컨소시엄 제안서', '지분율', '실적 정리'],
    readingMinutes: 8,
    situation: [
      '컨소시엄 제안서는 참여사가 많아질수록 역할, 실적, 책임 범위가 흐려지기 쉽습니다.',
      '공동수급 방식과 지분율은 평가와 계약 책임에 영향을 주므로 AI가 계산한 표만 믿으면 안 됩니다.',
    ],
    aiUse: [
      'ChatGPT로 공동이행, 분담이행, 혼합방식의 차이를 제안서 관점에서 정리합니다.',
      '참여사별 역할, 실적, 투입 인력, 담당 산출물을 표로 만들고 중복되는 역할을 표시합니다.',
      'Codex는 참여사별 제출 서류와 증빙 파일 목록을 분리해 누락을 찾는 데 활용합니다.',
    ],
    humanCheck: [
      '공동수급 가능 여부와 지분율 기준은 공고 원문과 관련 규정을 확인합니다.',
      '실적 인정 범위는 발주기관 해석이 중요하므로 애매하면 질의합니다.',
      '역할 분담표는 실제 수행 책임과 계약 책임이 맞아야 합니다.',
    ],
    promptExample:
      '아래 참여사 정보를 기준으로 컨소시엄 역할 분담표를 만들어줘. 각 회사의 강점, 맡을 과업, 필요한 증빙, 지분율 검토 포인트, 발주기관에 질의할 항목을 포함해줘.',
    outputExample: {
      title: '컨소시엄 산출물',
      items: ['역할 분담표', '참여사별 증빙 목록', '실적 인정 검토표', '공동수급 질의 후보'],
    },
    nextAction: '다음 단계에서는 제출 전 최종 검수표로 누락과 실수를 줄입니다.',
  },
  {
    slug: 'final-review',
    step: 11,
    title: '제출 전 검수하기',
    shortTitle: '최종 검수',
    description:
      '제출 전 누락, 인쇄, PDF, 파일명, 증빙, 가격서 분리 같은 실수를 AI 체크리스트와 사람 검수로 줄이는 방법입니다.',
    primaryKeyword: '제안서 제출 전 검수',
    keywords: ['제안서 검수', '입찰 제출 체크리스트', 'PDF 검수', '제안서 파일명', '증빙 서류'],
    readingMinutes: 8,
    situation: [
      '제안서 품질이 좋아도 제출 형식, 파일명, 증빙, 가격서 분리에서 실수하면 평가 기회 자체를 잃을 수 있습니다.',
      '최종 검수는 작성자가 혼자 하면 놓치기 쉽기 때문에 AI 체크와 사람 교차 검수를 함께 써야 합니다.',
    ],
    aiUse: [
      'ChatGPT로 RFP 제출 조건을 체크리스트로 바꾸고, 각 항목에 담당자와 완료 상태를 붙입니다.',
      'Codex로 파일 목록과 제출 조건을 비교해 빠진 파일명이나 중복 파일을 찾습니다.',
      'AI에게 “탈락 위험이 있는 제출 실수”만 따로 추려달라고 요청합니다.',
    ],
    humanCheck: [
      '가격서, 정량서류, 정성제안서가 분리 제출인지 반드시 확인합니다.',
      'PDF 변환 후 폰트 깨짐, 이미지 누락, 페이지 번호, 목차 링크, 파일 용량을 확인합니다.',
      '최종 업로드 전에 제출 파일을 다른 PC나 브라우저에서 열어 봅니다.',
    ],
    promptExample:
      '이 RFP의 제출 조건을 기준으로 최종 검수 체크리스트를 만들어줘. 탈락 위험 항목, 형식 오류, 파일명, PDF, 증빙, 가격서 분리, 마감 시간 확인을 포함해줘.',
    outputExample: {
      title: '검수 산출물',
      items: ['최종 제출 체크리스트', '탈락 위험 항목', 'PDF 확인 목록', '제출 파일 목록'],
    },
    nextAction: '마지막 단계에서는 나라장터 업로드와 제출 확인, 제출 이후 대응 흐름을 정리합니다.',
  },
  {
    slug: 'narajangteo-submission',
    step: 12,
    title: '나라장터 입찰 제출까지',
    shortTitle: '입찰 제출',
    description:
      '나라장터 최종 업로드, 제출 확인, 제출 이후 질의와 발표 준비까지 AI와 함께 마무리하는 입찰 제출 흐름입니다.',
    primaryKeyword: '나라장터 입찰 제출',
    keywords: ['나라장터 입찰 제출', '제안서 업로드', '입찰 제출 확인', '발표 준비', '제안서 제출 후 대응'],
    readingMinutes: 8,
    situation: [
      '제안서 작성의 끝은 파일 저장이 아니라 나라장터 제출 확인입니다. 제출 완료 화면, 접수번호, 제출 파일 상태까지 확인해야 합니다.',
      '제출 후에도 질의 답변, 발표 준비, 보완 요청, 내부 회고가 이어집니다.',
    ],
    aiUse: [
      'ChatGPT로 제출 이후 발표 예상 질문과 답변 초안을 만듭니다.',
      'Codex로 최종 제출 파일 목록, 제출 시간, 접수 확인 정보를 회고 기록으로 정리합니다.',
      'AI를 활용해 다음 입찰에서 재사용할 요구사항 대응표와 검수표를 개선합니다.',
    ],
    humanCheck: [
      '나라장터 제출 완료 여부는 시스템 화면과 접수 확인 자료로 직접 확인합니다.',
      '제출 후 수정 가능 여부와 마감 전 재제출 규칙을 공고별로 확인합니다.',
      '발표자료는 제안서 본문과 다른 약속을 하지 않도록 대조합니다.',
    ],
    promptExample:
      '최종 제출 이후 발표 준비를 위해 예상 질문 20개와 답변 방향을 만들어줘. RFP 평가항목, 제안서 핵심 메시지, 리스크 대응, 유지보수 계획을 기준으로 해줘.',
    outputExample: {
      title: '제출 이후 산출물',
      items: ['제출 확인 기록', '발표 예상 질문', '보완 요청 대응표', '다음 입찰 회고 메모'],
    },
    nextAction: '12편의 흐름을 반복 가능한 내부 제안 프로세스로 만들고, 필요한 경우 프리세일즈 컨설팅으로 리스크를 점검합니다.',
  },
]

const DEFAULT_COVER_THEMES: AiProposalCoverTheme[] = [
  'ink',
  'blueprint',
  'copper',
  'mint',
  'rose',
  'sand',
  'violet',
  'graphite',
]

function getDefaultCategorySlug(step: number): string {
  if (step <= 4) return 'rfp-analysis'
  if (step <= 8) return 'proposal-writing'
  return 'submission-review'
}

function getDefaultCoverTheme(step: number): AiProposalCoverTheme {
  return DEFAULT_COVER_THEMES[(step - 1) % DEFAULT_COVER_THEMES.length]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderParagraphs(title: string, paragraphs: string[]): string {
  return [
    `<h2>${escapeHtml(title)}</h2>`,
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
  ].join('\n')
}

function renderList(title: string, items: string[]): string {
  return [
    `<h2>${escapeHtml(title)}</h2>`,
    '<ul>',
    ...items.map((item) => `<li>${escapeHtml(item)}</li>`),
    '</ul>',
  ].join('\n')
}

type AiProposalGuideRichBlock = {
  visualCaption: string
  overview: string[]
  workflowRows: Array<[string, string, string]>
  checklist: string[]
  mistakes: string[]
  evidence: string[]
}

const AI_PROPOSAL_GUIDE_RICH_BLOCKS: Record<string, AiProposalGuideRichBlock> = {
  'rfp-origin': {
    visualCaption: '발주 계획에서 본공고까지 이어지는 준비 흐름을 한 장으로 정리한 예시입니다.',
    overview: [
      '실무에서는 본공고가 뜬 뒤에야 제안팀이 움직이는 경우가 많지만, 수주 가능성은 그보다 앞선 단계에서 이미 갈립니다. 예산 반영, 정보화사업 사전협의, 사전규격 공개, 의견 수렴, 본공고 등록은 각각 준비할 수 있는 정보의 깊이가 다릅니다.',
      'AI를 쓰는 목적은 발주기관을 추측하는 것이 아니라 공개된 흔적을 빠르게 묶어 “지금 준비할 수 있는 것”과 “본공고 이후에만 확정되는 것”을 분리하는 데 있습니다. 이 구분이 되면 제안팀은 기다리는 시간이 아니라 준비하는 시간을 확보할 수 있습니다.',
    ],
    workflowRows: [
      ['발주 계획', '유사 사업, 예산명, 담당 부서 후보를 정리한다', '공개 자료 범위 안에서만 해석한다'],
      ['사전규격', '과업 범위와 제출 조건 초안을 표로 만든다', '본공고 확정 조건으로 단정하지 않는다'],
      ['본공고', '마감, 배점, 참가자격, 제출물을 재확인한다', '사전규격 대비 바뀐 항목을 표시한다'],
      ['제안 착수', '역산 일정과 역할분담 초안을 만든다', '내부 결재와 협력사 일정을 반영한다'],
    ],
    checklist: [
      '사전규격과 본공고의 파일명, 게시일, 변경 공고 여부를 별도로 기록합니다.',
      '유사 사업의 평가 배점, 사업 기간, 산출물 명칭을 비교해 반복되는 패턴을 찾습니다.',
      '질의 기간, 공동수급협정서 제출 기한, 가격서 제출 방식을 일정표에 먼저 넣습니다.',
      'AI가 제안한 일정은 공휴일, 회사 결재일, 인쇄/제본 시간을 반영해 사람이 다시 조정합니다.',
    ],
    mistakes: [
      '사전규격의 표현을 본공고 확정 조건처럼 보고 제안 방향을 고정하는 것',
      '본공고 이후 변경 공고를 확인하지 않아 제출 양식이나 마감 시간을 놓치는 것',
      '발주 배경을 기술 기능 목록으로만 이해하고 기관의 운영 문제를 읽지 못하는 것',
    ],
    evidence: ['사전규격 원문', '본공고 공고문', '제안요청서 변경 이력', '유사 공고 비교표'],
  },
  'narajangteo-notice-check': {
    visualCaption: '나라장터 공고에서 먼저 판독해야 할 항목을 참가 가능성과 탈락 위험 중심으로 배열했습니다.',
    overview: [
      '공고 확인의 핵심은 “좋은 사업인가”보다 “우리 회사가 실제로 들어갈 수 있는가”입니다. 참가자격, 실적, 공동수급, 마감, 제출물, 평가 방식은 제안서 품질과 별개로 입찰 가능성을 결정합니다.',
      'ChatGPT 요약은 빠르지만 공고문 숫자와 자격 문구는 한 글자 차이로 의미가 달라집니다. 따라서 AI에는 후보 항목을 뽑게 하고, 최종 판단은 공고 원문과 나라장터 화면을 같이 보며 확정해야 합니다.',
    ],
    workflowRows: [
      ['참가자격', '자격, 면허, 직접생산, 실적 조건을 추출한다', '우리 회사 증빙 가능 여부를 확인한다'],
      ['마감', '입찰, 제안서, 협정서 기한을 분리한다', '날짜와 시간을 모두 확인한다'],
      ['평가', '정량/정성/가격 배점을 표로 만든다', '배점 큰 항목의 대응 자료를 지정한다'],
      ['제출물', '파일과 오프라인 제출물을 목록화한다', '가격서 분리와 파일명 규칙을 확인한다'],
    ],
    checklist: [
      '입찰참가자격 제한 문구를 그대로 복사해 자격 검토표 첫 줄에 둡니다.',
      '공동수급 허용 여부, 분담이행 가능 여부, 지역 제한 여부를 별도 컬럼으로 분리합니다.',
      '제출 기한은 제안서, 입찰서, 가격서, 협정서, 질의 마감을 각각 기록합니다.',
      '첨부파일이 여러 개인 경우 파일별 역할과 최종 제출 여부를 표시합니다.',
    ],
    mistakes: [
      '사업명과 예산만 보고 참여를 결정하는 것',
      '공동수급협정서 제출 기한을 제안서 마감과 같은 날로 착각하는 것',
      '정량 평가 증빙이 필요한데 정성 본문만 먼저 쓰는 것',
    ],
    evidence: ['입찰공고문', '제안요청서', '과업지시서', '별첨 제출 양식', '나라장터 제출 화면'],
  },
  'chatgpt-rfp-analysis': {
    visualCaption: 'RFP를 과업 범위, 요구사항, 리스크, 질의 후보로 나누어 초벌 분석하는 흐름입니다.',
    overview: [
      'RFP 분석에서 AI가 가장 잘하는 일은 긴 문서를 사람이 검토할 수 있는 단위로 쪼개는 것입니다. 과업 범위, 기능 요구사항, 비기능 요구사항, 평가 포인트, 제출 조건을 분리하면 제안서 목차와 요구사항 대응표를 훨씬 빠르게 만들 수 있습니다.',
      '반대로 AI가 가장 위험한 지점은 원문에 없는 연결을 자연스러운 문장으로 만들어내는 것입니다. 그래서 초벌 분석 결과에는 항상 원문 페이지, 조항, 파일명을 붙이고 “확정”, “추정”, “질의 필요” 상태를 나눠야 합니다.',
    ],
    workflowRows: [
      ['분할', '문서를 장별로 나누고 장 제목을 요약한다', '누락된 별첨이나 표를 확인한다'],
      ['추출', '요구사항과 평가 포인트를 표로 만든다', '원문 근거 번호를 붙인다'],
      ['분류', '기능, 운영, 보안, 산출물, 일정으로 나눈다', '평가 기준과 과업 요구를 섞지 않는다'],
      ['질의', '불명확한 표현을 질의 후보로 만든다', '답변 전까지 임의 해석하지 않는다'],
    ],
    checklist: [
      '요구사항마다 원문 위치, 제안서 대응 위치, 확인 상태를 둡니다.',
      'AI 요약문과 원문 문장이 다른 경우 원문 표현을 우선합니다.',
      '“필요시”, “협의 후”, “등”처럼 범위가 넓은 문구는 질의 후보로 둡니다.',
      '보안, 개인정보, 클라우드, 장애 대응 같은 리스크 항목은 따로 모읍니다.',
    ],
    mistakes: [
      'AI가 만든 요약만 보고 제안 범위를 줄이거나 늘리는 것',
      '평가항목을 목차로 옮기지 않고 기능 설명만 쓰는 것',
      '질의해야 할 애매한 조건을 제안서 내부 가정으로 처리하는 것',
    ],
    evidence: ['RFP 원문 위치표', '요구사항 추출표', '리스크 목록', '질의 후보 목록'],
  },
  'requirements-response-table': {
    visualCaption: '요구사항 대응표는 RFP 문장과 제안서 목차, 증빙, 검수 상태를 연결하는 중심 문서입니다.',
    overview: [
      '요구사항 대응표는 작성 편의를 위한 표가 아니라 평가 누락을 막는 통제 장치입니다. RFP의 질문과 제안서의 답변 위치가 연결되어야 심사위원이 원하는 내용을 빠르게 찾을 수 있습니다.',
      'AI는 요구사항 후보를 빠르게 뽑을 수 있지만, 번호 체계와 평가 배점의 중요도는 사람이 조정해야 합니다. 특히 배점이 큰 항목은 본문 한 곳에만 두지 말고 요약서, 도식, 체크리스트에도 반복 노출해야 합니다.',
    ],
    workflowRows: [
      ['요구사항 ID', '문장별 ID를 붙여 중복과 누락을 찾는다', 'RFP 원문 번호와 맞춘다'],
      ['대응 목차', '각 요구사항의 제안서 위치를 제안한다', '평가 배점 큰 항목을 앞쪽에 둔다'],
      ['증빙', '필요한 실적, 인증, 산출물 후보를 뽑는다', '실제 제출 가능한 증빙만 남긴다'],
      ['검수', '완료, 보완, 질의 필요 상태를 만든다', '최종본과 표를 다시 대조한다'],
    ],
    checklist: [
      '요구사항마다 제안서 장/절, 담당자, 증빙 파일, 검수 상태를 둡니다.',
      '요구사항이 “지원”으로 끝나면 수행 방법과 산출물을 추가합니다.',
      '평가 배점이 높은 요구사항은 요약서와 본문 양쪽에서 찾을 수 있게 합니다.',
      '변경 공고가 있으면 요구사항 ID를 다시 매깁니다.',
    ],
    mistakes: [
      '요구사항 표를 만들었지만 실제 본문 위치와 연결하지 않는 것',
      'AI가 비슷한 문장을 중복 제거하면서 중요한 조건을 같이 지우는 것',
      '증빙이 없는 약속을 대응표에 완료로 표시하는 것',
    ],
    evidence: ['요구사항 대응표', '평가항목 매핑표', '증빙 목록', '최종 검수 로그'],
  },
  'proposal-strategy-message': {
    visualCaption: '제안 전략은 발주기관의 문제, 우리 강점, 증명 가능한 근거를 하나의 메시지로 묶는 과정입니다.',
    overview: [
      '전략 문장은 멋있는 슬로건이 아니라 평가자가 기억해야 할 판단 기준입니다. “왜 이 회사여야 하는가”를 과업 이해, 수행 방식, 리스크 대응, 검증 경험으로 설명해야 합니다.',
      'AI는 메시지 후보를 많이 만들 수 있지만, 실제로 쓸 문장은 회사가 증명할 수 있는 범위 안에 있어야 합니다. 근거 없는 선도, 혁신, 국내 최고 같은 표현은 제안서 신뢰를 떨어뜨립니다.',
    ],
    workflowRows: [
      ['문제정의', '발주기관의 운영 문제를 문장화한다', 'RFP 표현과 기관 용어를 맞춘다'],
      ['차별점', '우리 방식과 경쟁사 일반론을 비교한다', '실제 수행 가능성으로 거른다'],
      ['근거', '실적, 방법론, 인력, 산출물을 연결한다', '제출 가능한 증빙만 사용한다'],
      ['요약', '요약서 첫 페이지 메시지를 만든다', '과장 표현을 삭제한다'],
    ],
    checklist: [
      '핵심 메시지가 RFP 평가항목과 직접 연결되는지 확인합니다.',
      '차별점마다 수행 방법, 산출물, 검증 근거를 붙입니다.',
      '요약서, 표지, 발표 첫 장에서 같은 메시지를 반복합니다.',
      '발주기관이 쓰지 않는 유행어는 원문 용어로 바꿉니다.',
    ],
    mistakes: [
      'AI가 만든 홍보 문장을 그대로 표지와 요약서에 쓰는 것',
      '우리 강점보다 도구 이름을 앞세우는 것',
      '리스크 대응 없이 장점만 나열하는 것',
    ],
    evidence: ['핵심 메시지 후보표', '차별점-근거 매핑', '요약서 1페이지 문안', '금지 표현 목록'],
  },
  'proposal-outline': {
    visualCaption: '정량, 정성, 요약서, 발표자료의 역할을 나누어 목차를 설계하는 방식입니다.',
    overview: [
      '제안서 목차는 문서의 차례가 아니라 평가자가 점수를 찾는 경로입니다. 정량은 자격과 실적을 증명하고, 정성은 수행 방식을 설명하며, 요약서는 핵심 판단 근거를 빠르게 전달해야 합니다.',
      'AI로 목차 초안을 만들 때는 평가항목과 요구사항 대응표를 함께 넣어야 합니다. 단순히 “제안서 목차 만들어줘”라고 하면 보기 좋은 일반 목차가 나오지만, 실제 평가 배점과 맞지 않을 수 있습니다.',
    ],
    workflowRows: [
      ['정량', '자격, 실적, 인증, 인력 증빙을 묶는다', '제출 양식과 순서를 맞춘다'],
      ['정성', '과업 이해, 수행 전략, 방법론, 일정으로 설계한다', '평가 배점 순서를 반영한다'],
      ['요약서', '핵심 메시지와 차별점을 압축한다', '본문과 다른 약속을 하지 않는다'],
      ['발표자료', '심사위원 질문 흐름에 맞춘다', '제안서 본문 근거와 대조한다'],
    ],
    checklist: [
      '각 장의 목적, 평가항목, 들어갈 표/그림, 필요한 증빙을 함께 적습니다.',
      '배점이 큰 항목은 목차 앞쪽과 요약서에 배치합니다.',
      '제출 양식에서 목차를 지정했다면 임의 변경하지 않습니다.',
      '목차 번호, 파일명, 본문 제목의 용어를 통일합니다.',
    ],
    mistakes: [
      '회사 소개를 앞쪽에 길게 두고 평가항목 대응을 뒤로 미루는 것',
      '요약서가 본문 축약이 아니라 새로운 약속 문서가 되는 것',
      '정량 증빙 준비 없이 정성 목차만 먼저 확정하는 것',
    ],
    evidence: ['정성 목차안', '정량 증빙 목차', '요약서 흐름', '발표자료 스토리라인'],
  },
  'ai-draft-writing': {
    visualCaption: 'AI 초안은 작성 속도를 높이고, 사람 검수는 근거 없는 문장과 위험한 약속을 제거합니다.',
    overview: [
      '본문 초안 작성에서 AI는 빈 페이지를 채우는 데 유용합니다. 하지만 제안서는 문장이 자연스러운지보다 요구사항에 답하는지, 수행 방법과 산출물이 있는지가 중요합니다.',
      '좋은 작업 방식은 초안 생성과 검수 프롬프트를 분리하는 것입니다. 먼저 장별 초안을 만들고, 다음 단계에서 근거 없는 실적, 과장 표현, 확인 필요한 수치, RFP와 다른 용어를 찾아내야 합니다.',
    ],
    workflowRows: [
      ['초안', '목차와 요구사항을 넣어 장별 초안을 만든다', '금지 표현을 함께 준다'],
      ['근거확인', '실적, 수치, 인력, 인증 문장을 표시한다', '증빙 없는 내용은 삭제한다'],
      ['리라이팅', '한 문단 한 주장으로 줄인다', '방법과 산출물을 붙인다'],
      ['통일', '용어, 표 제목, 캡션을 맞춘다', 'RFP 원문 용어를 우선한다'],
    ],
    checklist: [
      '각 문단이 어떤 요구사항에 답하는지 표시합니다.',
      '실적, 수치, 인증, 인력명은 근거 파일과 연결합니다.',
      '“최적”, “최고”, “완벽”처럼 증명 어려운 형용사를 줄입니다.',
      '표와 그림에는 본문 주장과 연결되는 캡션을 붙입니다.',
    ],
    mistakes: [
      'AI가 만든 수행 경험을 실제 확인 없이 넣는 것',
      '문장이 길고 멋있지만 산출물과 책임 범위가 없는 것',
      '발주기관 용어 대신 AI가 만든 일반 용어를 쓰는 것',
    ],
    evidence: ['장별 초안', '근거 확인 목록', '삭제 문장 목록', '최종 리라이팅 본문'],
  },
  'proposal-visuals': {
    visualCaption: '제안서 이미지는 표지, 개념도, 프로세스, 캡션이 본문 주장과 연결될 때 효과가 있습니다.',
    overview: [
      '제안서용 이미지는 장식이 아니라 이해를 빠르게 만드는 장치입니다. 표지는 사업의 신뢰감을 전달하고, 개념도는 수행 구조를 설명하며, 프로세스 이미지는 일정과 책임을 보여줘야 합니다.',
      '이미지 생성 도구는 분위기와 구도 실험에는 좋지만, 텍스트와 구조 정확도는 약합니다. 그래서 최종 문구, 기관명, 단계명은 PPT나 문서 편집 도구에서 사람이 다시 올리는 것이 안전합니다.',
    ],
    workflowRows: [
      ['목적정의', '그림이 설명할 주장과 위치를 정한다', '장식 이미지를 제거한다'],
      ['프롬프트', '분위기, 요소, 금지 요소를 작성한다', '기관 로고와 실제 UI는 넣지 않는다'],
      ['후보선택', '표지, 개념도, 프로세스 후보를 비교한다', '본문과 맞지 않으면 버린다'],
      ['문서화', '캡션과 본문 참조 문장을 붙인다', '텍스트는 문서에서 다시 입력한다'],
    ],
    checklist: [
      '이미지마다 제안서 본문 어디에 들어갈지 정합니다.',
      '그림 안의 글자는 최종본에서 별도 텍스트로 다시 입력합니다.',
      '발주기관 로고, 상표, 실제 인물, 특정 제품 화면은 권한을 확인합니다.',
      '그림 캡션은 “무엇을 증명하는 그림인지” 설명해야 합니다.',
    ],
    mistakes: [
      '멋있는 표지 이미지를 골랐지만 사업 내용과 연결되지 않는 것',
      'AI 이미지 속 깨진 글자를 그대로 쓰는 것',
      '아키텍처 정확도가 필요한 그림을 이미지 생성 결과에 맡기는 것',
    ],
    evidence: ['표지 후보', '개념도 초안', '프로세스 도식', '그림 캡션 목록'],
  },
  'codex-document-operations': {
    visualCaption: 'Codex는 파일 목록, 요구사항 표, 체크리스트를 읽고 반복 문서 작업을 구조화하는 데 적합합니다.',
    overview: [
      '제안서 작업에는 글쓰기보다 정리 업무가 많습니다. 첨부 파일 목록, 요구사항 대응표, 증빙 자료, 파일명 규칙, 최종 검수표는 반복되지만 실수하면 큰 문제가 됩니다.',
      'Codex는 작업 폴더의 파일을 기준으로 구조를 만들 수 있다는 점에서 일반 대화형 AI와 다릅니다. 다만 어떤 파일을 실제로 읽었는지, 누락된 파일은 없는지 확인하는 절차가 필요합니다.',
    ],
    workflowRows: [
      ['파일목록', '폴더 구조와 파일명을 읽어 목록화한다', '최신본과 중복본을 구분한다'],
      ['표준화', '파일명, 표 제목, 캡션 규칙을 제안한다', '제출 양식과 충돌하지 않게 한다'],
      ['체크리스트', '요구사항과 제출물을 대조한다', '누락 의심 항목을 사람이 확인한다'],
      ['반복작업', 'CSV, Markdown, 표 형식으로 변환한다', '원문 조건을 우선한다'],
    ],
    checklist: [
      'Codex에게 작업 범위 폴더와 제외할 파일을 명확히 알려줍니다.',
      '생성된 체크리스트에는 원문 근거와 파일 경로를 함께 둡니다.',
      '가격 정보, 개인정보, 영업기밀 파일은 접근 범위를 제한합니다.',
      '자동 정리 결과를 최종 제출 조건과 한 번 더 대조합니다.',
    ],
    mistakes: [
      'Codex가 일부 파일만 읽었는데 전체를 검수했다고 믿는 것',
      '파일명 규칙을 예쁘게 바꾸다가 제출 양식 규칙을 어기는 것',
      '가격서와 정성제안서 자료를 같은 검수표에서 섞는 것',
    ],
    evidence: ['파일 목록표', '제출물 체크리스트', '요구사항 CSV', '누락 의심 목록'],
  },
  'consortium-role-split': {
    visualCaption: '컨소시엄 제안서는 참여사별 역할, 책임, 실적, 증빙이 한눈에 맞아야 합니다.',
    overview: [
      '컨소시엄이 들어가는 제안서는 역할 분담이 불명확하면 평가자에게 위험 신호를 줍니다. 누가 어떤 과업을 책임지고, 어떤 실적으로 증명하며, 지분율과 계약 책임이 어떻게 연결되는지 보여줘야 합니다.',
      'AI는 역할 분담표 초안을 만드는 데 유용하지만 공동수급 방식, 분담이행 가능 여부, 실적 인정 범위는 공고와 발주기관 해석이 우선입니다. 애매하면 표 안에 확정하지 말고 질의 후보로 남깁니다.',
    ],
    workflowRows: [
      ['참여사', '회사별 강점과 실적을 표로 정리한다', '실제 증빙 가능 여부를 확인한다'],
      ['역할', '과업과 산출물 책임을 배정한다', '중복과 공백을 찾는다'],
      ['지분율', '업무량과 계약 책임을 연결한다', '공고 기준과 맞는지 검토한다'],
      ['증빙', '참여사별 제출 서류를 나눈다', '기한과 원본 필요 여부를 확인한다'],
    ],
    checklist: [
      '공동이행, 분담이행, 혼합 방식 중 어떤 구조인지 먼저 확정합니다.',
      '역할 분담표에는 과업, 산출물, 책임자, 증빙을 함께 적습니다.',
      '참여사별 실적은 인정 범위와 발주기관 요구 형식을 확인합니다.',
      '협정서 제출 기한과 제안서 제출 기한을 별도로 관리합니다.',
    ],
    mistakes: [
      '역할은 나눴지만 실제 산출물 책임자가 없는 것',
      '지분율과 업무량 설명이 서로 맞지 않는 것',
      '참여사 실적을 AI가 일반화해 인정 가능 여부를 단정하는 것',
    ],
    evidence: ['역할 분담표', '참여사별 실적표', '공동수급 협정 검토표', '증빙 파일 목록'],
  },
  'final-review': {
    visualCaption: '제출 전 검수는 PDF, 파일명, 증빙, 가격서 분리를 순서대로 확인해야 합니다.',
    overview: [
      '제안서가 잘 만들어져도 제출 형식에서 실수하면 평가 기회를 잃을 수 있습니다. 최종 검수는 글의 완성도를 보는 단계가 아니라 탈락 위험을 제거하는 단계입니다.',
      'AI 체크리스트는 빠짐없이 묻는 데 강하고, 사람 검수는 실제 파일을 열어보고 판단하는 데 필요합니다. 두 작업을 분리해야 “체크리스트에는 완료인데 파일은 틀린” 상황을 줄일 수 있습니다.',
    ],
    workflowRows: [
      ['형식', '제출 조건을 체크리스트로 만든다', '공고 원문과 대조한다'],
      ['파일', 'PDF, 용량, 파일명, 버전을 확인한다', '다른 PC에서 열어본다'],
      ['증빙', '정량 서류와 별첨을 대조한다', '원본/사본 조건을 확인한다'],
      ['가격', '가격서 분리 제출 여부를 확인한다', '정성 파일에 가격 정보가 없는지 본다'],
    ],
    checklist: [
      'PDF 변환 후 폰트, 표, 이미지, 페이지 번호, 목차 링크를 확인합니다.',
      '제출 파일명에 기관이 요구한 규칙이 있는지 확인합니다.',
      '가격서가 정성제안서나 발표자료에 노출되지 않았는지 확인합니다.',
      '최종 제출물은 작성자가 아닌 사람이 한 번 더 열어봅니다.',
    ],
    mistakes: [
      '검수자가 원본 문서만 보고 PDF 변환본을 보지 않는 것',
      '최종 파일명에 “최종”, “진짜최종” 같은 내부 표현이 남는 것',
      '가격 정보가 정성자료 캡처나 표에 남아 있는 것',
    ],
    evidence: ['최종 검수표', 'PDF 열람 확인', '제출 파일 목록', '가격서 분리 확인'],
  },
  'narajangteo-submission': {
    visualCaption: '나라장터 제출은 업로드가 아니라 접수 확인과 이후 대응까지 기록해야 끝납니다.',
    overview: [
      '제안서 작업의 끝은 파일 저장이 아니라 시스템 제출 확인입니다. 업로드 완료, 제출 버튼, 접수번호, 제출 파일 상태, 접수 확인 자료까지 확인해야 합니다.',
      '제출 후에도 발표 준비, 보완 요청, 질의 답변, 내부 회고가 이어집니다. AI는 예상 질문과 회고 정리를 돕고, 사람은 제출 상태와 공식 답변을 확인합니다.',
    ],
    workflowRows: [
      ['업로드', '제출 파일과 순서를 체크한다', '잘못된 파일 선택을 막는다'],
      ['제출', '접수번호와 제출 상태를 기록한다', '완료 화면과 확인서를 저장한다'],
      ['발표', '예상 질문과 답변 초안을 만든다', '본문과 다른 약속을 하지 않는다'],
      ['회고', '재사용할 표와 체크리스트를 정리한다', '실제 평가 결과와 비교한다'],
    ],
    checklist: [
      '제출 완료 화면, 접수번호, 제출 파일명을 캡처 또는 저장합니다.',
      '마감 전 재제출 가능 여부와 수정 규칙을 공고별로 확인합니다.',
      '발표자료는 제안서 본문과 같은 약속만 담습니다.',
      '제출 후 회고에는 일정, 누락 위험, 재사용 가능한 자료를 남깁니다.',
    ],
    mistakes: [
      '파일 업로드만 하고 최종 제출 버튼과 접수 상태를 확인하지 않는 것',
      '마감 직전 재업로드 중 네트워크 지연을 고려하지 않는 것',
      '발표자료에서 제안서에 없는 기능이나 일정 약속을 추가하는 것',
    ],
    evidence: ['제출 확인 캡처', '접수번호 기록', '발표 예상 질문', '입찰 회고 메모'],
  },
}

function getGuideVisualPath(slug: string): string {
  return `/images/ai-proposal-guide/${slug}.webp`
}

function getGuideCoverImagePath(slug: string): string {
  return `/images/ai-proposal-guide/covers/${slug}.webp`
}

function renderFigure(guide: AiProposalGuideSeed, caption: string): string {
  return [
    '<figure>',
    `<img src="${escapeHtml(getGuideVisualPath(guide.slug))}" alt="${escapeHtml(`${guide.title} 실무 흐름 이미지`)}">`,
    `<figcaption>${escapeHtml(caption)}</figcaption>`,
    '</figure>',
  ].join('\n')
}

function renderTable(title: string, rows: Array<[string, string, string]>): string {
  return [
    `<h2>${escapeHtml(title)}</h2>`,
    '<table>',
    '<thead><tr><th>단계</th><th>AI가 할 일</th><th>사람이 확인할 일</th></tr></thead>',
    '<tbody>',
    ...rows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`),
    '</tbody>',
    '</table>',
  ].join('\n')
}

export function buildAiProposalGuideBodyHtml(guide: AiProposalGuideSeed): string {
  const richBlock = AI_PROPOSAL_GUIDE_RICH_BLOCKS[guide.slug]
  if (richBlock) {
    return [
      renderParagraphs('상황', guide.situation),
      renderFigure(guide, richBlock.visualCaption),
      renderParagraphs('실무에서 먼저 이해할 점', richBlock.overview),
      renderTable('작업 흐름', richBlock.workflowRows),
      renderList('AI 활용', guide.aiUse),
      renderList('사람의 판단 기준', guide.humanCheck),
      renderList('실무 체크리스트', richBlock.checklist),
      `<h2>프롬프트 예시</h2>\n<pre><code>${escapeHtml(guide.promptExample)}</code></pre>`,
      renderList(guide.outputExample.title, guide.outputExample.items),
      renderList('검수에 필요한 근거 자료', richBlock.evidence),
      renderList('흔한 실수', richBlock.mistakes),
      `<h2>다음 단계</h2>\n<p>${escapeHtml(guide.nextAction)}</p>`,
    ].join('\n\n')
  }

  return [
    renderParagraphs('상황', guide.situation),
    renderList('AI 활용', guide.aiUse),
    renderList('사람의 판단 기준', guide.humanCheck),
    `<h2>프롬프트 예시</h2>\n<pre><code>${escapeHtml(guide.promptExample)}</code></pre>`,
    renderList(guide.outputExample.title, guide.outputExample.items),
    `<h2>다음 단계</h2>\n<p>${escapeHtml(guide.nextAction)}</p>`,
  ].join('\n\n')
}

function normalizeDefaultGuide(seed: AiProposalGuideSeed): AiProposalGuideStep {
  const hasRichBody = Boolean(AI_PROPOSAL_GUIDE_RICH_BLOCKS[seed.slug])
  return {
    ...seed,
    readingMinutes: hasRichBody ? seed.readingMinutes + 4 : seed.readingMinutes,
    id: seed.slug,
    categorySlug: getDefaultCategorySlug(seed.step),
    sortOrder: seed.step,
    isPublished: true,
    publishedAt: AI_PROPOSAL_GUIDE_PUBLISHED_AT,
    updatedAt: AI_PROPOSAL_GUIDE_PUBLISHED_AT,
    coverTitle: seed.title,
    coverSubtitle: seed.primaryKeyword,
    coverTheme: getDefaultCoverTheme(seed.step),
    coverImageUrl: getGuideCoverImagePath(seed.slug),
    bodyHtml: buildAiProposalGuideBodyHtml(seed),
  }
}

export const AI_PROPOSAL_GUIDES: AiProposalGuideStep[] =
  AI_PROPOSAL_GUIDE_SEEDS.map(normalizeDefaultGuide)

export const DEFAULT_AI_PROPOSAL_GUIDE_CONTENT: AiProposalGuideContent = {
  version: 1,
  updatedAt: AI_PROPOSAL_GUIDE_PUBLISHED_AT,
  categories: AI_PROPOSAL_GUIDE_CATEGORIES,
  articles: AI_PROPOSAL_GUIDES,
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function cleanNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function cleanStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(item))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function isCoverTheme(value: unknown): value is AiProposalCoverTheme {
  return AI_PROPOSAL_COVER_THEMES.includes(value as AiProposalCoverTheme)
}

export function normalizeAiProposalSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeCategory(value: unknown, fallbackOrder: number): AiProposalGuideCategory | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const rawSlug = cleanString(row.slug) || cleanString(row.id)
  const slug = normalizeAiProposalSlug(rawSlug)
  const title = cleanString(row.title)
  if (!slug || !title) return null

  return {
    id: cleanString(row.id) || slug,
    slug,
    title,
    eyebrow: cleanString(row.eyebrow),
    description: cleanString(row.description),
    sortOrder: cleanNumber(row.sortOrder ?? row.sort_order, fallbackOrder),
    isPublished: row.isPublished !== false && row.is_published !== false,
  }
}

function normalizeArticle(value: unknown, fallbackOrder: number): AiProposalGuideStep | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const rawSlug = cleanString(row.slug) || cleanString(row.id)
  const slug = normalizeAiProposalSlug(rawSlug)
  const title = cleanString(row.title)
  if (!slug || !title) return null

  const step = cleanNumber(row.step, fallbackOrder)
  const outputExampleValue = row.outputExample && typeof row.outputExample === 'object'
    ? row.outputExample as Record<string, unknown>
    : {}
  const outputExample = {
    title: cleanString(outputExampleValue.title) || '산출물 예시',
    items: cleanStringArray(outputExampleValue.items),
  }
  const situation = cleanStringArray(row.situation)
  const aiUse = cleanStringArray(row.aiUse ?? row.ai_use)
  const humanCheck = cleanStringArray(row.humanCheck ?? row.human_check)
  const promptExample = cleanString(row.promptExample ?? row.prompt_example)
  const nextAction = cleanString(row.nextAction ?? row.next_action)
  const seed: AiProposalGuideSeed = {
    slug,
    step,
    title,
    shortTitle: cleanString(row.shortTitle ?? row.short_title) || title,
    description: cleanString(row.description),
    primaryKeyword: cleanString(row.primaryKeyword ?? row.primary_keyword) || title,
    keywords: cleanStringArray(row.keywords),
    readingMinutes: Math.max(1, cleanNumber(row.readingMinutes ?? row.reading_minutes, 8)),
    situation,
    aiUse,
    humanCheck,
    promptExample,
    outputExample,
    nextAction,
  }

  const publishedAt = cleanString(row.publishedAt ?? row.published_at) || AI_PROPOSAL_GUIDE_PUBLISHED_AT
  const updatedAt = cleanString(row.updatedAt ?? row.updated_at) || publishedAt
  const bodyHtml = cleanString(row.bodyHtml ?? row.body_html) || buildAiProposalGuideBodyHtml(seed)
  const coverTheme = isCoverTheme(row.coverTheme ?? row.cover_theme)
    ? (row.coverTheme ?? row.cover_theme) as AiProposalCoverTheme
    : getDefaultCoverTheme(step)

  return {
    ...seed,
    id: cleanString(row.id) || slug,
    categorySlug: normalizeAiProposalSlug(cleanString(row.categorySlug ?? row.category_slug)) || getDefaultCategorySlug(step),
    sortOrder: cleanNumber(row.sortOrder ?? row.sort_order, step),
    isPublished: cleanBoolean(row.isPublished ?? row.is_published, true),
    publishedAt,
    updatedAt,
    coverTitle: cleanString(row.coverTitle ?? row.cover_title) || title,
    coverSubtitle: cleanString(row.coverSubtitle ?? row.cover_subtitle) || seed.primaryKeyword,
    coverTheme,
    coverImageUrl: cleanString(row.coverImageUrl ?? row.cover_image_url),
    bodyHtml,
  }
}

export function sortAiProposalCategories(categories: AiProposalGuideCategory[]): AiProposalGuideCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'ko'))
}

export function sortAiProposalGuides(articles: AiProposalGuideStep[]): AiProposalGuideStep[] {
  return [...articles].sort((a, b) => a.sortOrder - b.sortOrder || a.step - b.step || a.title.localeCompare(b.title, 'ko'))
}

export function parseAiProposalGuideContent(value: string | null | undefined): AiProposalGuideContent {
  if (!value) return DEFAULT_AI_PROPOSAL_GUIDE_CONTENT

  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_AI_PROPOSAL_GUIDE_CONTENT
    const source = parsed as Record<string, unknown>
    const categories = Array.isArray(source.categories)
      ? source.categories.map((item, index) => normalizeCategory(item, index + 1)).filter((item): item is AiProposalGuideCategory => item !== null)
      : []
    const articles = Array.isArray(source.articles)
      ? source.articles.map((item, index) => normalizeArticle(item, index + 1)).filter((item): item is AiProposalGuideStep => item !== null)
      : Array.isArray(source.guides)
        ? source.guides.map((item, index) => normalizeArticle(item, index + 1)).filter((item): item is AiProposalGuideStep => item !== null)
        : []

    if (articles.length === 0) return DEFAULT_AI_PROPOSAL_GUIDE_CONTENT

    return {
      version: 1,
      updatedAt: cleanString(source.updatedAt ?? source.updated_at) || new Date().toISOString(),
      categories: sortAiProposalCategories(categories.length > 0 ? categories : AI_PROPOSAL_GUIDE_CATEGORIES),
      articles: sortAiProposalGuides(articles),
    }
  } catch {
    return DEFAULT_AI_PROPOSAL_GUIDE_CONTENT
  }
}

export function serializeAiProposalGuideContent(content: AiProposalGuideContent): string {
  return JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: sortAiProposalCategories(content.categories),
    articles: sortAiProposalGuides(content.articles),
  })
}

export function getPublishedAiProposalGuideContent(content: AiProposalGuideContent): AiProposalGuideContent {
  const publishedCategorySlugs = new Set(content.categories.filter((category) => category.isPublished).map((category) => category.slug))
  return {
    ...content,
    categories: sortAiProposalCategories(content.categories.filter((category) => category.isPublished)),
    articles: sortAiProposalGuides(
      content.articles.filter((article) => article.isPublished && publishedCategorySlugs.has(article.categorySlug)),
    ),
  }
}

export function getAiProposalGuide(slug: string, content: AiProposalGuideContent = DEFAULT_AI_PROPOSAL_GUIDE_CONTENT): AiProposalGuideStep | undefined {
  return content.articles.find((guide) => guide.slug === slug)
}

export function aiProposalGuideUrl(slug: string): string {
  return `${SITE_URL}${AI_PROPOSAL_GUIDE_BASE_PATH}/${slug}`
}

export function aiProposalGuideIndexUrl(): string {
  return `${SITE_URL}${AI_PROPOSAL_GUIDE_BASE_PATH}`
}

export function toAbsoluteSiteUrl(value: string): string {
  if (!value) return SITE_URL
  try {
    return new URL(value, SITE_URL).toString()
  } catch {
    return SITE_URL
  }
}

export function getAiProposalGuideImageUrl(guide?: Pick<AiProposalGuideStep, 'coverImageUrl'>): string {
  return toAbsoluteSiteUrl(guide?.coverImageUrl || AI_PROPOSAL_GUIDE_OG_IMAGE)
}

export function getAiProposalGuideSeoTitle(guide: Pick<AiProposalGuideStep, 'title'>): string {
  return `${guide.title} | ${AI_PROPOSAL_GUIDE_TITLE}`
}

export function getAiProposalGuideSeoDescription(guide: Pick<AiProposalGuideStep, 'description'>): string {
  if (guide.description.length <= 160) return guide.description
  return `${guide.description.slice(0, 157).trim()}…`
}

export function getAdjacentAiProposalGuides(
  step: number,
  content: AiProposalGuideContent = DEFAULT_AI_PROPOSAL_GUIDE_CONTENT,
): {
  previous: AiProposalGuideStep | null
  next: AiProposalGuideStep | null
} {
  const articles = sortAiProposalGuides(content.articles.filter((guide) => guide.isPublished))
  const currentIndex = articles.findIndex((guide) => guide.step === step)
  return {
    previous: currentIndex > 0 ? articles[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null,
  }
}

export function getAiProposalGuideCategory(
  slug: string,
  content: AiProposalGuideContent = DEFAULT_AI_PROPOSAL_GUIDE_CONTENT,
): AiProposalGuideCategory | undefined {
  return content.categories.find((category) => category.slug === slug)
}

export function getAiProposalGuideCategoriesWithArticles(content: AiProposalGuideContent): Array<{
  category: AiProposalGuideCategory
  articles: AiProposalGuideStep[]
}> {
  const articlesByCategory = new Map<string, AiProposalGuideStep[]>()
  for (const article of sortAiProposalGuides(content.articles)) {
    const current = articlesByCategory.get(article.categorySlug) ?? []
    current.push(article)
    articlesByCategory.set(article.categorySlug, current)
  }

  return sortAiProposalCategories(content.categories)
    .map((category) => ({ category, articles: articlesByCategory.get(category.slug) ?? [] }))
    .filter((section) => section.articles.length > 0)
}

export function createAiProposalGuideDraft(
  content: AiProposalGuideContent,
  categorySlug = content.categories[0]?.slug || 'rfp-analysis',
): AiProposalGuideStep {
  const now = new Date().toISOString()
  const nextNumber = content.articles.length + 1
  const slug = `new-guide-${nextNumber}`
  return {
    id: slug,
    slug,
    step: nextNumber,
    title: '새 글 제목',
    shortTitle: '새 글',
    description: '검색 결과와 허브 카드에 표시할 요약 문장을 입력하세요.',
    primaryKeyword: 'AI 제안서 작성',
    keywords: ['AI 제안서 작성'],
    readingMinutes: 8,
    situation: [],
    aiUse: [],
    humanCheck: [],
    promptExample: '',
    outputExample: { title: '산출물 예시', items: [] },
    nextAction: '',
    categorySlug,
    sortOrder: nextNumber,
    isPublished: false,
    publishedAt: now,
    updatedAt: now,
    coverTitle: '새 글 제목',
    coverSubtitle: 'AI 제안서 작성',
    coverTheme: getDefaultCoverTheme(nextNumber),
    coverImageUrl: '',
    bodyHtml: '<h2>상황</h2><p>본문을 입력하세요.</p>',
  }
}

export function createAiProposalGuideCategoryDraft(content: AiProposalGuideContent): AiProposalGuideCategory {
  const nextNumber = content.categories.length + 1
  const slug = `category-${nextNumber}`
  return {
    id: slug,
    slug,
    title: '새 카테고리',
    eyebrow: String(nextNumber).padStart(2, '0'),
    description: '카테고리 설명을 입력하세요.',
    sortOrder: nextNumber,
    isPublished: true,
  }
}

export function plainTextFromGuideHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getAiProposalGuideWordCount(guide: Pick<AiProposalGuideStep, 'bodyHtml'>): number {
  const text = plainTextFromGuideHtml(guide.bodyHtml)
  return text ? text.split(/\s+/).length : 0
}

function cleanUrlAttribute(value: string, allowImages = false): string {
  const trimmed = value.trim()
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:')
  ) {
    return trimmed
  }
  if (allowImages && trimmed.startsWith('data:image/')) return trimmed
  return ''
}

export function sanitizeGuideHtml(html: string): string {
  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'h2',
    'h3',
    'h4',
    'figure',
    'figcaption',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'blockquote',
    'code',
    'pre',
    'a',
    'hr',
    'img',
  ])

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<([/]?)([a-zA-Z0-9-]+)([^>]*)>/g, (_match, closing: string, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase()
      if (!allowedTags.has(tag)) return ''
      if (closing) return `</${tag}>`
      if (tag === 'br' || tag === 'hr') return `<${tag}>`

      const attrPairs = [...String(attrs).matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)]
      const safeAttrs: string[] = []
      if (tag === 'img') safeAttrs.push('loading="lazy"')
      for (const pair of attrPairs) {
        const name = pair[1].toLowerCase()
        const rawValue = pair[3] ?? pair[4] ?? pair[5] ?? ''
        if (name.startsWith('on') || name === 'style') continue
        if (tag === 'a' && name === 'href') {
          const href = cleanUrlAttribute(rawValue)
          if (href) {
            safeAttrs.push(`href="${escapeHtml(href)}"`)
            safeAttrs.push('rel="noopener noreferrer"')
          }
        }
        if (tag === 'img' && name === 'src') {
          const src = cleanUrlAttribute(rawValue, true)
          if (src) safeAttrs.push(`src="${escapeHtml(src)}"`)
        }
        if (tag === 'img' && name === 'alt') safeAttrs.push(`alt="${escapeHtml(rawValue)}"`)
      }

      return `<${tag}${safeAttrs.length ? ` ${safeAttrs.join(' ')}` : ''}>`
    })
}
