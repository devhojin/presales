'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  RefreshCw, Search, Eye, EyeOff, ExternalLink, Trash2, Loader2, X,
  AlertCircle, Rss, ArrowLeft, Clock,
} from 'lucide-react'
import { getSourceBadgeStyle, getSourceName, getCategoryLabel, getCategoryColor, FEED_CATEGORIES } from '@/lib/feed-sources'
import DOMPurify from 'dompurify'

interface FeedItem {
  id: string
  title: string
  content: string
  source: string
  source_name: string
  category: string
  views: number
  is_published: boolean
  external_url: string | null
  created_at: string
}

type PublishTab = 'all' | 'published' | 'unpublished'
type ModalType = 'delete' | 'permanentDelete' | null

function ConfirmModal({ type, count, onConfirm, onCancel }: {
  type: ModalType; count: number; onConfirm: () => void; onCancel: () => void
}) {
  useEffect(() => {
    if (!type) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [type, onCancel])
  if (!type) return null
  const isPerma = type === 'permanentDelete'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">{isPerma ? '완전삭제 확인' : '삭제 확인'}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          선택한 <strong>{count}건</strong>을 {isPerma ? '완전삭제' : '삭제'}하시겠습니까?
          {isPerma && <span className="block text-red-600 mt-1">완전삭제된 피드는 다시 수집되지 않습니다.</span>}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-muted rounded-xl cursor-pointer">취소</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-600 rounded-xl cursor-pointer">{isPerma ? '완전삭제' : '삭제'}</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminFeedsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<PublishTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [fetchingNow, setFetchingNow] = useState(false)
  const [fetchModal, setFetchModal] = useState(false)
  const [fetchLogs, setFetchLogs] = useState<Array<{ source: string; status: string; fetched: number; inserted: number; skipped: number }>>([])
  const [fetchDone, setFetchDone] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [tabCounts, setTabCounts] = useState({ all: 0, published: 0, unpublished: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const showToast = useCallback((msg: string) => setToastMsg(msg), [])

  const fetchFeeds = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let query = supabase.from('community_posts').select('*').order('created_at', { ascending: false })
      if (tab !== 'all') query = query.eq('is_published', tab === 'published')
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter)
      if (search.trim()) query = query.ilike('title', `%${search.trim()}%`)
      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      const items = (data || []) as FeedItem[]
      setFeeds(items)
      setTabCounts({
        all: items.length,
        published: items.filter(f => f.is_published).length,
        unpublished: items.filter(f => !f.is_published).length,
      })
    } catch (e) { setError(e instanceof Error ? e.message : '오류 발생') }
    finally { setLoading(false) }
  }, [supabase, tab, categoryFilter, search])

  useEffect(() => { fetchFeeds() }, [fetchFeeds])

  const totalItems = feeds.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const safePage = Math.min(currentPage, totalPages)
  const pagedFeeds = feeds.slice((safePage - 1) * pageSize, safePage * pageSize)

  const selectedFeed = useMemo(() => feeds.find(f => f.id === selectedId), [feeds, selectedId])

  const FEED_SOURCE_NAMES = ['스마트시티', '전자신문', '아웃스탠딩', 'AI타임스', '테크엠', '한경IT', '매경이코노미', '서울경제', '동아경제']

  const handleFetchNow = () => {
    setFetchingNow(true)
    setFetchModal(true)
    setFetchLogs(FEED_SOURCE_NAMES.map(s => ({ source: s, status: '대기', fetched: 0, inserted: 0, skipped: 0 })))
    setFetchDone(false)

    const evtSource = new EventSource('/api/admin/feeds/trigger-fetch-stream')
    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'progress') {
          setFetchLogs(prev => {
            const idx = prev.findIndex(l => l.source === data.source)
            const item = { source: data.source, status: data.status, fetched: data.fetched, inserted: data.inserted, skipped: data.skipped }
            if (idx >= 0) { const next = [...prev]; next[idx] = item; return next }
            return [...prev, item]
          })
        } else if (data.type === 'done') {
          setFetchDone(true)
          setFetchingNow(false)
          evtSource.close()
          setTimeout(() => fetchFeeds(), 500)
        } else if (data.type === 'error') {
          setFetchLogs(prev => [...prev, { source: '오류', status: data.message, fetched: 0, inserted: 0, skipped: 0 }])
          setFetchDone(true)
          setFetchingNow(false)
          evtSource.close()
        }
      } catch {}
    }
    evtSource.onerror = () => { setFetchDone(true); setFetchingNow(false); evtSource.close() }
  }

  const handleTogglePublish = async (id: string, publish: boolean) => {
    const { error } = await supabase.from('community_posts').update({ is_published: publish }).eq('id', id)
    if (!error) {
      setFeeds(prev => prev.map(f => f.id === id ? { ...f, is_published: publish } : f))
      showToast(publish ? '공개 전환' : '비공개 전환')
    }
  }

  const handleBulkPublish = async () => {
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('community_posts').update({ is_published: true }).in('id', ids)
    if (!error) { showToast(`${ids.length}건 공개`); setSelectedIds(new Set()); fetchFeeds() }
  }

  const handlePublishAll = async () => {
    const { error } = await supabase.from('community_posts').update({ is_published: true }).eq('is_published', false)
    if (!error) { showToast('전체 공개 완료'); setSelectedIds(new Set()); fetchFeeds() }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase.from('community_posts').delete().in('id', ids)
      if (error) throw error
      showToast(`${ids.length}건 삭제`); setSelectedIds(new Set()); await fetchFeeds()
    } catch { showToast('삭제 실패') }
    finally { setDeleting(false); setModalType(null) }
  }

  const handlePermanentDelete = async () => {
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const selected = feeds.filter(f => ids.includes(f.id))
      const toBlock = selected.filter(f => f.source !== 'manual').map(f => ({ source: f.source, external_id: f.id, title: f.title, reason: '관리자 완전삭제' }))
      if (toBlock.length > 0) await supabase.from('blocked_community_posts').upsert(toBlock, { onConflict: 'source,external_id' })
      await supabase.from('community_posts').delete().in('id', ids)
      showToast(`${ids.length}건 완전삭제`); setSelectedIds(new Set()); await fetchFeeds()
    } catch { showToast('완전삭제 실패') }
    finally { setDeleting(false); setModalType(null) }
  }

  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n)
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === pagedFeeds.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(pagedFeeds.map(f => f.id)))
  }

  const TABS: { key: PublishTab; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'published', label: '공개' }, { key: 'unpublished', label: '비공개' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Rss className="w-5 h-5 text-primary" />IT피드 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">스타트업 뉴스, 정책소식 등을 관리합니다</p>
        </div>
        <button onClick={handleFetchNow} disabled={fetchingNow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${fetchingNow ? 'animate-spin' : ''}`} />
          {fetchingNow ? '수집 중...' : '지금 불러오기'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setCurrentPage(1); setSelectedIds(new Set()) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
            {t.label} <span className="ml-1 text-xs opacity-75">{tabCounts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Category + Search */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setCategoryFilter('all'); setCurrentPage(1) }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${categoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>전체</button>
        {FEED_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => { setCategoryFilter(cat.id); setCurrentPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${categoryFilter === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>{cat.label}</button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="제목 검색..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {([20, 50, 100] as const).map(s => (
            <button key={s} onClick={() => { setPageSize(s); setCurrentPage(1) }}
              className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer ${pageSize === s ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-secondary p-3 rounded-xl">
          <span className="text-xs font-medium">{selectedIds.size}건 선택</span>
          <button onClick={handleBulkPublish} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground flex items-center gap-1 cursor-pointer"><Eye className="w-3.5 h-3.5" />선택 공개</button>
          <button onClick={handlePublishAll} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary text-primary cursor-pointer">전체 공개</button>
          <button onClick={() => setModalType('delete')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-primary-foreground flex items-center gap-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />삭제</button>
          <button onClick={() => setModalType('permanentDelete')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/80 text-primary-foreground flex items-center gap-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />완전삭제</button>
        </div>
      )}

      {/* Content: Split-View */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : error ? (
        <div className="text-center py-12"><AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" /><p className="text-sm text-destructive">{error}</p></div>
      ) : (
        <div className="flex gap-0 border border-border/50 rounded-2xl overflow-hidden bg-card" style={{ minHeight: '60vh' }}>
          {/* LEFT */}
          <div className={`${showDetail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[38%] border-r border-border/50 overflow-hidden`}>
            <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-3">
              <input type="checkbox" checked={pagedFeeds.length > 0 && pagedFeeds.every(f => selectedIds.has(f.id))}
                onChange={toggleSelectAll} className="w-4 h-4 rounded cursor-pointer" />
              <span className="text-xs text-muted-foreground">{totalItems}건</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {pagedFeeds.map(feed => {
                const isActive = feed.id === selectedId
                return (
                  <div key={feed.id} className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50 border-l-2 border-l-transparent'}`}>
                    <input type="checkbox" checked={selectedIds.has(feed.id)} onChange={() => toggleSelect(feed.id)}
                      className="w-4 h-4 rounded mt-0.5 shrink-0 cursor-pointer" onClick={e => e.stopPropagation()} />
                    <div className="flex-1 min-w-0" onClick={() => { setSelectedId(feed.id); setShowDetail(true) }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getCategoryColor(feed.category)}`}>{getCategoryLabel(feed.category)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSourceBadgeStyle(feed.source)}`}>{getSourceName(feed.source)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleTogglePublish(feed.id, !feed.is_published) }}
                          className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold cursor-pointer ${feed.is_published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {feed.is_published ? '공개' : '비공개'}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{feed.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feed.views} 조회</p>
                    </div>
                  </div>
                )
              })}
              {pagedFeeds.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">피드가 없습니다</div>}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20">
                <span className="text-xs text-muted-foreground">{safePage}/{totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 text-xs rounded bg-muted disabled:opacity-40 cursor-pointer">이전</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-2 py-1 text-xs rounded bg-muted disabled:opacity-40 cursor-pointer">다음</button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className={`${showDetail ? 'flex' : 'hidden lg:flex'} flex-col flex-1 overflow-hidden`}>
            {selectedFeed ? (
              <AdminFeedDetail feed={selectedFeed}
                onTogglePublish={() => handleTogglePublish(selectedFeed.id, !selectedFeed.is_published)}
                onBack={() => setShowDetail(false)} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center"><Rss className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">좌측에서 피드를 선택하세요</p></div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal type={modalType} count={selectedIds.size}
        onConfirm={modalType === 'permanentDelete' ? handlePermanentDelete : handleDelete}
        onCancel={() => setModalType(null)} />

      {/* Fetch Progress Modal */}
      {fetchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (fetchDone) setFetchModal(false) }}>
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {fetchDone ? <Rss className="w-5 h-5 text-primary" /> : <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                IT피드 수집 {fetchDone ? '완료' : '진행 중'}
              </h3>
              {fetchDone && <button onClick={() => setFetchModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>}
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {fetchLogs.map((log, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">{log.source}</span>
                    <span className={`text-xs font-medium ${log.status === '완료' ? 'text-primary' : log.status === '대기' ? 'text-zinc-400' : 'text-amber-600'}`}>{log.status}</span>
                  </div>
                  {log.status !== '대기' && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>수집 <strong className="text-foreground">{log.fetched}</strong></span>
                      <span>신규 <strong className="text-emerald-600">{log.inserted}</strong></span>
                      <span>중복 <strong>{log.skipped}</strong></span>
                    </div>
                  )}
                  <div className="mt-1.5 h-1 bg-border/50 rounded-full overflow-hidden">
                    {log.status === '대기' ? <div className="h-full bg-zinc-200 rounded-full" style={{ width: '0%' }} />
                    : log.status === '완료' ? <div className="h-full bg-primary rounded-full transition-all" style={{ width: '100%' }} />
                    : <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />}
                  </div>
                </div>
              ))}
            </div>
            {fetchDone && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">총 신규</span>
                  <span className="font-bold text-primary">{fetchLogs.reduce((s, l) => s + l.inserted, 0)}건</span>
                </div>
                <button onClick={() => setFetchModal(false)} className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 cursor-pointer">확인</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
          <div className="bg-foreground text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer" onClick={() => setToastMsg(null)}>{toastMsg}</div>
        </div>
      )}
    </div>
  )
}

function AdminFeedDetail({ feed, onTogglePublish, onBack }: {
  feed: FeedItem; onTogglePublish: () => void; onBack: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="lg:hidden px-4 py-3 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(feed.category)}`}>{getCategoryLabel(feed.category)}</span>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${getSourceBadgeStyle(feed.source)}`}>{getSourceName(feed.source)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onTogglePublish}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 ${feed.is_published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {feed.is_published ? <><Eye className="w-3.5 h-3.5" />공개</> : <><EyeOff className="w-3.5 h-3.5" />비공개</>}
            </button>
            {feed.external_url && (
              <a href={feed.external_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold mb-3">{feed.title}</h2>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-4 border-b border-border/50">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(feed.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>{feed.views.toLocaleString()} 조회</span>
        </div>

        {feed.content && (
          <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: typeof window !== 'undefined' ? DOMPurify.sanitize(feed.content) : feed.content.replace(/<[^>]*>/g, ''),
            }} />
        )}

        {feed.external_url && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <a href={feed.external_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 cursor-pointer">
              원문 보기 <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
