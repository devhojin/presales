'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import {
  Search, Megaphone, Calendar, ArrowLeft, ExternalLink,
  Clock, Loader2, Star, Building2, Phone, ChevronDown,
  SlidersHorizontal, X,
} from 'lucide-react'
import {
  type Announcement,
  calcDDay,
  isExpired,
  formatPeriod,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/lib/announcements'
import { useToastStore } from '@/stores/toast-store'

type FilterStatus = 'all' | 'active' | 'closed'
type ReadTab = 'unread' | 'read' | 'bookmarks'
type DeadlineFilter = 'all' | 'urgent' | 'month' | 'later'

type FilterOption = {
  key: string
  label: string
  value?: string
  values?: string[]
}

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000

const SUPPORT_AREA_OPTIONS: FilterOption[] = [
  { key: 'all', label: '전체 분야' },
  { key: 'business', label: '사업화', values: ['사업화'] },
  { key: 'mentoring', label: '멘토링·컨설팅·교육', values: ['멘토링ㆍ컨설팅ㆍ교육'] },
  { key: 'space', label: '시설·공간·보육', values: ['시설ㆍ공간ㆍ보육'] },
  { key: 'network', label: '행사·네트워크', values: ['행사ㆍ네트워크'] },
  { key: 'market', label: '판로·해외진출', values: ['판로ㆍ해외진출'] },
  { key: 'education', label: '창업교육', values: ['창업교육'] },
  { key: 'global', label: '글로벌', values: ['글로벌'] },
  { key: 'rnd', label: '기술개발 R&D', values: ['기술개발(R&amp;D)'] },
  { key: 'funding', label: '정책자금·융자', values: ['정책자금', '융자ㆍ보증'] },
]

const REGION_OPTIONS: FilterOption[] = [
  { key: 'all', label: '전체 지역' },
  { key: 'national', label: '전국', value: '전국' },
  { key: 'seoul', label: '서울', value: '서울특별시' },
  { key: 'gyeonggi', label: '경기', value: '경기도' },
  { key: 'busan', label: '부산', value: '부산광역시' },
  { key: 'daejeon', label: '대전', value: '대전광역시' },
  { key: 'incheon', label: '인천', value: '인천광역시' },
  { key: 'daegu', label: '대구', value: '대구광역시' },
  { key: 'gwangju', label: '광주', value: '광주광역시' },
]

const GOVERNING_BODY_OPTIONS: FilterOption[] = [
  { key: 'all', label: '전체 기관' },
  { key: 'public', label: '공공기관', value: '공공기관' },
  { key: 'private', label: '민간', value: '민간' },
  { key: 'education', label: '교육기관', value: '교육기관' },
  { key: 'local', label: '지자체', value: '지자체' },
]

const TARGET_TYPE_OPTIONS: FilterOption[] = [
  { key: 'all', label: '전체 대상' },
  { key: 'company', label: '일반기업', value: '일반기업' },
  { key: 'creator', label: '1인창조기업', value: '1인창조기업' },
  { key: 'person', label: '일반인', value: '일반인' },
  { key: 'student', label: '대학생', value: '대학생' },
  { key: 'research', label: '연구기관', value: '연구기관' },
  { key: 'university', label: '대학', value: '대학' },
]

const BUSINESS_YEAR_OPTIONS: FilterOption[] = [
  { key: 'all', label: '전체 업력' },
  { key: 'pre', label: '예비창업자', value: '예비창업자' },
  { key: '1', label: '1년 미만', value: '1년미만' },
  { key: '3', label: '3년 미만', value: '3년미만' },
  { key: '5', label: '5년 미만', value: '5년미만' },
  { key: '7', label: '7년 미만', value: '7년미만' },
  { key: '10', label: '10년 미만', value: '10년미만' },
]

const DEADLINE_OPTIONS: { key: DeadlineFilter; label: string }[] = [
  { key: 'all', label: '전체 마감' },
  { key: 'urgent', label: 'D-7 이내' },
  { key: 'month', label: 'D-8~30' },
  { key: 'later', label: 'D-31+' },
]

function DayBadge({ dday }: { dday: number | null }) {
  if (dday === null) return null
  const isUrgent = dday <= 3 && dday >= 0
  return (
    <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
      {dday < 0 ? '마감' : `D-${dday}`}
    </span>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border/50 text-foreground hover:border-border hover:bg-muted'
      }`}
    >
      {children}
    </button>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export default function AnnouncementsClient() {
  const { addToast } = useToastStore()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [supportAreaKey, setSupportAreaKey] = useState('all')
  const [regionKey, setRegionKey] = useState('all')
  const [governingBodyKey, setGoverningBodyKey] = useState('all')
  const [targetTypeKey, setTargetTypeKey] = useState('all')
  const [businessYearKey, setBusinessYearKey] = useState('all')
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all')
  const [detailFiltersOpen, setDetailFiltersOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false) // mobile toggle
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const PAGE_SIZE = 200

  // Auth & bookmark/read state
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [readMap, setReadMap] = useState<Map<string, string>>(new Map()) // id → read_at (실시간, 회색 스타일용)
  const [initialReadSet, setInitialReadSet] = useState<Set<string>>(new Set()) // 페이지 진입 시점 읽음 (탭 필터용)
  const [readTab, setReadTab] = useState<ReadTab>('unread')
  const [serverCounts, setServerCounts] = useState<{ active: number; closed: number; unread: number; read: number; bookmarks: number }>({ active: 0, closed: 0, unread: 0, read: 0, bookmarks: 0 })

  // Load user session
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Load announcements (paginated via API)
  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const areaOption = SUPPORT_AREA_OPTIONS.find(option => option.key === supportAreaKey)
      if (areaOption?.values?.length) params.set('areas', areaOption.values.join(','))
      const regionOption = REGION_OPTIONS.find(option => option.key === regionKey)
      if (regionOption?.value) params.set('region', regionOption.value)
      const governingBodyOption = GOVERNING_BODY_OPTIONS.find(option => option.key === governingBodyKey)
      if (governingBodyOption?.value) params.set('governingBody', governingBodyOption.value)
      const targetTypeOption = TARGET_TYPE_OPTIONS.find(option => option.key === targetTypeKey)
      if (targetTypeOption?.value) params.set('targetType', targetTypeOption.value)
      const businessYearOption = BUSINESS_YEAR_OPTIONS.find(option => option.key === businessYearKey)
      if (businessYearOption?.value) params.set('businessYear', businessYearOption.value)
      if (deadlineFilter !== 'all') params.set('deadline', deadlineFilter)
      if (userId) params.set('tab', readTab)

      const res = await fetch(`/api/announcements?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { announcements: Announcement[]; total: number; counts?: { active: number; closed: number; unread: number; read: number; bookmarks: number } }
      setAnnouncements(prev => append ? [...prev, ...body.announcements] : body.announcements)
      setTotal(body.total)
      if (body.counts) setServerCounts(body.counts)
      setPage(pageNum)
    } catch {
      // keep prior data on failure
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [
    debouncedSearch,
    filterStatus,
    supportAreaKey,
    regionKey,
    governingBodyKey,
    targetTypeKey,
    businessYearKey,
    deadlineFilter,
    userId,
    readTab,
  ])

  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  // Infinite scroll
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (!entry.isIntersecting) return
      if (loading || loadingMore) return
      if (announcements.length >= total) return
      fetchPage(page + 1, true)
    }, { rootMargin: '200px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [announcements.length, total, page, loading, loadingMore, fetchPage])

  // Load bookmarks & reads
  useEffect(() => {
    if (!userId) return
    Promise.all([
      fetch('/api/bookmarks/announcements').then(r => r.json()),
      createClient()
        .from('announcement_reads')
        .select('announcement_id, read_at')
        .eq('user_id', userId),
    ]).then(([bmRes, readsRes]) => {
      if (bmRes.bookmarks) {
        setBookmarkedIds(new Set(bmRes.bookmarks.map((b: { announcement_id: string }) => b.announcement_id)))
      }
      if (readsRes.data) {
        const map = new Map<string, string>()
        const initSet = new Set<string>()
        readsRes.data.forEach((r: { announcement_id: string; read_at: string }) => {
          map.set(r.announcement_id, r.read_at)
          if (Date.now() - new Date(r.read_at).getTime() < TWO_WEEKS) {
            initSet.add(r.announcement_id)
          }
        })
        setReadMap(map)
        setInitialReadSet(initSet)
      }
    })
  }, [userId])

  // Sort: active first, then by end_date
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      const aExpired = isExpired(a)
      const bExpired = isExpired(b)
      if (aExpired !== bExpired) return aExpired ? 1 : -1
      const aDate = a.end_date ? new Date(a.end_date).getTime() : Number.MAX_VALUE
      const bDate = b.end_date ? new Date(b.end_date).getTime() : Number.MAX_VALUE
      return aDate - bDate
    })
  }, [announcements])

  // 서버에서 이미 tab/search/status 필터링 + 총계 계산됨 (허수 방지)
  const filteredAnnouncements = sortedAnnouncements

  const selectedAnnouncement = useMemo(
    () => announcements.find(a => a.id === selectedId) || null,
    [announcements, selectedId]
  )

  // Auto-select first item
  useEffect(() => {
    if (filteredAnnouncements.length === 0) {
      if (selectedId) setSelectedId(null)
      return
    }
    if (!selectedId || !filteredAnnouncements.some(ann => ann.id === selectedId)) {
      setSelectedId(filteredAnnouncements[0].id)
    }
  }, [filteredAnnouncements, selectedId])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setShowDetail(true)

    // Mark as read
    if (userId) {
      setReadMap(prev => {
        const next = new Map(prev)
        next.set(id, new Date().toISOString())
        return next
      })
      fetch('/api/reads/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement_id: id }),
      })
    }
  }, [userId])

  const handleToggleBookmark = useCallback(async (id: string) => {
    if (!userId) {
      addToast('로그인 후 이용 가능합니다', 'error')
      return
    }

    const wasBookmarked = bookmarkedIds.has(id)
    setBookmarkedIds(prev => {
      const next = new Set(prev)
      if (wasBookmarked) next.delete(id)
      else next.add(id)
      return next
    })

    const res = await fetch('/api/bookmarks/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id }),
    })

    if (res.ok) {
      addToast(wasBookmarked ? '즐겨찾기에서 제거했습니다' : '즐겨찾기에 추가했습니다', 'success')
    }
  }, [userId, bookmarkedIds, addToast])

  // 서버에서 받은 정확한 카운트 사용
  const tabCounts = serverCounts
  const secondaryFilterCount = [
    regionKey !== 'all',
    governingBodyKey !== 'all',
    targetTypeKey !== 'all',
    businessYearKey !== 'all',
    deadlineFilter !== 'all',
    Boolean(userId && readTab !== 'unread'),
  ].filter(Boolean).length
  const hasAnyFilter =
    debouncedSearch.trim() ||
    filterStatus !== 'all' ||
    supportAreaKey !== 'all' ||
    secondaryFilterCount > 0

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearch('')
    setFilterStatus('all')
    setSupportAreaKey('all')
    setRegionKey('all')
    setGoverningBodyKey('all')
    setTargetTypeKey('all')
    setBusinessYearKey('all')
    setDeadlineFilter('all')
    setReadTab('unread')
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <Megaphone className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">공고 사업</h1>
        </div>
        <p className="text-muted-foreground">정부 지원사업 공고 정보를 확인하세요</p>
      </div>

      {/* Search + Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="공고명, 담당 기관으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3 border border-border/50 rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
          <FilterGroup label="상태">
            {(['all', 'active', 'closed'] as FilterStatus[]).map(f => (
              <FilterPill key={f} active={filterStatus === f} onClick={() => setFilterStatus(f)}>
                {f === 'all' ? '전체' : f === 'active' ? '모집중' : '마감'}
                {f !== 'all' && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    filterStatus === f ? 'bg-white/25' : 'bg-muted text-muted-foreground'
                  }`}>
                    {f === 'active' ? serverCounts.active : serverCounts.closed}
                  </span>
                )}
              </FilterPill>
            ))}
          </FilterGroup>

          <FilterGroup label="지원 분야">
            {SUPPORT_AREA_OPTIONS.map(option => (
              <FilterPill key={option.key} active={supportAreaKey === option.key} onClick={() => setSupportAreaKey(option.key)}>
                {option.label}
              </FilterPill>
            ))}
          </FilterGroup>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card">
          <div className="flex items-center justify-between gap-3 p-3">
            <button
              type="button"
              onClick={() => setDetailFiltersOpen(open => !open)}
              aria-expanded={detailFiltersOpen}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              상세 필터
              {secondaryFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                  {secondaryFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${detailFiltersOpen ? 'rotate-180' : ''}`} />
            </button>
            {hasAnyFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                초기화
              </button>
            )}
          </div>
          {detailFiltersOpen && (
            <div className="grid gap-5 border-t border-border/50 p-4 md:grid-cols-2">
              <FilterGroup label="지역">
                {REGION_OPTIONS.map(option => (
                  <FilterPill key={option.key} active={regionKey === option.key} onClick={() => setRegionKey(option.key)}>
                    {option.label}
                  </FilterPill>
                ))}
              </FilterGroup>

              <FilterGroup label="주관기관">
                {GOVERNING_BODY_OPTIONS.map(option => (
                  <FilterPill key={option.key} active={governingBodyKey === option.key} onClick={() => setGoverningBodyKey(option.key)}>
                    {option.label}
                  </FilterPill>
                ))}
              </FilterGroup>

              <FilterGroup label="지원 대상">
                {TARGET_TYPE_OPTIONS.map(option => (
                  <FilterPill key={option.key} active={targetTypeKey === option.key} onClick={() => setTargetTypeKey(option.key)}>
                    {option.label}
                  </FilterPill>
                ))}
              </FilterGroup>

              <FilterGroup label="업력">
                {BUSINESS_YEAR_OPTIONS.map(option => (
                  <FilterPill key={option.key} active={businessYearKey === option.key} onClick={() => setBusinessYearKey(option.key)}>
                    {option.label}
                  </FilterPill>
                ))}
              </FilterGroup>

              <FilterGroup label="마감">
                {DEADLINE_OPTIONS.map(option => (
                  <FilterPill key={option.key} active={deadlineFilter === option.key} onClick={() => setDeadlineFilter(option.key)}>
                    {option.label}
                  </FilterPill>
                ))}
              </FilterGroup>

              {userId && (
                <FilterGroup label="내 공고">
                  {([
                    { key: 'unread' as ReadTab, label: '읽지않음', count: tabCounts.unread },
                    { key: 'read' as ReadTab, label: '읽음', count: tabCounts.read },
                    { key: 'bookmarks' as ReadTab, label: '즐겨찾기', count: tabCounts.bookmarks },
                  ]).map(t => (
                    <FilterPill key={t.key} active={readTab === t.key} onClick={() => setReadTab(t.key)}>
                      {t.label}
                      <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                        readTab === t.key ? 'bg-white/25' : 'bg-muted text-muted-foreground'
                      }`}>
                        {t.count}
                      </span>
                    </FilterPill>
                  ))}
                </FilterGroup>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Split-View Content */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-24">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">공고가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? '다른 키워드로 검색해보세요' : '등록된 공고가 아직 없습니다'}
          </p>
        </div>
      ) : (
        <div className="flex gap-4 mb-12 items-start">
          {/* LEFT: List Panel (자연 높이, 페이지 스크롤) */}
          <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[40%] border border-border/50 rounded-2xl overflow-hidden bg-card`}>
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">
                {userId ? `${filteredAnnouncements.length}개 표시 / 전체 ${total.toLocaleString()}개` : `전체 ${total.toLocaleString()}개 공고`}
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {filteredAnnouncements.map((ann) => {
                const dday = calcDDay(ann.end_date)
                const isActive = ann.id === selectedId
                const isRead = readMap.has(ann.id)
                const isBookmarked = bookmarkedIds.has(ann.id)
                return (
                  <Link
                    key={ann.id}
                    href={`/announcements/${ann.id}`}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                      event.preventDefault()
                      handleSelect(ann.id)
                    }}
                    className={`block w-full min-w-0 text-left border-l-[3px] px-4 py-3.5 transition-colors cursor-pointer ${
                      isActive ? 'bg-primary/5 border-l-primary' : 'hover:bg-muted/50 border-l-transparent'
                    } ${!isRead && userId ? 'font-semibold' : ''}`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2 mb-1">
                      <Badge className={`text-[10px] font-semibold border shrink-0 ${getStatusBadgeClass(ann.status, ann.end_date)}`}>
                        {getStatusLabel(ann.status, ann.end_date)}
                      </Badge>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBookmarked && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        <DayBadge dday={dday} />
                      </div>
                    </div>
                    <p className={`text-sm leading-snug line-clamp-2 mb-1 ${isActive ? 'text-foreground' : isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {ann.title}
                    </p>
                    {ann.organization && (
                      <p className="text-xs text-muted-foreground truncate">{ann.organization}</p>
                    )}
                  </Link>
                )
              })}
            </div>
            {announcements.length < total && (
              <div ref={sentinelRef} className="py-4 flex items-center justify-center border-t border-border/50">
                {loadingMore ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={() => fetchPage(page + 1, true)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    더 보기 ({(total - announcements.length).toLocaleString()}개 남음)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Detail Panel (sticky, 뷰포트 높이) */}
          <div
            className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-col flex-1 border border-border/50 rounded-2xl overflow-hidden bg-card sticky self-start`}
            style={{ top: '80px', height: 'calc(100vh - 100px)' }}
          >
            {selectedAnnouncement ? (
              <AnnouncementDetail
                announcement={selectedAnnouncement}
                isBookmarked={bookmarkedIds.has(selectedAnnouncement.id)}
                onToggleBookmark={() => handleToggleBookmark(selectedAnnouncement.id)}
                onBack={() => setShowDetail(false)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">좌측에서 공고를 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================
// Detail Component
// ============================

function AnnouncementDetail({
  announcement: ann,
  isBookmarked,
  onToggleBookmark,
  onBack,
}: {
  announcement: Announcement
  isBookmarked: boolean
  onToggleBookmark: () => void
  onBack: () => void
}) {
  const dday = calcDDay(ann.end_date)
  const statusLabel = getStatusLabel(ann.status, ann.end_date)
  const statusBadgeClass = getStatusBadgeClass(ann.status, ann.end_date)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Mobile back button */}
      <div className="md:hidden px-4 py-3 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
      </div>

      <div className="p-6 md:p-8">
        {/* Status & Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-semibold border ${statusBadgeClass}`}>{statusLabel}</Badge>
            <DayBadge dday={dday} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBookmark}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isBookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted'
              }`}
              title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
            >
              {isBookmarked ? <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> : <Star className="w-5 h-5" />}
            </button>
            {ann.source_url && (
              <a
                href={ann.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                title="원문 보기"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4 leading-tight">
          {ann.title}
        </h2>

        {/* Organization & Source */}
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-border/50">
          {ann.organization && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">{ann.organization}</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">{ann.source}</Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <InfoItem label="접수기간" icon={<Calendar className="w-4 h-4 text-primary" />}>
            {formatPeriod(ann.start_date, ann.end_date)}
          </InfoItem>
          {ann.application_method && (
            <InfoItem label="접수방법">{ann.application_method}</InfoItem>
          )}
          {ann.target && (
            <InfoItem label="지원대상">{ann.target}</InfoItem>
          )}
          {ann.budget && (
            <InfoItem label="사업규모">{ann.budget}</InfoItem>
          )}
        </div>

        {/* Support Areas */}
        {ann.support_areas && ann.support_areas.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">지원 분야</p>
            <div className="flex flex-wrap gap-2">
              {ann.support_areas.map((area, idx) => (
                <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {ann.description && (
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">사업 설명</p>
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {ann.description}
            </div>
          </div>
        )}

        {/* Eligibility */}
        {ann.eligibility && (
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">지원 자격</p>
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {ann.eligibility}
            </div>
          </div>
        )}

        {/* Contact */}
        {(ann.department || ann.contact) && (
          <div className="bg-muted/30 rounded-xl p-5 mb-8 border border-border/50">
            <p className="text-sm font-semibold text-foreground mb-3">문의</p>
            {ann.department && <p className="text-sm text-muted-foreground mb-1">담당: {ann.department}</p>}
            {ann.contact && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{ann.contact}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA: Source URL */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href={`/announcements/${ann.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-all cursor-pointer"
          >
            상세 페이지
          </Link>
          {ann.source_url && (
            <a
              href={ann.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer"
            >
              원문 보기
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
      <div className="flex items-center gap-1.5 text-sm text-foreground">
        {icon}
        <span>{children}</span>
      </div>
    </div>
  )
}
