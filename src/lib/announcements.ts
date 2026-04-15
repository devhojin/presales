// ============================================
// 공고 사업 타입 & 유틸리티
// ============================================

export interface Announcement {
  id: string
  title: string
  organization: string | null
  type: string
  budget: string | null
  start_date: string | null
  end_date: string | null
  status: string
  source: string
  external_id: string | null
  is_published: boolean
  application_method: string | null
  target: string | null
  description: string | null
  eligibility: string | null
  department: string | null
  contact: string | null
  source_url: string | null
  field: string | null
  governing_body: string | null
  matching_keywords: string[]
  support_areas: string[]
  regions: string[]
  target_types: string[]
  age_ranges: string[]
  business_years: string[]
  created_at: string
  updated_at: string
}

export interface AnnouncementLog {
  id: string
  action: string
  announcement_id: string | null
  announcement_title: string | null
  source: string | null
  detail: string | null
  created_at: string
}

// D-Day 계산
export function calcDDay(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// 마감 여부
export function isExpired(ann: Announcement): boolean {
  if (ann.status === 'closed') return true
  if (!ann.end_date) return false
  const dday = calcDDay(ann.end_date)
  return dday !== null && dday < 0
}

// 날짜 포맷
export function formatAnnouncementDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 기간 표시
export function formatPeriod(start: string | null, end: string | null): string {
  return `${formatAnnouncementDate(start)} ~ ${formatAnnouncementDate(end)}`
}

// 공고 유형 라벨
export function getTypeLabel(type: string): string {
  switch (type) {
    case 'public': return '정부지원'
    case 'private': return '민간'
    case 'poc': return 'PoC'
    default: return type
  }
}

// 공고 유형 색상
export function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'public': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'private': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'poc': return 'bg-amber-50 text-amber-700 border-amber-200'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

// 상태 색상
export function getStatusBadgeClass(status: string, endDate: string | null): string {
  const expired = endDate ? calcDDay(endDate)! < 0 : false
  if (status === 'closed' || expired) {
    return 'bg-zinc-100 text-zinc-500 border-zinc-200'
  }
  return 'bg-blue-50 text-blue-800 border-blue-200'
}

// 상태 라벨
export function getStatusLabel(status: string, endDate: string | null): string {
  const expired = endDate ? calcDDay(endDate)! < 0 : false
  if (status === 'closed' || expired) return '마감'
  return '모집중'
}
