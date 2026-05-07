export const TICKER_NOTICES_SETTING_KEY = 'ticker_notices'

export interface TickerNotice {
  id: string
  message: string
  href: string
  isPublished: boolean
  updatedAt: string
}

export const DEFAULT_TICKER_NOTICE: TickerNotice = {
  id: 'payment-pg-limited',
  message: 'PG 연동문제로 무통장입금과 무료다운로드만 가능합니다.',
  href: '',
  isPublished: true,
  updatedAt: '2026-05-07T00:00:00.000Z',
}

function cleanString(value: unknown, limit: number) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : ''
}

function cleanHref(value: unknown) {
  const href = cleanString(value, 300)
  if (!href) return ''

  const lowerHref = href.toLowerCase()
  const isInternalPath = href.startsWith('/') && !href.startsWith('//')
  if (
    isInternalPath ||
    lowerHref.startsWith('https://') ||
    lowerHref.startsWith('http://') ||
    lowerHref.startsWith('mailto:') ||
    lowerHref.startsWith('tel:')
  ) {
    return href
  }

  return ''
}

function normalizeTickerNotice(value: unknown): TickerNotice | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const row = value as Record<string, unknown>
  const id = cleanString(row.id, 80)
  const message = cleanString(row.message, 180)
  if (!id || !message) return null

  return {
    id,
    message,
    href: cleanHref(row.href),
    isPublished: row.isPublished !== false && row.is_published !== false,
    updatedAt: cleanString(row.updatedAt, 40) || cleanString(row.updated_at, 40) || new Date().toISOString(),
  }
}

export function parseTickerNotices(value: string | null | undefined): TickerNotice[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as unknown
    const source = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { notices?: unknown }).notices)
        ? (parsed as { notices: unknown[] }).notices
        : []

    return source
      .map(normalizeTickerNotice)
      .filter((notice): notice is TickerNotice => notice !== null)
  } catch {
    return []
  }
}

export function serializeTickerNotices(notices: TickerNotice[]) {
  const normalized = notices
    .map((notice) => normalizeTickerNotice(notice))
    .filter((notice): notice is TickerNotice => notice !== null)

  return JSON.stringify({ notices: normalized })
}

export function getVisibleTickerNotices(notices: TickerNotice[]) {
  return notices.filter((notice) => notice.isPublished && notice.message.trim())
}
