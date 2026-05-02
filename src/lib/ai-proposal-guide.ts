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

export function buildAiProposalGuideBodyHtml(guide: AiProposalGuideSeed): string {
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
  return {
    ...seed,
    id: seed.slug,
    categorySlug: getDefaultCategorySlug(seed.step),
    sortOrder: seed.step,
    isPublished: true,
    publishedAt: AI_PROPOSAL_GUIDE_PUBLISHED_AT,
    updatedAt: AI_PROPOSAL_GUIDE_PUBLISHED_AT,
    coverTitle: seed.title,
    coverSubtitle: seed.primaryKeyword,
    coverTheme: getDefaultCoverTheme(seed.step),
    coverImageUrl: '',
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
    'ul',
    'ol',
    'li',
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
