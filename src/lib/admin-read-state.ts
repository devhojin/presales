export const ADMIN_READ_TRACKING_STARTED_AT = '2026-05-01T00:29:17+09:00'

const SYSTEM_ADMIN = '__system__'
const ORDER_READ_TYPE = 'admin_order_read'
const MEMBER_READ_TYPE = 'admin_member_read'

export interface OrderMemoEntry {
  text: string
  author: string
  created_at: string
  type?: string
}

export interface MemberMemoEntry {
  content: string
  created_at: string
  admin_name: string
  type?: string
  amount?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isOrderMemoEntry(value: unknown): value is OrderMemoEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.text === 'string' &&
    typeof value.author === 'string' &&
    typeof value.created_at === 'string'
  )
}

function isMemberMemoEntry(value: unknown): value is MemberMemoEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.content === 'string' &&
    typeof value.admin_name === 'string' &&
    typeof value.created_at === 'string'
  )
}

export function parseOrderMemoEntries(raw: unknown): OrderMemoEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(isOrderMemoEntry)
  if (typeof raw !== 'string') return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isOrderMemoEntry) : []
  } catch {
    return raw.trim()
      ? [{ text: raw.trim(), author: '관리자', created_at: new Date().toISOString() }]
      : []
  }
}

export function parseMemberMemoEntries(raw: string | null): MemberMemoEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isMemberMemoEntry) : []
  } catch {
    return raw.trim()
      ? [{ content: raw.trim(), created_at: new Date().toISOString(), admin_name: '관리자' }]
      : []
  }
}

function isOrderReadMarker(entry: OrderMemoEntry): boolean {
  return entry.author === SYSTEM_ADMIN && entry.type === ORDER_READ_TYPE
}

function isMemberReadMarker(entry: MemberMemoEntry): boolean {
  return entry.admin_name === SYSTEM_ADMIN && entry.type === MEMBER_READ_TYPE
}

export function getVisibleOrderMemos(raw: unknown): OrderMemoEntry[] {
  return parseOrderMemoEntries(raw).filter((entry) => !isOrderReadMarker(entry))
}

export function getVisibleMemberMemos(raw: string | null): MemberMemoEntry[] {
  return parseMemberMemoEntries(raw).filter((entry) => !isMemberReadMarker(entry))
}

export function stringifyOrderMemosForSave(visibleMemos: OrderMemoEntry[], currentRaw: unknown): OrderMemoEntry[] {
  const markers = parseOrderMemoEntries(currentRaw).filter(isOrderReadMarker)
  return [...markers.slice(-1), ...visibleMemos].slice(-100)
}

export function stringifyMemberMemosForSave(visibleMemos: MemberMemoEntry[], currentRaw: string | null): string {
  const markers = parseMemberMemoEntries(currentRaw).filter(isMemberReadMarker)
  return JSON.stringify([...markers.slice(-1), ...visibleMemos].slice(-100))
}

export function markOrderMemoRead(raw: unknown, readAt: string): OrderMemoEntry[] {
  const visible = getVisibleOrderMemos(raw)
  return [
    { text: '', author: SYSTEM_ADMIN, created_at: readAt, type: ORDER_READ_TYPE },
    ...visible,
  ].slice(-100)
}

export function markMemberMemoRead(raw: string | null, readAt: string): string {
  const visible = getVisibleMemberMemos(raw)
  return JSON.stringify([
    { content: '', admin_name: SYSTEM_ADMIN, created_at: readAt, type: MEMBER_READ_TYPE },
    ...visible,
  ].slice(-100))
}

export function getOrderReadAt(raw: unknown): string | null {
  return parseOrderMemoEntries(raw).find(isOrderReadMarker)?.created_at ?? null
}

export function getMemberReadAt(raw: string | null): string | null {
  return parseMemberMemoEntries(raw).find(isMemberReadMarker)?.created_at ?? null
}

function started(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  return new Date(createdAt).getTime() >= new Date(ADMIN_READ_TRACKING_STARTED_AT).getTime()
}

export function isOrderAdminUnread(order: { created_at: string | null; admin_memo: unknown; status?: string | null }): boolean {
  return order.status !== 'pending' && started(order.created_at) && !getOrderReadAt(order.admin_memo)
}

export function isMemberAdminUnread(member: {
  created_at: string | null
  admin_memo: string | null
  role?: string | null
  deleted_at?: string | null
}): boolean {
  return (
    member.role !== 'admin' &&
    !member.deleted_at &&
    started(member.created_at) &&
    !getMemberReadAt(member.admin_memo)
  )
}
