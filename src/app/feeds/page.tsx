'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Search, ExternalLink, Loader2, Rss, Clock, Newspaper, ArrowLeft,
  Star, Share2,
} from 'lucide-react'
import { getSourceBadgeStyle, getSourceName, getCategoryLabel, getCategoryColor, FEED_CATEGORIES } from '@/lib/feed-sources'
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

export default function FeedsPage() {
  const { addToast } = useToastStore()
  const supabase = useMemo(() => createClient(), [])

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false) // mobile

  // Auth & bookmark/read
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [readMap, setReadMap] = useState<Map<string, string>>(new Map()) // 실시간 (회색 스타일용)
  const [initialReadSet, setInitialReadSet] = useState<Set<string>>(new Set()) // 페이지 진입 시점 (탭 필터용)
  const [readTab, setReadTab] = useState<ReadTab>('unread')

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  // Fetch feeds
  const fetchFeeds = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('community_posts')
        .select('*')
        .eq('is_published', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`)
      }

      const { data, error: fetchError } = await query.limit(1000)
      if (fetchError) throw fetchError
      setFeeds((data || []) as FeedItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedCategory, search])

  useEffect(() => { fetchFeeds() }, [fetchFeeds])

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

  // Filter by read tab — uses initialReadSet (page-load snapshot) for tab filtering
  const filteredFeeds = useMemo(() => {
    if (!userId) return feeds
    return feeds.filter(feed => {
      const wasReadOnLoad = initialReadSet.has(feed.id)
      const isBookmarked = bookmarkedIds.has(feed.id)

      if (readTab === 'unread' && wasReadOnLoad) return false
      if (readTab === 'read' && !wasReadOnLoad) return false
      if (readTab === 'bookmarks' && !isBookmarked) return false
      return true
    })
  }, [feeds, userId, initialReadSet, bookmarkedIds, readTab])

  const selectedFeed = useMemo(
    () => feeds.find(f => f.id === selectedId) || null,
    [feeds, selectedId]
  )

  // Auto-select first
  useEffect(() => {
    if (!selectedId && filteredFeeds.length > 0) {
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

  // Tab counts
  const tabCounts = useMemo(() => {
    if (!userId) return { unread: 0, read: 0, bookmarks: 0 }
    let unread = 0, read = 0, bookmarks = 0
    feeds.forEach(feed => {
      const wasReadOnLoad = initialReadSet.has(feed.id)
      if (wasReadOnLoad) read++
      else unread++
      if (bookmarkedIds.has(feed.id)) bookmarks++
    })
    return { unread, read, bookmarks }
  }, [userId, feeds, initialReadSet, bookmarkedIds])

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

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedId(null) }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/50'
            }`}
          >
            전체
          </button>
          {FEED_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSelectedId(null) }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Read tabs (logged-in) */}
        {userId && (
          <div className="flex gap-1 border-b border-border/50">
            {([
              { key: 'unread' as ReadTab, label: '읽지않음', count: tabCounts.unread },
              { key: 'read' as ReadTab, label: '읽음', count: tabCounts.read },
              { key: 'bookmarks' as ReadTab, label: '즐겨찾기', count: tabCounts.bookmarks },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => { setReadTab(t.key); setSelectedId(null) }}
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

      {/* Content */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <button onClick={fetchFeeds} className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
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
              <p className="text-xs text-muted-foreground font-medium">{filteredFeeds.length}개 피드</p>
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
