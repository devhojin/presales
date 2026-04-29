'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  CircleHelp,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

interface LocalRecord {
  id: string
  email: string
  name: string | null
  source: string | null
  status: string
  subscribed_at: string | null
  unsubscribed_at: string | null
  last_sent_at: string | null
  send_count: number | null
  local_site: 'presales'
  central: {
    ok?: boolean
    found?: boolean
    subscriber?: {
      id: string
      email: string
      name: string | null
      status: string
      created_at: string | null
      unsubscribed_at: string | null
      deleted_at: string | null
      subscriber_sources?: Array<{
        source?: string
        source_site?: string
        source_member_state?: string | null
        source_user_id?: string | null
        first_seen_at?: string | null
        last_seen_at?: string | null
      }>
      brief_subscriptions?: Array<{
        id: string
        status: string
        subscribed_at?: string | null
        brief_types?: { key?: string; name?: string } | null
      }>
    }
  } | null
}

const CENTRAL_ADMIN_URL =
  process.env.NEXT_PUBLIC_MORNING_BRIEF_ADMIN_URL || 'https://morning-brief.amarans.co.kr/admin'

interface FlowStage {
  code: 'received' | 'checking' | 'missing' | 'sendable' | 'unsubscribed' | 'deleted' | 'bounced' | 'unknown'
  label: string
  description: string
}

function formatKst(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function centralStatus(record: LocalRecord): string {
  const subscriber = record.central?.subscriber
  if (!record.central) return 'checking'
  if (!record.central.found || !subscriber) return 'missing'
  const subscription = subscriber.brief_subscriptions?.[0]
  return subscription?.status || subscriber.status || 'unknown'
}

function localStage(): FlowStage {
  return {
    code: 'received',
    label: '1. 신청 접수',
    description: '프리세일즈에 신청 시각과 이메일 기록이 남아 있습니다.',
  }
}

function centralStage(record: LocalRecord): FlowStage {
  const status = centralStatus(record)
  if (status === 'checking') {
    return {
      code: 'checking',
      label: '2. 중앙 확인 대기',
      description: '중앙 모닝브리프 API 주소 또는 비밀키가 설정되지 않아 상태를 확인하지 못했습니다. 구독자의 수신 상태가 아니라 연동 확인 단계입니다.',
    }
  }
  if (status === 'missing') {
    return {
      code: 'missing',
      label: '2. 중앙 등록 누락',
      description: '프리세일즈 신청 기록은 있지만 중앙 모닝브리프에서 이 이메일을 찾지 못했습니다.',
    }
  }
  if (status === 'active') {
    return {
      code: 'sendable',
      label: '3. 발송 대상',
      description: '중앙 모닝브리프에 등록되어 아침 7시 발송 대상입니다.',
    }
  }
  if (status === 'unsubscribed') {
    return {
      code: 'unsubscribed',
      label: '수신거부',
      description: '중앙 모닝브리프에서 수신거부 처리되어 발송 대상에서 제외됩니다.',
    }
  }
  if (status === 'deleted') {
    return {
      code: 'deleted',
      label: '삭제 표시',
      description: '중앙 모닝브리프에서 삭제 처리되어 발송 대상에서 제외됩니다.',
    }
  }
  if (status === 'bounced') {
    return {
      code: 'bounced',
      label: '발송 반송',
      description: '메일 발송이 반송되어 확인이 필요한 상태입니다.',
    }
  }
  return {
    code: 'unknown',
    label: '상태 확인 필요',
    description: '중앙 모닝브리프가 알 수 없는 상태값을 반환했습니다.',
  }
}

function badgeClass(stage: FlowStage['code']): string {
  if (stage === 'received') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (stage === 'sendable') return 'bg-blue-50 text-blue-800 border-blue-200'
  if (stage === 'unsubscribed') return 'bg-zinc-100 text-zinc-700 border-zinc-200'
  if (stage === 'deleted' || stage === 'missing') return 'bg-red-50 text-red-700 border-red-200'
  if (stage === 'bounced' || stage === 'checking') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

function sourceMember(record: LocalRecord): string {
  const source = record.central?.subscriber?.subscriber_sources?.find((item) => {
    return item.source_site === 'presales' || item.source === 'presales'
  })
  if (source?.source_member_state === 'member') return '프리세일즈 회원'
  if (source?.source_member_state === 'guest') return '비회원 신청'
  return '확인 필요'
}

export default function AdminMorningBriefPage() {
  const [records, setRecords] = useState<LocalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/morning-brief/local-records', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `local records failed (${res.status})`)
      }
      setRecords(json.records as LocalRecord[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter((record) => {
      const hay = [
        record.email,
        record.name,
        record.source,
        centralStage(record).label,
        centralStage(record).description,
        sourceMember(record),
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [query, records])

  const counts = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        const stage = centralStage(record).code
        acc.total += 1
        if (stage === 'sendable') acc.sendable += 1
        if (stage === 'unsubscribed') acc.unsubscribed += 1
        if (stage === 'deleted') acc.deleted += 1
        if (stage === 'checking') acc.checking += 1
        return acc
      },
      { total: 0, sendable: 0, unsubscribed: 0, deleted: 0, checking: 0 },
    )
  }, [records])

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">모닝브리프 기록</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              프리세일즈에서 들어온 신청 기록과 중앙 모닝브리프 상태를 확인합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={CENTRAL_ADMIN_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            중앙 관리자
          </a>
          <button
            type="button"
            onClick={load}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        삭제와 수신거부 처리는 중앙 모닝브리프 관리자에서만 수행합니다. 이 화면은 프리세일즈
        신청 당시의 기록과 중앙 상태 스냅샷을 보여줍니다.
      </div>

      <div className="mb-6 rounded-xl border border-border/50 bg-card p-4 text-sm text-muted-foreground">
        <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <CircleHelp className="h-4 w-4" />
          상태 단계 안내
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <StepHelp title="1. 신청 접수" body="프리세일즈에 신청 기록이 저장된 단계입니다." />
          <StepHelp title="2. 중앙 등록 확인" body="중앙 모닝브리프에 이메일이 등록됐는지 확인하는 단계입니다." />
          <StepHelp title="3. 발송 대상" body="중앙에 활성 등록되어 아침 7시 발송 대상입니다." />
          <StepHelp title="수신거부/삭제" body="중앙에서 발송 제외 처리된 상태입니다." />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="신청 기록" value={counts.total} />
        <StatCard label="발송 대상" value={counts.sendable} />
        <StatCard label="수신거부" value={counts.unsubscribed} />
        <StatCard label="삭제 표시" value={counts.deleted} />
        <StatCard label="중앙 확인 대기" value={counts.checking} />
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이메일·이름·상태·회원 여부 검색"
          className="h-10 min-w-[220px] flex-1 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length.toLocaleString('ko-KR')}건 / 전체 {records.length.toLocaleString('ko-KR')}건
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          오류: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            표시할 신청 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">신청 시각</th>
                  <th className="px-4 py-3">이메일</th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">신청 단계</th>
                  <th className="px-4 py-3">중앙/발송 단계</th>
                  <th className="px-4 py-3">회원 여부</th>
                  <th className="px-4 py-3">출처</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((record) => {
                  const received = localStage()
                  const stage = centralStage(record)
                  return (
                    <tr key={record.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatKst(record.subscribed_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{record.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{record.name || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={badgeClass(received.code)} title={received.description}>
                          {received.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[260px] flex-col gap-1">
                          <Badge variant="outline" className={badgeClass(stage.code)} title={stage.description}>
                            {stage.label}
                          </Badge>
                          <span className="text-xs leading-relaxed text-muted-foreground">{stage.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {sourceMember(record)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{record.source || 'presales'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StepHelp({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 leading-relaxed">{body}</p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value.toLocaleString('ko-KR')}</p>
    </div>
  )
}
