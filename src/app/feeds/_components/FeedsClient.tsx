'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Search, ExternalLink, Loader2, Rss, Clock, Newspaper, ArrowLeft,
  Star, Share2, ChevronDown, SlidersHorizontal, X,
} from 'lucide-react'
import { getSourceBadgeStyle, getSourceName, getCategoryLabel, getCategoryColor, FEED_CATEGORIES, FEED_SOURCES } from '@/lib/feed-sources'
import { FEED_PERIOD_OPTIONS, FEED_TOPIC_OPTIONS, type FeedPeriodKey, type FeedTopicKey } from '@/lib/feed-filters'
import { useToastStore } from '@/stores/toast-store'
import DOMPurify from 'dompurify'

interface FeedItem {
  id: string
  title: string
  content: string
  source: string
  source_name: string
  category: string
  views: number
  created_at: string
  external_url: string | null
  is_published: boolean
  status: string
}

type ReadTab = 'unread' | 'read' | 'bookmarks'

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000

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

export default function FeedsClient() {
  const { addToast } = useToastStore()
  const supabase = useMemo(() => createClient(), [])

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<FeedTopicKey>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<FeedPeriodKey>('all')
  const [detailFiltersOpen, setDetailFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false) // mobile
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const PAGE_SIZE = 200

  // Auth & bookmark/read
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [readMap, setReadMap] = useState<Map<string, string>>(new Map()) // 실시간 (회색 스타일용)
  const [initialReadSet, setInitialReadSet] = useState<Set<string>>(new Set()) // 페이지 진입 시점 (탭 필터용)
  const [readTab, setReadTab] = useState<ReadTab>('unread')
  const [serverCounts, setServerCounts] = useState<{ unread: number; read: number; bookmarks: number }>({ unread: 0, read: 0, bookmarks: 0 })

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  // Fetch feeds (paginated via API)
  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      })
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (selectedTopic !== 'all') params.set('topic', selectedTopic)
      if (selectedSource !== 'all') params.set('source', selectedSource)
      if (selectedPeriod !== 'all') params.set('period', selectedPeriod)
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (userId && readTab !== 'unread') params.set('tab', readTab)
      else if (userId) params.set('tab', 'unread')

      const res = await fetch(`/api/feeds?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || '데이터를 불러오지 못했습니다')
      }
      const body = (await res.json()) as { posts: FeedItem[]; total: number; counts?: { unread: number; read: number; bookmarks: number } }
      setFeeds(prev => append ? [...prev, ...body.posts] : body.posts)
      setTotal(body.total)
      if (body.counts) setServerCounts(body.counts)
      setPage(pageNum)
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, selectedTopic, selectedSource, selectedPeriod, debouncedSearch, userId, readTab])

  // Reload when filter/search changes
  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  // Infinite scroll: observe sentinel
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (!entry.isIntersecting) return
      if (loading || loadingMore) return
      if (feeds.length >= total) return
      fetchPage(page + 1, true)
    }, { rootMargin: '200px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [feeds.length, total, page, loading, loadingMore, fetchPage])

  // Load bookmarks & reads
  useEffect(() => {
    if (!userId) return
    Promise.all([
      fetch('/api/bookmarks/feeds').then(r => r.json()),
      supabase
        .from('feed_reads')
        .select('post_id, read_at')
        .eq('user_id', userId),
    ]).then(([bmRes, readsRes]) => {
      if (bmRes.bookmarks) {
        setBookmarkedIds(new Set(bmRes.bookmarks.map((b: { post_id: string }) => b.post_id)))
      }
      if (readsRes.data) {
        const map = new Map<string, string>()
        const initSet = new Set<string>()
        readsRes.data.forEach((r: { post_id: string; read_at: string }) => {
          map.set(r.post_id, r.read_at)
          if (Date.now() - new Date(r.read_at).getTime() < TWO_WEEKS) {
            initSet.add(r.post_id)
          }
        })
        setReadMap(map)
        setInitialReadSet(initSet)
      }
    })
  }, [userId, supabase])

  // 서버에서 이미 tab 필터링 + 총계 계산됨 (허수 방지)
  const filteredFeeds = feeds

  const selectedFeed = useMemo(
    () => feeds.find(f => f.id === selectedId) || null,
    [feeds, selectedId]
  )

  // Auto-select first
  useEffect(() => {
    if (filteredFeeds.length === 0) {
      if (selectedId) setSelectedId(null)
      return
    }
    if (!selectedId || !filteredFeeds.some(feed => feed.id === selectedId)) {
      setSelectedId(filteredFeeds[0].id)
    }
  }, [filteredFeeds, selectedId])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setShowDetail(true)

    if (userId) {
      setReadMap(prev => {
        const next = new Map(prev)
        next.set(id, new Date().toISOString())
        return next
      })
      fetch('/api/reads/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: id }),
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

    const res = await fetch('/api/bookmarks/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: id }),
    })

    if (res.ok) {
      addToast(wasBookmarked ? '즐겨찾기에서 제거했습니다' : '즐겨찾기에 추가했습니다', 'success')
    }
  }, [userId, bookmarkedIds, addToast])

  const handleShare = useCallback((feed: FeedItem) => {
    const url = feed.external_url || window.location.href
    navigator.clipboard.writeText(url).then(() => {
      addToast('링크가 복사되었습니다', 'success')
    })
  }, [addToast])

  // 서버에서 받은 정확한 카운트 사용 (허수 방지)
  const tabCounts = serverCounts
  const secondaryFilterCount = [
    selectedSource !== 'all',
    selectedPeriod !== 'all',
    Boolean(userId && readTab !== 'unread'),
  ].filter(Boolean).length
  const hasAnyFilter =
    debouncedSearch.trim() ||
    selectedCategory !== 'all' ||
    selectedTopic !== 'all' ||
    secondaryFilterCount > 0

  const resetFilters = useCallback(() => {
    setSelectedCategory('all')
    setSelectedTopic('all')
    setSelectedSource('all')
    setSelectedPeriod('all')
    setReadTab('unread')
    setSearch('')
    setDebouncedSearch('')
    setSelectedId(null)
  }, [])

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <Rss className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">IT피드</h1>
        </div>
        <p className="text-muted-foreground">스타트업, IT, 정책 뉴스를 매일 업데이트합니다</p>
      </div>

      {/* Search + Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-6 py-3 border border-border/50 rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
          <FilterGroup label="분류">
            <FilterPill active={selectedCategory === 'all'} onClick={() => { setSelectedCategory('all'); setSelectedId(null) }}>
              전체 분류
            </FilterPill>
            {FEED_CATEGORIES.map((cat) => (
              <FilterPill key={cat.id} active={selectedCategory === cat.id} onClick={() => { setSelectedCategory(cat.id); setSelectedId(null) }}>
                {cat.label}
              </FilterPill>
            ))}
          </FilterGroup>

          <FilterGroup label="주제">
            {FEED_TOPIC_OPTIONS.map(option => (
              <FilterPill key={option.key} active={selectedTopic === option.key} onClick={() => { setSelectedTopic(option.key); setSelectedId(null) }}>
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
              <FilterGroup label="출처">
                <FilterPill active={selectedSource === 'all'} onClick={() => { setSelectedSource('all'); setSelectedId(null) }}>
                  전체 출처
                </FilterPill>
                {FEED_SOURCES.map(source => (
                  <FilterPill key={source.id} active={selectedSource === source.id} onClick={() => { setSelectedSource(source.id); setSelectedId(null) }}>
                    {source.name}
                  </FilterPill>
                ))}
              </FilterGroup>

              <FilterGroup label="기간">
                {FEED_PERIOD_OPTIONS.map(option => (
                  <FilterPill key={option.key} active={selectedPeriod === option.key} onClick={() => { setSelectedPeriod(option.key); setSelectedId(null) }}>
                    {option.label}
                  </FilterPill>
                ))}
              </FilterGroup>

              {userId && (
                <FilterGroup label="내 피드">
                  {([
                    { key: 'unread' as ReadTab, label: '읽지않음', count: tabCounts.unread },
                    { key: 'read' as ReadTab, label: '읽음', count: tabCounts.read },
                    { key: 'bookmarks' as ReadTab, label: '즐겨찾기', count: tabCounts.bookmarks },
                  ]).map(t => (
                    <FilterPill key={t.key} active={readTab === t.key} onClick={() => { setReadTab(t.key); setSelectedId(null) }}>
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

      {/* Content */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <button onClick={() => fetchPage(1, false)} className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
            다시 시도
          </button>
        </div>
      ) : filteredFeeds.length === 0 ? (
        <div className="text-center py-24">
          <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{search ? '검색 결과가 없습니다' : '등록된 피드가 없습니다'}</p>
        </div>
      ) : (
        <div className="flex gap-4 mb-12 items-start">
          {/* LEFT: List (자연 높이, 페이지 스크롤) */}
          <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[38%] border border-border/50 rounded-2xl overflow-hidden bg-card`}>
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">
                {userId ? `${filteredFeeds.length}개 표시 / 전체 ${total.toLocaleString()}개` : `전체 ${total.toLocaleString()}개 피드`}
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {filteredFeeds.map((feed) => {
                const isActive = feed.id === selectedId
                const isRead = readMap.has(feed.id)
                const isBookmarked = bookmarkedIds.has(feed.id)
                return (
                  <button
                    key={feed.id}
                    onClick={() => handleSelect(feed.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                      isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                    } ${!isRead && userId ? 'font-semibold' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getCategoryColor(feed.category)}`}>
                        {getCategoryLabel(feed.category)}
                      </span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSourceBadgeStyle(feed.source)}`}>
                        {getSourceName(feed.source)}
                      </span>
                      {isBookmarked && <Star className="w-3 h-3 text-amber-500 fill-amber-500 ml-auto shrink-0" />}
                    </div>
                    <p className={`text-sm leading-snug line-clamp-2 mb-1 ${isActive ? 'text-foreground' : isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {feed.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(feed.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                      <span>{feed.views.toLocaleString()} 조회</span>
                    </div>
                  </button>
                )
              })}
            </div>
            {feeds.length < total && (
              <div ref={sentinelRef} className="py-4 flex items-center justify-center border-t border-border/50">
                {loadingMore ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={() => fetchPage(page + 1, true)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    더 보기 ({(total - feeds.length).toLocaleString()}개 남음)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Detail (sticky, 뷰포트 높이) */}
          <div
            className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-col flex-1 border border-border/50 rounded-2xl overflow-hidden bg-card sticky self-start`}
            style={{ top: '80px', height: 'calc(100vh - 100px)' }}
          >
            {selectedFeed ? (
              <FeedDetail
                feed={selectedFeed}
                isBookmarked={bookmarkedIds.has(selectedFeed.id)}
                onToggleBookmark={() => handleToggleBookmark(selectedFeed.id)}
                onShare={() => handleShare(selectedFeed)}
                onBack={() => setShowDetail(false)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Rss className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">좌측에서 피드를 선택하세요</p>
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
// Feed Detail Component
// ============================

function FeedDetail({
  feed,
  isBookmarked,
  onToggleBookmark,
  onShare,
  onBack,
}: {
  feed: FeedItem
  isBookmarked: boolean
  onToggleBookmark: () => void
  onShare: () => void
  onBack: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Mobile back */}
      <div className="md:hidden px-4 py-3 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>
      </div>

      <div className="p-6 md:p-8">
        {/* Badges + Actions */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(feed.category)}`}>
              {getCategoryLabel(feed.category)}
            </span>
            <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${getSourceBadgeStyle(feed.source)}`}>
              {getSourceName(feed.source)}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleBookmark}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isBookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted'
              }`}
              title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
            >
              {isBookmarked ? <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> : <Star className="w-5 h-5" />}
            </button>
            <button
              onClick={onShare}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
              title="링크 복사"
            >
              <Share2 className="w-5 h-5" />
            </button>
            {feed.external_url && (
              <a
                href={feed.external_url}
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
          {feed.title}
        </h2>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border/50">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date(feed.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
          <span>{feed.views.toLocaleString()} 조회</span>
        </div>

        {/* Content */}
        {feed.content && (
          <div
            className="prose prose-sm max-w-none text-foreground/90 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: typeof window !== 'undefined'
                ? DOMPurify.sanitize(feed.content)
                : feed.content.replace(/<[^>]*>/g, ''),
            }}
          />
        )}

        {/* Source Link CTA */}
        {feed.external_url && (
          <div className="mt-8 pt-6 border-t border-border/50">
            <a
              href={feed.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer"
            >
              원문 보기
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
