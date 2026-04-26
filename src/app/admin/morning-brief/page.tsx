'use client'

import { useEffect, useState, useMemo } from 'react'
import { Mail, Users, UserMinus, Loader2, Send, Globe, RefreshCw } from 'lucide-react'

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
  presales: 'bg-blue-100 text-blue-700 border-blue-200',
  spc: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  maruai: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  import: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unsubscribed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  bounced: 'bg-red-100 text-red-700 border-red-200',
}

function formatDateTime(d: string | null): string {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return d
  }
}

export default function AdminMorningBriefPage() {
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/admin/morning-brief/subscribers'),
        fetch('/api/admin/morning-brief/stats'),
      ])
      if (!sRes.ok) throw new Error(`구독자 조회 실패 (${sRes.status})`)
      if (!tRes.ok) throw new Error(`통계 조회 실패 (${tRes.status})`)
      const sJson = await sRes.json()
      const tJson = await tRes.json()
      if (!sJson.ok) throw new Error(sJson.error || '구독자 응답 오류')
      if (!tJson.ok) throw new Error(tJson.error || '통계 응답 오류')
      setSubs(sJson.subscribers as Subscriber[])
      setStats(tJson.stats as Stats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (sourceFilter !== 'all' && !s.sources.includes(sourceFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!s.email.toLowerCase().includes(q) && !(s.name ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [subs, sourceFilter, statusFilter, search])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" /> 모닝브리프
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            마스터 명단(morning-brief Supabase) — presales / SPC / maru AI 사이트가 공유.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-5 h-5" />} label="총 구독자" value={stats.total} />
          <StatCard icon={<Mail className="w-5 h-5" />} label="활성" value={stats.active} accent="emerald" />
          <StatCard icon={<UserMinus className="w-5 h-5" />} label="수신거부" value={stats.unsubscribed} accent="zinc" />
          <StatCard
            icon={<Send className="w-5 h-5" />}
            label={stats.latestBrief ? `최근 발송 (${stats.latestBrief.brief_date})` : '최근 발송'}
            value={stats.latestBrief ? `${stats.latestBrief.sent_count}/${stats.latestBrief.recipient_count}` : '-'}
            accent="blue"
          />
        </div>
      )}

      {/* 출처별 카운트 */}
      {stats && Object.keys(stats.bySource).length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3">
            <Globe className="w-4 h-4" /> 출처별 가입자
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.bySource).map(([src, n]) => (
              <span
                key={src}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${SOURCE_BADGE_CLASS[src] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}
              >
                {src}
                <span className="font-bold">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 필터 + 검색 */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="이메일 또는 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-300 rounded-md cursor-pointer"
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="unsubscribed">수신거부</option>
          <option value="bounced">반송</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-zinc-300 rounded-md cursor-pointer"
        >
          <option value="all">전체 출처</option>
          {stats && Object.keys(stats.bySource).map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        <span className="text-sm text-zinc-500">
          {filtered.length}/{subs.length}
        </span>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
          오류: {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> 불러오는 중…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">조건에 맞는 구독자가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-left text-zinc-600">
                  <th className="px-4 py-3 font-semibold">이메일</th>
                  <th className="px-4 py-3 font-semibold">이름</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">출처</th>
                  <th className="px-4 py-3 font-semibold">가입일</th>
                  <th className="px-4 py-3 font-semibold">최근 발송</th>
                  <th className="px-4 py-3 font-semibold text-right">발송 수</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{s.email}</td>
                    <td className="px-4 py-3 text-zinc-700">{s.name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_BADGE_CLASS[s.status] ?? ''}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.sources.length === 0 ? (
                          <span className="text-zinc-400 text-xs">(없음)</span>
                        ) : s.sources.map((src) => (
                          <span
                            key={src}
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${SOURCE_BADGE_CLASS[src] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{formatDateTime(s.subscribed_at)}</td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{formatDateTime(s.last_sent_at)}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700">{s.send_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode; label: string; value: number | string; accent?: 'blue' | 'emerald' | 'zinc'
}) {
  const accentBg = accent === 'emerald' ? 'bg-emerald-50 text-emerald-700'
    : accent === 'blue' ? 'bg-blue-50 text-blue-700'
    : accent === 'zinc' ? 'bg-zinc-50 text-zinc-600'
    : 'bg-white text-zinc-700'
  return (
    <div className={`border border-zinc-200 rounded-lg p-4 ${accentBg}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}
