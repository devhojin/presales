export const SITE_NOTICES_SETTING_KEY = 'site_notices'

export const NOTICE_CATEGORIES = [
  { value: 'service', label: '서비스' },
  { value: 'store', label: '문서 스토어' },
  { value: 'payment', label: '결제' },
  { value: 'brief', label: '모닝 브리프' },
  { value: 'security', label: '보안' },
  { value: 'maintenance', label: '점검' },
] as const

export type NoticeCategory = typeof NOTICE_CATEGORIES[number]['value']

export interface SiteNotice {
  id: string
  title: string
  summary: string
  body: string
  category: NoticeCategory
  publishedAt: string
  isPublished: boolean
  isPinned: boolean
  updatedAt: string
}

function isNoticeCategory(value: unknown): value is NoticeCategory {
  return NOTICE_CATEGORIES.some((category) => category.value === value)
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNotice(value: unknown): SiteNotice | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const row = value as Record<string, unknown>
  const id = cleanString(row.id)
  const title = cleanString(row.title)
  if (!id || !title) return null

  const category = isNoticeCategory(row.category) ? row.category : 'service'
  const now = new Date().toISOString()

  return {
    id,
    title,
    summary: cleanString(row.summary),
    body: cleanString(row.body),
    category,
    publishedAt: cleanString(row.publishedAt) || cleanString(row.published_at) || now,
    isPublished: row.isPublished !== false && row.is_published !== false,
    isPinned: row.isPinned === true || row.is_pinned === true,
    updatedAt: cleanString(row.updatedAt) || cleanString(row.updated_at) || now,
  }
}

export function parseSiteNotices(value: string | null | undefined): SiteNotice[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as unknown
    const source = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { notices?: unknown }).notices)
        ? (parsed as { notices: unknown[] }).notices
        : []

    return source
      .map(normalizeNotice)
      .filter((notice): notice is SiteNotice => notice !== null)
  } catch {
    return []
  }
}

export function serializeSiteNotices(notices: SiteNotice[]): string {
  return JSON.stringify({ notices: sortSiteNotices(notices) })
}

export function sortSiteNotices(notices: SiteNotice[]): SiteNotice[] {
  return [...notices].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })
}

export function getNoticeCategoryLabel(category: NoticeCategory): string {
  return NOTICE_CATEGORIES.find((item) => item.value === category)?.label ?? '서비스'
}

export function formatNoticeDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
