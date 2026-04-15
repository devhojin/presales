'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import {
  Search, Megaphone, Calendar, ArrowLeft, ExternalLink,
  Clock, Loader2, Star, Building2, Phone,
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

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000

function DayBadge({ dday }: { dday: number | null }) {
  if (dday === null) return null
  const isUrgent = dday <= 3 && dday >= 0
  return (
    <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
      {dday < 0 ? '마감' : `D-${dday}`}
    </span>
  )
}

export default function AnnouncementsPage() {
  const { addToast } = useToastStore()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false) // mobile toggle
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const PAGE_SIZE = 50

  // Auth & bookmark/read state
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [readMap, setReadMap] = useState<Map<string, string>>(new Map()) // id → read_at (실시간, 회색 스타일용)
  const [initialReadSet, setInitialReadSet] = useState<Set<string>>(new Set()) // 페이지 진입 시점 읽음 (탭 필터용)
  const [readTab, setReadTab] = useState<ReadTab>('unread')

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
      if (userId) params.set('tab', readTab)

      const res = await fetch(`/api/announcements?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { announcements: Announcement[]; total: number }
      setAnnouncements(prev => append ? [...prev, ...body.announcements] : body.announcements)
      setTotal(body.total)
      setPage(pageNum)
    } catch {
      // keep prior data on failure
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [debouncedSearch, filterStatus, userId, readTab])

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
    if (!selectedId && filteredAnnouncements.length > 0) {
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

  // Count for read tabs (server already applied search/status filter)
  const tabCounts = useMemo(() => {
    if (!userId) return { unread: 0, read: 0, bookmarks: 0 }
    let unread = 0, read = 0, bookmarks = 0
    sortedAnnouncements.forEach(ann => {
      const wasReadOnLoad = initialReadSet.has(ann.id)
      if (wasReadOnLoad) read++
      else unread++
      if (bookmarkedIds.has(ann.id)) bookmarks++
    })
    return { unread, read, bookmarks }
  }, [userId, sortedAnnouncements, initialReadSet, bookmarkedIds])

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

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          {(['all', 'active', 'closed'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 cursor-pointer ${
                filterStatus === f
                  ? f === 'active' ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : f === 'closed' ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    : 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/50 hover:border-border hover:bg-muted'
              }`}
            >
              {f === 'all' ? '전체' : f === 'active' ? '모집중' : '마감'}
            </button>
          ))}
        </div>

        {/* Read status tabs (logged-in only) */}
        {userId && (
          <div className="flex gap-1 border-b border-border/50">
            {([
              { key: 'unread' as ReadTab, label: '읽지않음', count: tabCounts.unread },
              { key: 'read' as ReadTab, label: '읽음', count: tabCounts.read },
              { key: 'bookmarks' as ReadTab, label: '즐겨찾기', count: tabCounts.bookmarks },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setReadTab(t.key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${
                  readTab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  readTab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        )}
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
          <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[38%] border border-border/50 rounded-2xl overflow-hidden bg-card`}>
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
                  <button
                    key={ann.id}
                    onClick={() => handleSelect(ann.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                      isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                    } ${!isRead && userId ? 'font-semibold' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
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
                  </button>
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

        {/* CTA: Source URL + Store */}
        <div className="flex flex-wrap gap-3 mb-8">
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
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            관련 제안서 찾기
          </Link>
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
