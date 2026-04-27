'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Globe,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  UserMinus,
  Users,
} from 'lucide-react'

interface Subscriber {
  id: string
  email: string
  name: string | null
  status: 'active' | 'unsubscribed' | 'bounced'
  subscribed_at: string
  unsubscribed_at: string | null
  last_sent_at: string | null
  send_count: number
  sources: string[]
}

interface Brief {
  id: string
  brief_date: string
  status: 'pending' | 'collecting' | 'ready' | 'sending' | 'sent' | 'failed'
  news_count: number
  recipient_count: number
  sent_count: number
  failed_count: number
  subject: string | null
  finished_at: string | null
}

interface Stats {
  total: number
  active: number
  unsubscribed: number
  bySource: Record<string, number>
  latestBrief: {
    brief_date: string
    status: string
    sent_count: number
    recipient_count: number
    finished_at: string | null
  } | null
}

const SOURCE_BADGE_CLASS: Record<string, string> = {
  presales: 'bg-blue-50 text-blue-800 border-blue-200',
  spc: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  maruai: 'bg-purple-50 text-purple-800 border-purple-200',
  admin: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  import: 'bg-amber-50 text-amber-800 border-amber-200',
}

const STATUS_BADGE_CLASS: Record<Subscriber['status'], string> = {
  active: 'bg-blue-50 text-blue-800 border-blue-200',
  unsubscribed: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  bounced: 'bg-red-50 text-red-700 border-red-200',
}

const BRIEF_STATUS_BADGE_CLASS: Record<Brief['status'], string> = {
  pending: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  collecting: 'bg-amber-50 text-amber-800 border-amber-200',
  ready: 'bg-sky-50 text-sky-800 border-sky-200',
  sending: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  sent: 'bg-blue-50 text-blue-800 border-blue-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSubscriberStatus(status: Subscriber['status']): string {
  if (status === 'active') return '활성'
  if (status === 'unsubscribed') return '수신거부'
  return '반송'
}

function formatBriefStatus(status: Brief['status']): string {
  if (status === 'pending') return '대기'
  if (status === 'collecting') return '수집중'
  if (status === 'ready') return '준비완료'
  if (status === 'sending') return '발송중'
  if (status === 'sent') return '발송완료'
  return '실패'
}

export default function AdminMorningBriefPage() {
  const [tab, setTab] = useState<'subscribers' | 'briefs'>('subscribers')
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sRes, tRes, bRes] = await Promise.all([
        fetch('/api/admin/morning-brief/subscribers', { cache: 'no-store' }),
        fetch('/api/admin/morning-brief/stats', { cache: 'no-store' }),
        fetch('/api/admin/morning-brief/briefs', { cache: 'no-store' }),
      ])

      const [sJson, tJson, bJson] = await Promise.all([
        sRes.json(),
        tRes.json(),
        bRes.json(),
      ])

      if (!sRes.ok) throw new Error(sJson.error ? `구독자 조회 실패: ${sJson.error}` : `구독자 조회 실패 (${sRes.status})`)
      if (!tRes.ok) throw new Error(tJson.error ? `통계 조회 실패: ${tJson.error}` : `통계 조회 실패 (${tRes.status})`)
      if (!bRes.ok) throw new Error(bJson.error ? `브리프 조회 실패: ${bJson.error}` : `브리프 조회 실패 (${bRes.status})`)
      if (!sJson.ok) throw new Error(sJson.error || '구독자 응답 오류')
      if (!tJson.ok) throw new Error(tJson.error || '통계 응답 오류')
      if (!bJson.ok) throw new Error(bJson.error || '브리프 응답 오류')

      setSubs(sJson.subscribers as Subscriber[])
      setStats(tJson.stats as Stats)
      setBriefs(bJson.briefs as Brief[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredSubscribers = useMemo(() => {
    return subs.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (sourceFilter !== 'all' && !s.sources.includes(sourceFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!s.email.toLowerCase().includes(q) && !(s.name ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [search, sourceFilter, statusFilter, subs])

  const sources = useMemo(() => Object.keys(stats?.bySource ?? {}), [stats])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">모닝브리프</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              morning-brief 마스터 DB 기준 구독자 관리 및 발송 이력
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="전체 구독자" value={stats?.total ?? 0} />
        <StatCard label="활성 구독" value={stats?.active ?? 0} accent="blue" />
        <StatCard label="수신 거부" value={stats?.unsubscribed ?? 0} accent="zinc" />
        <StatCard label="발송된 브리프" value={briefs.length} />
      </div>

      <div className="flex gap-1 border-b border-border/50 mb-6">
        {(['subscribers', 'briefs'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              tab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {value === 'subscribers' ? (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> 구독자 ({subs.length})
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Send className="w-4 h-4" /> 발송 이력 ({briefs.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          오류: {error}
        </div>
      )}

      {tab === 'subscribers' && (
        <>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-wrap items-center gap-3 mb-6">
            <input
              type="text"
              placeholder="이메일 또는 이름 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border text-sm cursor-pointer"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="unsubscribed">수신거부</option>
              <option value="bounced">반송</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border text-sm cursor-pointer"
            >
              <option value="all">전체 출처</option>
              {sources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">
              {filteredSubscribers.length}/{subs.length}
            </span>
          </div>

          {stats && sources.length > 0 && (
            <div className="bg-card border border-border/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                <Globe className="w-4 h-4" /> 출처별 가입자
              </div>
              <div className="flex flex-wrap gap-2">
                {sources.map((source) => (
                  <Badge
                    key={source}
                    className={`text-xs ${SOURCE_BADGE_CLASS[source] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}
                  >
                    {source} {stats.bySource[source]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">이메일</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">이름</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">가입 경로</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">가입일</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">최근 발송</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">발송</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
                        </span>
                      </td>
                    </tr>
                  ) : filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        조건에 맞는 구독자가 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{sub.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{sub.name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${STATUS_BADGE_CLASS[sub.status]}`}>
                            {formatSubscriberStatus(sub.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {sub.sources.length === 0 ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              sub.sources.map((source) => (
                                <Badge
                                  key={source}
                                  className={`text-xs ${SOURCE_BADGE_CLASS[source] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}
                                >
                                  {source}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(sub.subscribed_at)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(sub.last_sent_at)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{sub.send_count}회</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'briefs' && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">날짜</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">제목</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">뉴스</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">대상</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">성공</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">실패</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">완료 시각</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
                      </span>
                    </td>
                  </tr>
                ) : briefs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      발송된 브리프가 없습니다
                    </td>
                  </tr>
                ) : (
                  briefs.map((brief) => (
                    <tr key={brief.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {formatDate(brief.brief_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-[320px] truncate">
                        {brief.subject ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                          {brief.news_count}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{brief.recipient_count}명</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{brief.sent_count}명</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{brief.failed_count}명</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(brief.finished_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-xs ${BRIEF_STATUS_BADGE_CLASS[brief.status]}`}>
                          {formatBriefStatus(brief.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'blue' | 'zinc'
}) {
  const accentClass = accent === 'blue'
    ? 'text-blue-700'
    : accent === 'zinc'
      ? 'text-muted-foreground'
      : 'text-foreground'

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accentClass}`}>{value}</p>
    </div>
  )
}
