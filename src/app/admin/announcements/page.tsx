'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Megaphone, Calendar, Building2, ExternalLink, Eye, EyeOff,
  Trash2, X, Loader2, RefreshCw, Clock, AlertCircle, ArrowLeft,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  type Announcement,
  calcDDay,
  isExpired as isAnnExpired,
  formatPeriod,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/lib/announcements'

type Tab = 'all' | 'published' | 'unpublished' | 'closed'

const TYPE_LABELS: Record<string, string> = { government: '정부지원', private: '민간', poc: 'PoC' }
const TYPE_COLORS: Record<string, string> = { government: 'bg-primary/10 text-primary', private: 'bg-blue-100 text-blue-700', poc: 'bg-purple-100 text-purple-700' }

function ConfirmModal({ type, count, onConfirm, onCancel }: {
  type: 'delete' | 'permanent-delete' | 'publish' | 'unpublish' | null; count: number; onConfirm: () => void; onCancel: () => void
}) {
  useEffect(() => {
    if (!type) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [type, onCancel])
  if (!type) return null
  const isPermanent = type === 'permanent-delete'
  const isPublish = type === 'publish'
  const isUnpublish = type === 'unpublish'
  const label = isPermanent ? '완전삭제' : isPublish ? '공개' : isUnpublish ? '비공개' : '삭제'
  const btnColor = isPermanent ? 'bg-red-600' : isPublish ? 'bg-primary' : isUnpublish ? 'bg-zinc-600' : 'bg-orange-500'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">{label} 확인</h3>
        <p className="text-sm text-muted-foreground mb-4">
          선택한 <strong>{count}건</strong>을 {label} 처리하시겠습니까?
          {isPermanent && <span className="block text-red-600 mt-1">완전삭제된 공고는 복구할 수 없습니다.</span>}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-muted rounded-xl cursor-pointer">취소</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm text-white rounded-xl cursor-pointer ${btnColor}`}>
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminAnnouncementsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalType, setModalType] = useState<'delete' | 'permanent-delete' | 'publish' | 'unpublish' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [tabCounts, setTabCounts] = useState<Record<Tab, number>>({ all: 0, published: 0, unpublished: 0, closed: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fetchingNow, setFetchingNow] = useState(false)
  const [fetchModal, setFetchModal] = useState(false)
  const [fetchLogs, setFetchLogs] = useState<Array<{ source: string; status: string; fetched: number; inserted: number; skipped: number }>>([])
  const [fetchDone, setFetchDone] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => setToastMsg(msg), [])

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      let query = supabase.from('announcements').select('*', { count: 'exact' })
      if (tab === 'published') query = query.eq('is_published', true)
      else if (tab === 'unpublished') query = query.eq('is_published', false)
      else if (tab === 'closed') query = query.eq('status', 'closed')
      if (debouncedSearch.trim()) query = query.or(`title.ilike.%${debouncedSearch}%,organization.ilike.%${debouncedSearch}%`)

      const offset = (currentPage - 1) * pageSize
      const { data, error: qErr, count } = await query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)
      if (qErr) throw new Error(qErr.message)
      setAnnouncements(data || []); setTotalCount(count || 0)

      const [allRes, pubRes, unpRes, clRes] = await Promise.all([
        supabase.from('announcements').select('id', { count: 'exact' }),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('is_published', true),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('is_published', false),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('status', 'closed'),
      ])
      setTabCounts({ all: allRes.count || 0, published: pubRes.count || 0, unpublished: unpRes.count || 0, closed: clRes.count || 0 })
    } catch (e) { setError(e instanceof Error ? e.message : '오류 발생') }
    finally { setLoading(false) }
  }, [currentPage, pageSize, tab, debouncedSearch])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const FETCH_SOURCES = ['K-Startup', '중소벤처24', 'NIPA 사업공고', 'NIPA 입찰공고', '과기부 사업공고', '씽굿 공모전', '위비티 공모전']

  const handleFetchNow = () => {
    setFetchingNow(true)
    setFetchModal(true)
    setFetchLogs(FETCH_SOURCES.map(s => ({ source: s, status: '대기', fetched: 0, inserted: 0, skipped: 0 })))
    setFetchDone(false)

    const evtSource = new EventSource('/api/admin/announcements/trigger-fetch-stream')
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
          setTimeout(() => fetchAnnouncements(), 500)
        } else if (data.type === 'error') {
          setFetchLogs(prev => [...prev, { source: '오류', status: data.message, fetched: 0, inserted: 0, skipped: 0 }])
          setFetchDone(true)
          setFetchingNow(false)
          evtSource.close()
        }
      } catch {}
    }
    evtSource.onerror = () => {
      setFetchDone(true)
      setFetchingNow(false)
      evtSource.close()
    }
  }

  const handleTogglePublish = async (id: string, publish: boolean) => {
    const res = await fetch('/api/admin/announcements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_published: publish }) })
    if (res.ok) { showToast(publish ? '공개 전환' : '비공개 전환'); await fetchAnnouncements() }
  }

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete' | 'permanent-delete') => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      if (action === 'publish' || action === 'unpublish') {
        await fetch('/api/admin/announcements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, is_published: action === 'publish' }) })
        showToast(`${ids.length}건 ${action === 'publish' ? '공개' : '비공개'}`)
      } else {
        await fetch('/api/admin/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, permanent: action === 'permanent-delete' }) })
        showToast(`${ids.length}건 ${action === 'permanent-delete' ? '완전삭제' : '삭제'}`)
      }
      setSelectedIds(new Set()); await fetchAnnouncements()
    } catch (e) { showToast('작업 실패') }
    finally { setDeleting(false); setModalType(null) }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const selectedAnn = useMemo(() => announcements.find(a => a.id === selectedId), [announcements, selectedId])

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }
  const togglePageSelectAll = () => {
    if (announcements.every(a => selectedIds.has(a.id))) setSelectedIds(new Set())
    else setSelectedIds(new Set(announcements.map(a => a.id)))
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'published', label: '공개' },
    { key: 'unpublished', label: '비공개' }, { key: 'closed', label: '마감' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">공고 관리</h1>
            <p className="text-sm text-muted-foreground">정부 공고를 관리합니다</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleFetchNow} disabled={fetchingNow}
            className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/15 disabled:opacity-50 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${fetchingNow ? 'animate-spin' : ''}`} />
            {fetchingNow ? '수집 중...' : '지금 불러오기'}
          </button>
          <Link href="/admin/announcements/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90">
            <Plus className="w-4 h-4" /> 공고 등록
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/50">
        <div className="flex gap-1 -mb-px">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setCurrentPage(1); setSelectedIds(new Set()) }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label} <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{tabCounts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="공고명 또는 기관명..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {([20, 50, 100] as const).map(s => (
            <button key={s} onClick={() => { setPageSize(s); setCurrentPage(1) }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer ${pageSize === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {s}개
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{selectedIds.size}건 선택</span>
          <button onClick={() => setModalType('publish')} className="px-3 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl cursor-pointer"><Eye className="w-4 h-4 inline mr-1" />선택 공개</button>
          <button onClick={() => setModalType('unpublish')} className="px-3 py-2 bg-zinc-500 text-white text-sm font-semibold rounded-xl cursor-pointer"><EyeOff className="w-4 h-4 inline mr-1" />선택 비공개</button>
          <button onClick={() => setModalType('delete')} className="px-3 py-2 bg-orange-500 text-white text-sm font-semibold rounded-xl cursor-pointer"><Trash2 className="w-4 h-4 inline mr-1" />선택 삭제</button>
          <button onClick={() => setModalType('permanent-delete')} className="px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl cursor-pointer"><Trash2 className="w-4 h-4 inline mr-1" />완전삭제</button>
        </div>
      )}

      {/* Content: Split-View */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="text-center py-16"><AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" /><p className="text-sm text-red-500">{error}</p></div>
      ) : (
        <div className="flex gap-0 border border-border/50 rounded-2xl bg-card overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
          {/* LEFT: List (내부 스크롤 — 휠 내릴 때 이쪽만 움직임) */}
          <div className={`${showDetail ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[38%] border-r border-border/50 overflow-hidden`}>
            {/* Select all header */}
            <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-3 shrink-0">
              <input type="checkbox" checked={announcements.length > 0 && announcements.every(a => selectedIds.has(a.id))}
                onChange={togglePageSelectAll} className="w-4 h-4 rounded cursor-pointer" />
              <span className="text-xs text-muted-foreground">{totalCount}건</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {announcements.map(item => {
                const expired = isAnnExpired(item)
                const isActive = item.id === selectedId
                return (
                  <div key={item.id} className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50 border-l-2 border-l-transparent'} ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded mt-0.5 shrink-0 cursor-pointer" onClick={e => e.stopPropagation()} />
                    <div className="flex-1 min-w-0" onClick={() => { setSelectedId(item.id); setShowDetail(true) }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={`text-[10px] font-semibold ${TYPE_COLORS[item.type] || ''}`}>
                          {TYPE_LABELS[item.type] || item.type}
                        </Badge>
                        {expired ? <Badge variant="secondary" className="text-[10px]">마감</Badge> : (
                          <button onClick={(e) => { e.stopPropagation(); handleTogglePublish(item.id, !item.is_published) }}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold cursor-pointer ${item.is_published ? 'bg-primary/10 text-primary' : 'bg-red-100/50 text-red-600'}`}>
                            {item.is_published ? '공개' : '비공개'}
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.organization}</p>
                    </div>
                  </div>
                )
              })}
              {announcements.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">공고가 없습니다</div>}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20 shrink-0">
                <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                    className="px-2 py-1 text-xs rounded bg-muted disabled:opacity-40 cursor-pointer">이전</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                    className="px-2 py-1 text-xs rounded bg-muted disabled:opacity-40 cursor-pointer">다음</button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Detail (고정 — 좌측 스크롤과 독립) */}
          <div
            className={`${showDetail ? 'flex' : 'hidden lg:flex'} flex-col flex-1 overflow-hidden`}
          >
            {selectedAnn ? (
              <AdminAnnouncementDetail
                announcement={selectedAnn}
                onTogglePublish={() => handleTogglePublish(selectedAnn.id, !selectedAnn.is_published)}
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

      <ConfirmModal type={modalType} count={selectedIds.size}
        onConfirm={() => handleBulkAction(modalType === 'publish' ? 'publish' : modalType === 'unpublish' ? 'unpublish' : modalType === 'permanent-delete' ? 'permanent-delete' : 'delete')}
        onCancel={() => { if (!deleting) setModalType(null) }} />

      {/* Fetch Progress Modal */}
      {fetchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (fetchDone) setFetchModal(false) }}>
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {fetchDone ? <Megaphone className="w-5 h-5 text-primary" /> : <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                공고 수집 {fetchDone ? '완료' : '진행 중'}
              </h3>
              {fetchDone && <button onClick={() => setFetchModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>}
            </div>
            <div className="space-y-3">
              {fetchLogs.map((log, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground">{log.source}</span>
                    <span className={`text-xs font-medium ${log.status === '완료' ? 'text-primary' : log.status === '대기' ? 'text-zinc-400' : 'text-amber-600'}`}>{log.status}</span>
                  </div>
                  {log.status !== '대기' && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>수집 <strong className="text-foreground">{log.fetched}</strong></span>
                      <span>신규 <strong className="text-blue-700">{log.inserted}</strong></span>
                      <span>중복 <strong>{log.skipped}</strong></span>
                    </div>
                  )}
                  <div className="mt-1.5 h-1.5 bg-border/50 rounded-full overflow-hidden">
                    {log.status === '대기' ? (
                      <div className="h-full bg-zinc-200 rounded-full" style={{ width: '0%' }} />
                    ) : log.status === '완료' ? (
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: '100%' }} />
                    ) : (
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                    )}
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
        <div className="fixed bottom-6 right-6 z-[70]">
          <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm">
            {toastMsg}
            <button onClick={() => setToastMsg(null)} className="text-gray-300 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminAnnouncementDetail({ announcement: ann, onTogglePublish, onBack }: {
  announcement: Announcement; onTogglePublish: () => void; onBack: () => void
}) {
  const dday = calcDDay(ann.end_date)
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="lg:hidden px-4 py-3 border-b border-border/50">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-semibold border ${getStatusBadgeClass(ann.status, ann.end_date)}`}>{getStatusLabel(ann.status, ann.end_date)}</Badge>
            {dday !== null && <span className={`text-xs font-mono font-bold ${dday <= 3 && dday >= 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{dday < 0 ? '마감' : `D-${dday}`}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onTogglePublish}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${ann.is_published ? 'bg-primary/10 text-primary' : 'bg-red-100/50 text-red-600'}`}>
              {ann.is_published ? <><Eye className="w-3.5 h-3.5 inline mr-1" />공개</> : <><EyeOff className="w-3.5 h-3.5 inline mr-1" />비공개</>}
            </button>
            <Link href={`/admin/announcements/${ann.id}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80">수정</Link>
            {ann.source_url && (
              <a href={ann.source_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold mb-3">{ann.title}</h2>

        <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-border/50">
          {ann.organization && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="w-4 h-4" />{ann.organization}</div>}
          <Badge variant="outline" className="text-xs">{ann.source}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><p className="text-xs font-semibold text-muted-foreground mb-1">접수기간</p><p className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" />{formatPeriod(ann.start_date, ann.end_date)}</p></div>
          {ann.budget && <div><p className="text-xs font-semibold text-muted-foreground mb-1">사업규모</p><p>{ann.budget}</p></div>}
          {ann.target && <div><p className="text-xs font-semibold text-muted-foreground mb-1">지원대상</p><p>{ann.target}</p></div>}
          {ann.application_method && <div><p className="text-xs font-semibold text-muted-foreground mb-1">접수방법</p><p>{ann.application_method}</p></div>}
        </div>

        {ann.support_areas && ann.support_areas.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-2">지원 분야</p>
            <div className="flex flex-wrap gap-1.5">{ann.support_areas.map((a, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted">{a}</span>)}</div>
          </div>
        )}

        {ann.description && (
          <div className="mb-6"><p className="text-xs font-semibold text-muted-foreground mb-2">사업 설명</p><p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{ann.description}</p></div>
        )}
        {ann.eligibility && (
          <div className="mb-6"><p className="text-xs font-semibold text-muted-foreground mb-2">지원 자격</p><p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{ann.eligibility}</p></div>
        )}
      </div>
    </div>
  )
}
