'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, ExternalLink, Loader2, AlertCircle, Rss, Clock, Newspaper } from 'lucide-react'
import { getSourceBadgeStyle, getSourceName, getCategoryLabel, getCategoryColor, FEED_CATEGORIES } from '@/lib/feed-sources'

// ===========================
// Types
// ===========================

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

// ===========================
// Loading Skeleton
// ===========================

function FeedSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-3 animate-pulse">
      <div className="h-3 bg-muted rounded-full w-1/4" />
      <div className="h-5 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-3 bg-muted rounded w-1/3 mt-4" />
    </div>
  )
}

// ===========================
// Page Component
// ===========================

export default function FeedsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch published feeds
  const fetchFeeds = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('feeds')
        .select('*')
        .eq('is_published', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      // Apply search
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setFeeds((data || []) as FeedItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedCategory, search])

  useEffect(() => {
    fetchFeeds()
  }, [fetchFeeds])

  // Filter counts
  const feedsByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: feeds.length }
    FEED_CATEGORIES.forEach((cat) => {
      counts[cat.id] = feeds.filter((f) => f.category === cat.id).length
    })
    return counts
  }, [feeds])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Rss className="w-6 h-6 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">IT피드</h1>
        </div>
        <p className="text-lg text-muted-foreground">스타트업, IT, 정책 뉴스를 매일 업데이트합니다</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xl mx-auto w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 text-base rounded-xl border border-border/50 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/50'
          }`}
        >
          전체 ({feedsByCategory.all})
        </button>
        {FEED_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/50'
            }`}
          >
            {cat.label} ({feedsByCategory[cat.id] || 0})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <FeedSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 bg-card rounded-2xl border border-border/50">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-destructive font-medium">{error}</p>
            <button
              onClick={fetchFeeds}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : feeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Newspaper className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{search ? '검색 결과가 없습니다' : '등록된 피드가 없습니다'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="group bg-card rounded-2xl border border-border/50 p-6 hover:border-primary/30 hover:shadow-md transition-all"
              >
                {/* Header with badges */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(feed.category)}`}>
                      {getCategoryLabel(feed.category)}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${getSourceBadgeStyle(feed.source)}`}>
                      {getSourceName(feed.source)}
                    </span>
                  </div>
                  {feed.external_url && (
                    <a
                      href={feed.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-all shrink-0"
                      title="원문 보기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Title */}
                {feed.external_url ? (
                  <a
                    href={feed.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group/title hover:text-primary transition-colors mb-2"
                  >
                    <h3 className="text-lg font-bold text-foreground leading-snug group-hover/title:text-primary transition-colors">
                      {feed.title}
                    </h3>
                  </a>
                ) : (
                  <h3 className="text-lg font-bold text-foreground leading-snug mb-2">{feed.title}</h3>
                )}

                {/* Content excerpt */}
                {feed.content && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                    {feed.content.replace(/<[^>]*>/g, '').substring(0, 200).trim()}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(feed.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>{feed.views.toLocaleString()} 조회</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
