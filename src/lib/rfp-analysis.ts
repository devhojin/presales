import OpenAI from 'openai'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { escapeHtml } from '@/lib/html-escape'
import { SITE_URL } from '@/lib/constants'
import { BUSINESS_INFO } from '@/lib/business-info'

export const RFP_ANALYSIS_BUCKET = 'rfp-analysis'
export const RFP_ANALYSIS_MAX_TOTAL_SIZE = 50 * 1024 * 1024
export const RFP_ANALYSIS_MAX_TOTAL_SIZE_LABEL = '50MB'

export type RfpAnalysisStatus = 'created' | 'extracting' | 'analyzing' | 'rendering' | 'completed' | 'failed'

export interface FileMetaInput {
  name: string
  size: number
  type?: string | null
}

export interface ExtractedPdf {
  fileName: string
  label: 'RFP' | 'TASK'
  pageCount: number
  charCount: number
  pages: Array<{ page: number; text: string }>
}

export interface EvidenceValue {
  value: string
  sourceRefs: string[]
  sourceQuotes: string[]
  confidenceState: 'found' | 'not_found'
}

export interface EvaluationItem {
  category: string
  section: string
  item: string
  criterion: string
  score: string
  sourceRefs: string[]
  sourceQuotes: string[]
}

export interface RequirementItem {
  title: string
  summary: string
  sourceRefs: string[]
  sourceQuotes: string[]
}

export interface RfpAnalysisResult {
  projectTitle: EvidenceValue
  organization: EvidenceValue
  manager: EvidenceValue
  phone: EvidenceValue
  fax: EvidenceValue
  period: EvidenceValue
  budget: EvidenceValue
  bidMethod: EvidenceValue
  contractMethod: EvidenceValue
  eligibility: EvidenceValue
  backgroundPurpose: EvidenceValue
  scope: EvidenceValue
  consortium: EvidenceValue
  submission: EvidenceValue
  presentation: EvidenceValue
  evaluationMethod: EvidenceValue
  quantitativeScore: EvidenceValue
  qualitativeScore: EvidenceValue
  priceScore: EvidenceValue
  evaluationItems: EvaluationItem[]
  keyRequirements: RequirementItem[]
  questions: RequirementItem[]
  sourceSummary: {
    rfpPages: number
    taskPages: number
    analyzedAt: string
  }
}

export interface ReportProductLink {
  id: number
  title: string
  description: string | null
  price: number | null
  is_free: boolean | null
}

export interface ReportReview {
  title: string | null
  content: string
  rating: number
  reviewer_name: string | null
  product_id: number
  product_title: string | null
}

const USER_DELETED_AT_KEY = '_userDeletedAt'
const GUEST_ID_KEY = '_guestId'
const PDF_EXT_RE = /\.pdf$/i
const SAFE_FILE_RE = /[^a-zA-Z0-9._-]+/g
const NOT_FOUND = '원문에서 확인 불가'
const REPORT_FILE_PREFIX = '프리세일즈-AI 사업분석'
const REPORT_TITLE_EXT_RE = /\.(pdf|hwp|hwpx|docx?|pptx?|xlsx?|html?)$/i
const REPORT_FILE_UNSAFE_RE = /[\\/:*?"<>|\u0000-\u001f]+/g
const PDFJS_WORKER_SRC = pathToFileURL(
  path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
).href
let pdfJsDomGlobalsReady: Promise<void> | null = null
const SOURCE_KEYWORDS = [
  '사업명',
  '과업명',
  '사업기간',
  '과업기간',
  '사업비',
  '예산',
  '금액',
  '계약방법',
  '입찰방법',
  '협상',
  '참가자격',
  '제안서',
  '제출',
  '평가',
  '배점',
  '정량',
  '정성',
  '가격',
  '발표',
  '설명',
  '공동수급',
  '분담이행',
  '사업범위',
  '과업범위',
  '목적',
  '배경',
  '요구사항',
  '보안',
  '품질',
  '산출물',
]

export function getRfpAnalysisServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase service role 설정이 없습니다')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function getRfpAnalysisUserDeletedAt(resultJson: unknown) {
  if (!resultJson || typeof resultJson !== 'object' || Array.isArray(resultJson)) return null
  const value = (resultJson as Record<string, unknown>)[USER_DELETED_AT_KEY]
  return typeof value === 'string' && value.trim() ? value : null
}

export function getRfpAnalysisGuestId(resultJson: unknown) {
  if (!resultJson || typeof resultJson !== 'object' || Array.isArray(resultJson)) return null
  const value = (resultJson as Record<string, unknown>)[GUEST_ID_KEY]
  return typeof value === 'string' && value.trim() ? value : null
}

function getRfpAnalysisResultProjectTitle(resultJson: unknown) {
  if (!resultJson || typeof resultJson !== 'object' || Array.isArray(resultJson)) return null
  const projectTitle = (resultJson as Record<string, unknown>).projectTitle
  if (!projectTitle || typeof projectTitle !== 'object' || Array.isArray(projectTitle)) return null

  const row = projectTitle as Record<string, unknown>
  if (row.confidenceState !== 'found') return null

  const value = row.value
  return typeof value === 'string' ? value : null
}

export function withRfpAnalysisGuestId(resultJson: unknown, guestId: string) {
  const base = resultJson && typeof resultJson === 'object' && !Array.isArray(resultJson)
    ? resultJson as Record<string, unknown>
    : {}

  return {
    ...base,
    [GUEST_ID_KEY]: guestId,
  }
}

export function withRfpAnalysisUserDeletedAt(resultJson: unknown, deletedAt: string) {
  const base = resultJson && typeof resultJson === 'object' && !Array.isArray(resultJson)
    ? resultJson as Record<string, unknown>
    : {}

  return {
    ...base,
    [USER_DELETED_AT_KEY]: deletedAt,
  }
}

export function validatePdfMeta(file: FileMetaInput, label: string): string | null {
  const name = file.name || ''
  const type = file.type || ''
  if (!PDF_EXT_RE.test(name)) {
    return `${label}는 PDF 파일만 업로드할 수 있습니다. HWP/HWPX/DOCX 파일은 PDF로 변환해 주세요.`
  }
  if (type && type !== 'application/pdf' && type !== 'application/octet-stream') {
    return `${label}의 파일 형식이 PDF가 아닙니다.`
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return `${label} 파일 크기가 올바르지 않습니다.`
  }
  return null
}

export function sanitizeFileName(name: string) {
  const normalized = name.normalize('NFKD')
  const extMatch = normalized.match(/\.([a-zA-Z0-9]{1,8})$/)
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.pdf'
  const base = normalized
    .replace(/\.[a-zA-Z0-9]{1,8}$/, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(SAFE_FILE_RE, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  }
  return `${base || 'document'}-${hash.toString(36)}${ext}`
}

export function buildStoragePath(userId: string, jobId: string, role: 'rfp' | 'task' | 'report', fileName: string) {
  if (role === 'report') return `${userId}/${jobId}/report/${sanitizeFileName(fileName)}`
  return `${userId}/${jobId}/input/${role}-${sanitizeFileName(fileName)}`
}

function normalizeReportTitleForFileName(value: string | null | undefined) {
  const base = (value || '')
    .normalize('NFC')
    .replace(REPORT_TITLE_EXT_RE, '')
    .replace(REPORT_FILE_UNSAFE_RE, '_')
    .replace(/\s+/g, ' ')
    .replace(/_+/g, '_')
    .replace(/^[\s._-]+|[\s._-]+$/g, '')
    .slice(0, 100)

  if (!base || base === NOT_FOUND) return null
  return base
}

export function getRfpAnalysisReportFileName(title: string | null, fallback: string, resultJson?: unknown) {
  const titleCandidate = normalizeReportTitleForFileName(title)
  const fallbackCandidate = normalizeReportTitleForFileName(fallback)
  const resultTitleCandidate = normalizeReportTitleForFileName(getRfpAnalysisResultProjectTitle(resultJson))
  const titleIsFallback = Boolean(titleCandidate && fallbackCandidate && titleCandidate === fallbackCandidate)
  const projectTitle = titleIsFallback
    ? resultTitleCandidate || titleCandidate
    : titleCandidate || resultTitleCandidate || fallbackCandidate || 'RFP 분석 리포트'

  return `${REPORT_FILE_PREFIX}-${projectTitle}.html`
}

function defineMissingGlobal(name: 'DOMMatrix' | 'ImageData' | 'Path2D', value: unknown) {
  if (typeof globalThis[name] !== 'undefined') return
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  })
}

async function ensurePdfJsDomGlobals() {
  pdfJsDomGlobalsReady ??= (async () => {
    if (
      typeof globalThis.DOMMatrix !== 'undefined' &&
      typeof globalThis.ImageData !== 'undefined' &&
      typeof globalThis.Path2D !== 'undefined'
    ) {
      return
    }

    const canvas = await import('@napi-rs/canvas')
    defineMissingGlobal('DOMMatrix', canvas.DOMMatrix)
    defineMissingGlobal('ImageData', canvas.ImageData)
    defineMissingGlobal('Path2D', canvas.Path2D)
  })()

  return pdfJsDomGlobalsReady
}

export async function extractPdfText(buffer: ArrayBuffer, fileName: string, label: 'RFP' | 'TASK'): Promise<ExtractedPdf> {
  await ensurePdfJsDomGlobals()
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true,
  }).promise

  const pages: ExtractedPdf['pages'] = []
  let charCount = 0

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    charCount += text.length
    pages.push({ page: i, text })
  }

  return { fileName, label, pageCount: doc.numPages, charCount, pages }
}

function sourceScore(text: string) {
  let score = 0
  for (const keyword of SOURCE_KEYWORDS) {
    if (text.includes(keyword)) score += 3
  }
  score += Math.min(8, Math.floor(text.length / 800))
  return score
}

function selectRelevantPages(doc: ExtractedPdf) {
  const firstPages = new Set(doc.pages.slice(0, 12).map((page) => page.page))
  const scored = doc.pages
    .map((page) => ({ ...page, score: sourceScore(page.text) }))
    .filter((page) => page.text.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 55)

  const selected = new Map<number, string>()
  for (const page of doc.pages) {
    if (firstPages.has(page.page) && page.text) selected.set(page.page, page.text)
  }
  for (const page of scored) selected.set(page.page, page.text)

  return Array.from(selected.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([page, text]) => ({ page, text }))
}

export function buildSourceBundle(docs: ExtractedPdf[]) {
  const maxTotalChars = 135_000
  let total = 0
  const chunks: string[] = []

  for (const doc of docs) {
    chunks.push(`### ${doc.label} FILE: ${doc.fileName} (${doc.pageCount} pages)`)
    for (const page of selectRelevantPages(doc)) {
      if (total >= maxTotalChars) break
      const remaining = maxTotalChars - total
      const trimmed = page.text.slice(0, Math.min(1800, remaining))
      if (!trimmed) continue
      chunks.push(`--- ${doc.label} p.${page.page} ---\n${trimmed}`)
      total += trimmed.length
    }
  }

  return chunks.join('\n\n')
}

const evidenceValueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['value', 'sourceRefs', 'sourceQuotes', 'confidenceState'],
  properties: {
    value: { type: 'string' },
    sourceRefs: { type: 'array', items: { type: 'string' } },
    sourceQuotes: { type: 'array', items: { type: 'string' } },
    confidenceState: { type: 'string', enum: ['found', 'not_found'] },
  },
} as const

const sourcedItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'sourceRefs', 'sourceQuotes'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    sourceRefs: { type: 'array', items: { type: 'string' } },
    sourceQuotes: { type: 'array', items: { type: 'string' } },
  },
} as const

const analysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'projectTitle',
    'organization',
    'manager',
    'phone',
    'fax',
    'period',
    'budget',
    'bidMethod',
    'contractMethod',
    'eligibility',
    'backgroundPurpose',
    'scope',
    'consortium',
    'submission',
    'presentation',
    'evaluationMethod',
    'quantitativeScore',
    'qualitativeScore',
    'priceScore',
    'evaluationItems',
    'keyRequirements',
    'questions',
    'sourceSummary',
  ],
  properties: {
    projectTitle: evidenceValueSchema,
    organization: evidenceValueSchema,
    manager: evidenceValueSchema,
    phone: evidenceValueSchema,
    fax: evidenceValueSchema,
    period: evidenceValueSchema,
    budget: evidenceValueSchema,
    bidMethod: evidenceValueSchema,
    contractMethod: evidenceValueSchema,
    eligibility: evidenceValueSchema,
    backgroundPurpose: evidenceValueSchema,
    scope: evidenceValueSchema,
    consortium: evidenceValueSchema,
    submission: evidenceValueSchema,
    presentation: evidenceValueSchema,
    evaluationMethod: evidenceValueSchema,
    quantitativeScore: evidenceValueSchema,
    qualitativeScore: evidenceValueSchema,
    priceScore: evidenceValueSchema,
    evaluationItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'section', 'item', 'criterion', 'score', 'sourceRefs', 'sourceQuotes'],
        properties: {
          category: { type: 'string' },
          section: { type: 'string' },
          item: { type: 'string' },
          criterion: { type: 'string' },
          score: { type: 'string' },
          sourceRefs: { type: 'array', items: { type: 'string' } },
          sourceQuotes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    keyRequirements: { type: 'array', items: sourcedItemSchema },
    questions: { type: 'array', items: sourcedItemSchema },
    sourceSummary: {
      type: 'object',
      additionalProperties: false,
      required: ['rfpPages', 'taskPages', 'analyzedAt'],
      properties: {
        rfpPages: { type: 'number' },
        taskPages: { type: 'number' },
        analyzedAt: { type: 'string' },
      },
    },
  },
} as const

function notFoundEvidence(): EvidenceValue {
  return { value: NOT_FOUND, sourceRefs: [], sourceQuotes: [], confidenceState: 'not_found' }
}

function normalizeForMatch(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function quoteExists(quote: string, corpus: string) {
  const q = normalizeForMatch(quote)
  if (q.length < 4) return false
  return corpus.includes(q.slice(0, Math.min(q.length, 80)))
}

function validateEvidence(value: unknown, corpus: string): EvidenceValue {
  const item = value as Partial<EvidenceValue> | null
  if (!item || typeof item.value !== 'string') return notFoundEvidence()

  const refs = Array.isArray(item.sourceRefs)
    ? item.sourceRefs.filter((ref): ref is string => typeof ref === 'string' && ref.trim().length > 0).slice(0, 4)
    : []
  const quotes = Array.isArray(item.sourceQuotes)
    ? item.sourceQuotes
        .filter((quote): quote is string => typeof quote === 'string' && quote.trim().length > 0)
        .filter((quote) => quoteExists(quote, corpus))
        .slice(0, 4)
    : []

  if (!item.value.trim() || item.confidenceState !== 'found' || refs.length === 0 || quotes.length === 0) {
    return notFoundEvidence()
  }

  return {
    value: item.value.trim(),
    sourceRefs: refs,
    sourceQuotes: quotes,
    confidenceState: 'found',
  }
}

function validateSourcedItems<T extends { sourceRefs: string[]; sourceQuotes: string[] }>(
  items: T[] | undefined,
  corpus: string,
): T[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((item) => {
      const refs = item.sourceRefs?.filter(Boolean) ?? []
      const quotes = (item.sourceQuotes ?? []).filter((quote) => quoteExists(quote, corpus))
      item.sourceRefs = refs.slice(0, 4)
      item.sourceQuotes = quotes.slice(0, 4)
      return refs.length > 0 && quotes.length > 0
    })
    .slice(0, 24)
}

export function validateAnalysisResult(raw: unknown, docs: ExtractedPdf[]): RfpAnalysisResult {
  const sourceCorpus = normalizeForMatch(docs.flatMap((doc) => doc.pages.map((page) => page.text)).join(' '))
  const obj = raw as Partial<RfpAnalysisResult>

  return {
    projectTitle: validateEvidence(obj.projectTitle, sourceCorpus),
    organization: validateEvidence(obj.organization, sourceCorpus),
    manager: validateEvidence(obj.manager, sourceCorpus),
    phone: validateEvidence(obj.phone, sourceCorpus),
    fax: validateEvidence(obj.fax, sourceCorpus),
    period: validateEvidence(obj.period, sourceCorpus),
    budget: validateEvidence(obj.budget, sourceCorpus),
    bidMethod: validateEvidence(obj.bidMethod, sourceCorpus),
    contractMethod: validateEvidence(obj.contractMethod, sourceCorpus),
    eligibility: validateEvidence(obj.eligibility, sourceCorpus),
    backgroundPurpose: validateEvidence(obj.backgroundPurpose, sourceCorpus),
    scope: validateEvidence(obj.scope, sourceCorpus),
    consortium: validateEvidence(obj.consortium, sourceCorpus),
    submission: validateEvidence(obj.submission, sourceCorpus),
    presentation: validateEvidence(obj.presentation, sourceCorpus),
    evaluationMethod: validateEvidence(obj.evaluationMethod, sourceCorpus),
    quantitativeScore: validateEvidence(obj.quantitativeScore, sourceCorpus),
    qualitativeScore: validateEvidence(obj.qualitativeScore, sourceCorpus),
    priceScore: validateEvidence(obj.priceScore, sourceCorpus),
    evaluationItems: validateSourcedItems(obj.evaluationItems, sourceCorpus),
    keyRequirements: validateSourcedItems(obj.keyRequirements, sourceCorpus),
    questions: validateSourcedItems(obj.questions, sourceCorpus),
    sourceSummary: {
      rfpPages: docs.find((doc) => doc.label === 'RFP')?.pageCount ?? 0,
      taskPages: docs.find((doc) => doc.label === 'TASK')?.pageCount ?? 0,
      analyzedAt: new Date().toISOString(),
    },
  }
}

export async function runOpenAiRfpAnalysis(sourceBundle: string, docs: ExtractedPdf[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다')
  }

  const client = new OpenAI({ apiKey })
  const model = process.env.OPENAI_RFP_MODEL || 'gpt-5.5'
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              'You extract Korean public procurement RFP facts. Never infer. Never fabricate. Use only provided page-labeled source text. If a value is not explicitly supported by a source quote, return confidenceState not_found, value "원문에서 확인 불가", and empty sourceRefs/sourceQuotes. Return Korean text.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `아래 page-labeled 원문만 근거로 RFP 분석 리포트 JSON을 작성하세요.\n\n필수 규칙:\n- 모든 값은 sourceRefs와 sourceQuotes가 있어야 합니다.\n- sourceRefs는 "RFP p.3" 또는 "TASK p.12" 형식으로 쓰세요.\n- 원문에 없는 값은 절대 추정하지 말고 "원문에서 확인 불가"로 처리하세요.\n- 평가항목은 배점이 있는 항목을 우선 추출하세요.\n- 질의 후보는 원문상 모호하거나 확인이 필요한 조건만 작성하세요.\n\n${sourceBundle}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'rfp_analysis_report',
        strict: true,
        schema: analysisJsonSchema,
      },
    },
  })

  const parsed = JSON.parse(response.output_text || '{}')
  return {
    result: validateAnalysisResult(parsed, docs),
    responseId: response.id,
  }
}

export function getRfpAnalysisFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  const lower = message.toLowerCase()
  if (message.includes('429') && (lower.includes('quota') || lower.includes('billing'))) {
    return 'OpenAI API 사용량 또는 결제 한도를 초과했습니다. 결제 상태와 사용 한도를 확인한 뒤 다시 실행해주세요.'
  }
  if (message.includes('429') || lower.includes('rate limit')) {
    return 'OpenAI API 요청 한도에 도달했습니다. 잠시 후 다시 실행해주세요.'
  }
  if (lower.includes('invalid api key') || lower.includes('incorrect api key')) {
    return 'OpenAI API 키가 올바르지 않습니다. 서버 환경변수 OPENAI_API_KEY를 확인해주세요.'
  }
  if (message.includes('OPENAI_API_KEY')) {
    return message
  }
  return message || 'AI 분석 중 오류가 발생했습니다'
}

function evidenceCell(value: EvidenceValue) {
  const source = value.sourceRefs.length > 0 ? `<span>${escapeHtml(value.sourceRefs.join(', '))}</span>` : ''
  const quote = value.sourceQuotes[0] ? `<small>${escapeHtml(value.sourceQuotes[0])}</small>` : ''
  return `<div class="value">${escapeHtml(value.value)}</div><div class="source">${source}${quote}</div>`
}

function wonLabel(price: number | null, isFree: boolean | null) {
  if (isFree) return '무료'
  if (typeof price !== 'number') return '자료 보기'
  return `${new Intl.NumberFormat('ko-KR').format(price)}원`
}

function maskReviewerName(name: string | null | undefined) {
  const normalized = name?.trim()
  if (!normalized) return '익명'
  const first = Array.from(normalized)[0]
  return `${first}OO`
}

function numericScore(score: string) {
  const match = score.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function isQualitativeEvaluationItem(item: EvaluationItem) {
  const text = `${item.category} ${item.section} ${item.item}`
  return text.includes('정성') && !text.includes('정량') && !text.includes('가격')
}

function extractQualitativeProposalPageLimit(result: RfpAnalysisResult) {
  const sourceText = [result.submission.value, ...result.submission.sourceQuotes].join(' ')
  const patterns = [
    /정성(?:적)?(?:평가)?\s*제안서[^0-9]{0,50}(?:A4\s*)?(\d{1,4})\s*(?:쪽|페이지|page)/i,
    /정성(?:적)?\s*평가[^0-9]{0,50}제안서[^0-9]{0,50}(?:A4\s*)?(\d{1,4})\s*(?:쪽|페이지|page)/i,
  ]
  for (const pattern of patterns) {
    const match = sourceText.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

function extractQualitativeScoreTotal(result: RfpAnalysisResult) {
  const sourceText = [
    result.qualitativeScore.value,
    ...result.qualitativeScore.sourceQuotes,
    result.evaluationMethod.value,
    ...result.evaluationMethod.sourceQuotes,
  ].join(' ')
  const patterns = [
    /정성\s*평가[^0-9]{0,20}(\d+(?:\.\d+)?)\s*(?:점|%|퍼센트)?/i,
    /정성평가[^0-9]{0,20}(\d+(?:\.\d+)?)\s*(?:점|%|퍼센트)?/i,
    /정성적\s*평가[^0-9]{0,20}(\d+(?:\.\d+)?)\s*(?:점|%|퍼센트)?/i,
  ]
  for (const pattern of patterns) {
    const match = sourceText.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

function buildQualitativePageAllocation(result: RfpAnalysisResult) {
  const pageLimit = extractQualitativeProposalPageLimit(result)
  const confirmedTotalScore = extractQualitativeScoreTotal(result)
  const entries = result.evaluationItems
    .map((item, index) => ({ item, index, score: numericScore(item.score), pages: 0, remainder: 0 }))
    .filter((entry) => isQualitativeEvaluationItem(entry.item) && entry.score > 0)

  const extractedTotalScore = entries.reduce((sum, entry) => sum + entry.score, 0)
  const totalScore = confirmedTotalScore && confirmedTotalScore > 0 ? confirmedTotalScore : extractedTotalScore
  if (!pageLimit || totalScore <= 0 || entries.length === 0) {
    return { pageLimit, totalScore, allocations: new Map<number, number>() }
  }

  if (confirmedTotalScore && confirmedTotalScore > 0) {
    const allocations = new Map<number, number>()
    for (const entry of entries) {
      allocations.set(entry.index, Math.max(1, Math.round((entry.score / confirmedTotalScore) * pageLimit)))
    }
    return { pageLimit, totalScore: confirmedTotalScore, allocations }
  }

  const allocations = new Map<number, number>()
  let assigned = 0
  for (const entry of entries) {
    const exact = (entry.score / totalScore) * pageLimit
    entry.pages = Math.floor(exact)
    entry.remainder = exact - entry.pages
    assigned += entry.pages
  }

  const remaining = pageLimit - assigned
  const byRemainder = [...entries].sort((a, b) => b.remainder - a.remainder)
  for (let i = 0; i < remaining; i += 1) {
    byRemainder[i % byRemainder.length].pages += 1
  }

  for (const entry of entries) allocations.set(entry.index, entry.pages)
  return { pageLimit, totalScore, allocations }
}

export function buildReportHtml(
  result: RfpAnalysisResult,
  products: ReportProductLink[],
  reviews: ReportReview[],
) {
  const title = result.projectTitle.value === NOT_FOUND ? 'RFP 분석 리포트' : result.projectTitle.value
  const pageAllocation = buildQualitativePageAllocation(result)
  const productItems = products.length > 0
    ? products.map((product) => `
      <a class="promo-card" href="${SITE_URL}/store/${product.id}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${product.title} 새창 열기`)}">
        <strong>${escapeHtml(product.title)}</strong>
        <span>${escapeHtml(wonLabel(product.price, product.is_free))}</span>
        ${product.description ? `<p>${escapeHtml(product.description).slice(0, 120)}</p>` : ''}
      </a>
    `).join('')
    : '<p class="empty">현재 연결할 공개 추천 문서가 없습니다.</p>'
  const reviewItems = reviews.length > 0
    ? reviews.map((review) => `
      <a class="review-card" href="${SITE_URL}/store/${review.product_id}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${review.product_title || '프리세일즈 문서'} 사용후기 새창 열기`)}">
        <blockquote>
          <div class="stars">${'★'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 1)))}</div>
          <p>${escapeHtml(review.content).slice(0, 180)}</p>
          <cite>${escapeHtml(maskReviewerName(review.reviewer_name))}${review.product_title ? ` · ${escapeHtml(review.product_title)}` : ''}</cite>
        </blockquote>
      </a>
    `).join('')
    : '<p class="empty">현재 공개된 사용후기가 없습니다.</p>'

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | PRESALES AI RFP 분석 리포트</title>
  <style>
    :root { color-scheme: light; --ink:#111827; --muted:#64748b; --line:#d7dee8; --soft:#f8fafc; --blue:#1d4ed8; --navy:#0f172a; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif; color:var(--ink); background:#eef2f7; }
    .page { max-width: 1280px; margin: 0 auto; padding: 34px; }
    header { background: var(--navy); color:white; padding: 28px 30px; border-radius: 18px 18px 0 0; }
    .eyebrow { color:#93c5fd; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
    h1 { margin:10px 0 8px; font-size:30px; line-height:1.25; }
    .meta { color:#cbd5e1; font-size:13px; }
    .grid { display:grid; grid-template-columns: minmax(0, 1.18fr) minmax(320px, .82fr); gap:0; background:white; border:1px solid var(--line); border-top:0; }
    .panel { padding: 24px; border-right:1px solid var(--line); }
    .panel:last-child { border-right:0; }
    h2 { margin:0 0 16px; font-size:18px; }
    table { width:100%; border-collapse:collapse; table-layout: fixed; }
    th, td { border:1px solid var(--line); padding:10px; vertical-align:top; font-size:13px; line-height:1.55; }
    th { width:118px; background:#f1f5f9; text-align:left; color:#334155; font-weight:700; }
    .value { font-weight:650; white-space:pre-wrap; }
    .source { margin-top:5px; color:var(--muted); font-size:11px; }
    .source span { display:inline-block; margin-right:6px; color:var(--blue); font-weight:700; }
    .source small { display:block; margin-top:4px; font-size:11px; line-height:1.45; }
    .section { background:white; border:1px solid var(--line); border-top:0; padding:24px; }
    .focus-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; }
    .focus-card { border:1px solid var(--line); border-radius:12px; background:var(--soft); padding:14px; }
    .focus-card strong { display:block; margin-bottom:8px; font-size:13px; color:#334155; }
    .eval-section { padding:28px 24px 30px; }
    .eval-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
    .eval-head h2 { margin:0; }
    .eval-wrap { width:100%; overflow-x:auto; border:1px solid var(--line); }
    .eval-wrap .eval { border:0; }
    .eval { table-layout:auto; min-width:1040px; }
    .eval th, .eval td { border-top:0; }
    .eval th:first-child, .eval td:first-child { border-left:0; }
    .eval th:last-child, .eval td:last-child { border-right:0; }
    .eval tbody tr:last-child td { border-bottom:0; }
    .eval .category { width:13%; }
    .eval .section-col { width:15%; }
    .eval .item-col { width:18%; }
    .eval .criterion-col { width:34%; }
    .eval .score { width:8%; min-width:72px; text-align:center; font-weight:800; color:var(--blue); }
    .eval .pages { width:12%; min-width:96px; text-align:center; font-weight:800; color:#047857; }
    .page-basis { flex:1; max-width:620px; margin:0; padding:10px 12px; border:1px solid #bbf7d0; border-radius:10px; background:#f0fdf4; color:#166534; font-size:12px; line-height:1.55; }
    .cards { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
    .mini-card, .promo-card, blockquote { border:1px solid var(--line); border-radius:12px; background:var(--soft); padding:14px; }
    .mini-card strong, .promo-card strong { display:block; font-size:14px; margin-bottom:6px; }
    .mini-card p, .promo-card p, blockquote p { margin:0; color:#475569; font-size:12px; line-height:1.6; }
    .promo-card { display:block; color:inherit; text-decoration:none; background:#fff; }
    .promo-card:hover, .review-card:hover blockquote { border-color:#93c5fd; box-shadow:0 12px 30px -24px rgba(29,78,216,.45); }
    .promo-card span { display:inline-block; margin:4px 0 8px; font-size:12px; font-weight:800; color:var(--blue); }
    .promo { display:grid; grid-template-columns: 1fr 1fr; gap:18px; }
    blockquote { margin:0; }
    .review-card { display:block; color:inherit; text-decoration:none; }
    .stars { color:#f59e0b; letter-spacing:.08em; font-size:12px; }
    cite { display:block; margin-top:10px; color:#64748b; font-size:11px; font-style:normal; }
    .empty { color:var(--muted); font-size:13px; margin:0; }
    footer { background: var(--navy); color:#cbd5e1; padding:20px 30px; border-radius:0 0 18px 18px; font-size:12px; line-height:1.7; }
    footer strong { color:white; }
    .company-footer { display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:12px; margin-top:18px; padding-top:18px; border-top:1px solid rgba(203,213,225,.18); }
    .company-footer div, .company-footer a { display:block; min-width:0; color:inherit; text-decoration:none; }
    .company-footer span { display:block; color:#94a3b8; font-size:11px; font-weight:700; }
    .company-footer b { display:block; margin-top:2px; color:white; font-size:12px; font-weight:700; overflow-wrap:anywhere; }
    .company-footer a:hover b { color:#bfdbfe; }
    @media (max-width: 900px) { .page { padding:12px; } .grid, .promo { grid-template-columns:1fr; } .panel { border-right:0; border-bottom:1px solid var(--line); } .focus-grid { grid-template-columns:1fr; } .eval-head { display:block; } .page-basis { max-width:none; margin-top:10px; } .cards { grid-template-columns:1fr; } }
    @media (max-width: 900px) { .company-footer { grid-template-columns:1fr 1fr; } }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="eyebrow">PRESALES AI RFP ANALYSIS</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">분석일 ${escapeHtml(new Date(result.sourceSummary.analyzedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · RFP ${result.sourceSummary.rfpPages}쪽${result.sourceSummary.taskPages ? ` · 과업지시서 ${result.sourceSummary.taskPages}쪽` : ''}</div>
    </header>

    <div class="grid">
      <section class="panel">
        <h2>입찰 구성 내용</h2>
        <table>
          <tbody>
            <tr><th>사업명</th><td>${evidenceCell(result.projectTitle)}</td></tr>
            <tr><th>발주기관</th><td>${evidenceCell(result.organization)}</td></tr>
            <tr><th>담당자</th><td>${evidenceCell(result.manager)}</td></tr>
            <tr><th>전화/FAX</th><td>${evidenceCell({ ...result.phone, value: `${result.phone.value} / ${result.fax.value}` })}</td></tr>
            <tr><th>사업기간</th><td>${evidenceCell(result.period)}</td></tr>
            <tr><th>사업금액</th><td>${evidenceCell(result.budget)}</td></tr>
            <tr><th>입찰방법</th><td>${evidenceCell(result.bidMethod)}</td></tr>
            <tr><th>계약방법</th><td>${evidenceCell(result.contractMethod)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>제안서 구성 내용</h2>
        <table>
          <tbody>
            <tr><th>제안서 제출</th><td>${evidenceCell(result.submission)}</td></tr>
            <tr><th>제안설명/발표</th><td>${evidenceCell(result.presentation)}</td></tr>
            <tr><th>평가방법</th><td>${evidenceCell(result.evaluationMethod)}</td></tr>
            <tr><th>정량평가</th><td>${evidenceCell(result.quantitativeScore)}</td></tr>
            <tr><th>정성평가</th><td>${evidenceCell(result.qualitativeScore)}</td></tr>
            <tr><th>가격평가</th><td>${evidenceCell(result.priceScore)}</td></tr>
          </tbody>
        </table>

      </section>
    </div>

    <section class="section">
      <h2>사업 범위/참여 조건</h2>
      <div class="focus-grid">
        <div class="focus-card"><strong>참가자격</strong>${evidenceCell(result.eligibility)}</div>
        <div class="focus-card"><strong>사업 배경/목적</strong>${evidenceCell(result.backgroundPurpose)}</div>
        <div class="focus-card"><strong>사업범위</strong>${evidenceCell(result.scope)}</div>
        <div class="focus-card"><strong>공동수급</strong>${evidenceCell(result.consortium)}</div>
      </div>
    </section>

    <section class="section eval-section">
      <div class="eval-head">
        <h2>평가 항목/배점</h2>
        ${pageAllocation.pageLimit && pageAllocation.totalScore > 0 ? `<div class="page-basis">정성적평가 제안서 ${pageAllocation.pageLimit}쪽 이내 기준 · 정성평가 ${pageAllocation.totalScore}점 배점 비례 권장 페이지수</div>` : '<div class="page-basis">정성적평가 제안서 페이지수 기준을 원문에서 확인하지 못해 권장 페이지수를 산정하지 않았습니다.</div>'}
      </div>
      <div class="eval-wrap">
        <table class="eval">
          <thead><tr><th class="category">구분</th><th class="section-col">제안서 장/절</th><th class="item-col">평가항목</th><th class="criterion-col">평가기준</th><th class="score">배점</th><th class="pages">권장쪽수</th></tr></thead>
          <tbody>
            ${result.evaluationItems.length > 0 ? result.evaluationItems.map((item, index) => {
              const pages = pageAllocation.allocations.get(index)
              return `
              <tr>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.section)}</td>
                <td>${escapeHtml(item.item)}</td>
                <td>${escapeHtml(item.criterion)}<div class="source"><span>${escapeHtml(item.sourceRefs.join(', '))}</span>${item.sourceQuotes[0] ? `<small>${escapeHtml(item.sourceQuotes[0])}</small>` : ''}</div></td>
                <td class="score">${escapeHtml(item.score)}</td>
                <td class="pages">${typeof pages === 'number' ? `약 ${pages}쪽` : '-'}</td>
              </tr>
            `}).join('') : '<tr><td colspan="6" class="empty">근거가 확인된 평가항목을 찾지 못했습니다.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <h2>주요 과업 요구사항</h2>
      <div class="cards">
        ${result.keyRequirements.length > 0 ? result.keyRequirements.slice(0, 9).map((item) => `
          <div class="mini-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><div class="source"><span>${escapeHtml(item.sourceRefs.join(', '))}</span>${item.sourceQuotes[0] ? `<small>${escapeHtml(item.sourceQuotes[0])}</small>` : ''}</div></div>
        `).join('') : '<p class="empty">근거가 확인된 주요 과업 요구사항을 찾지 못했습니다.</p>'}
      </div>
    </section>

    <section class="section">
      <h2>질의 후보</h2>
      <div class="cards">
        ${result.questions.length > 0 ? result.questions.slice(0, 6).map((item) => `
          <div class="mini-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><div class="source"><span>${escapeHtml(item.sourceRefs.join(', '))}</span>${item.sourceQuotes[0] ? `<small>${escapeHtml(item.sourceQuotes[0])}</small>` : ''}</div></div>
        `).join('') : '<p class="empty">원문 근거가 있는 질의 후보를 찾지 못했습니다.</p>'}
      </div>
    </section>

    <section class="section promo">
      <div>
        <h2>참조하기 좋은 프리세일즈 문서</h2>
        <div class="cards">${productItems}</div>
      </div>
      <div>
        <h2>사용후기</h2>
        <div class="cards">${reviewItems}</div>
      </div>
    </section>

    <footer>
      <strong>중요 안내</strong><br />
      이 리포트는 업로드된 원문에서 확인된 문장과 페이지 근거를 기준으로 자동 생성되었습니다.
      원문 근거가 없는 값은 표시하지 않으며, 최종 입찰 참여 여부·제출 조건·가격·법적 판단은 반드시 담당자가 원문과 나라장터 제출 화면에서 다시 확인해야 합니다.
      <div class="company-footer" aria-label="프리세일즈 사업자 정보">
        <div><span>브랜드</span><b>프리세일즈</b></div>
        <div><span>사업자등록번호</span><b>${escapeHtml(BUSINESS_INFO.businessNumber)}</b></div>
        <div><span>통신판매신고번호</span><b>${escapeHtml(BUSINESS_INFO.commerceNumber)}</b></div>
        <div><span>출판사신고번호</span><b>${escapeHtml(BUSINESS_INFO.publisherNumber)}</b></div>
        <a href="${SITE_URL}/faq" target="_blank" rel="noopener noreferrer" aria-label="고객지원 새창 열기"><span>고객지원</span><b>문의하기</b></a>
      </div>
    </footer>
  </div>
</body>
</html>`
}

export async function fetchReportPromotions(supabase: SupabaseClient) {
  const [{ data: products }, { data: reviews }] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, description, price, is_free')
      .eq('is_published', true)
      .or('title.ilike.%RFP%,title.ilike.%제안%,title.ilike.%기술%,description.ilike.%RFP%,description.ilike.%제안%')
      .order('download_count', { ascending: false })
      .limit(3),
    supabase
      .from('reviews')
      .select('title, content, rating, reviewer_name, product_id, products(id, title)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const normalizedReviews = (reviews ?? []).map((review) => {
    const product = Array.isArray(review.products) ? review.products[0] : review.products
    return {
      title: review.title ?? null,
      content: review.content,
      rating: review.rating,
      reviewer_name: review.reviewer_name ?? null,
      product_id: review.product_id,
      product_title: product?.title ?? null,
    }
  })

  return {
    products: (products ?? []) as ReportProductLink[],
    reviews: normalizedReviews as ReportReview[],
  }
}
