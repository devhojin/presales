'use client'

import { useEffect, useMemo, useState } from 'react'
import { History, GitCommit, Plus, Minus, FileText, Clock, User, X, Calendar, Hash, ChevronRight, Loader2 } from 'lucide-react'
import { useDraggableModal } from '@/hooks/useDraggableModal'

interface CommitStats {
  files: number
  insertions: number
  deletions: number
}

interface Commit {
  hash: string
  fullHash: string
  date: string
  time: string
  iso: string
  author: string
  subject: string
  body: string
  type: string
  typeLabel: string
  scope: string | null
  title: string
  stats: CommitStats
  files: string[]
}

interface DayEntry {
  date: string
  count: number
  typeCounts: Record<string, number>
  totals: CommitStats
  commits: Commit[]
}

interface WorkHistory {
  generatedAt: string
  totalCommits: number
  days: DayEntry[]
}

const TYPE_COLORS: Record<string, string> = {
  feat: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fix: 'bg-red-50 text-red-700 border-red-200',
  refactor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  docs: 'bg-sky-50 text-sky-700 border-sky-200',
  chore: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  perf: 'bg-amber-50 text-amber-700 border-amber-200',
  test: 'bg-purple-50 text-purple-700 border-purple-200',
  ci: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  style: 'bg-pink-50 text-pink-700 border-pink-200',
  audit: 'bg-orange-50 text-orange-700 border-orange-200',
}

function typeBadge(type: string): string {
  return TYPE_COLORS[type] || 'bg-zinc-100 text-zinc-700 border-zinc-200'
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function formatKoreanDate(date: string): string {
  const d = new Date(date + 'T00:00:00+09:00')
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEKDAY[d.getDay()]
  return `${y}년 ${m}월 ${day}일 (${w})`
}

function relativeDay(date: string): string {
  const target = new Date(date + 'T00:00:00+09:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff < 7) return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  return `${Math.floor(diff / 30)}개월 전`
}

export default function WorkHistoryPage() {
  const [data, setData] = useState<WorkHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/work-history.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('히스토리 데이터를 불러오지 못했습니다')
        const json = (await res.json()) as WorkHistory
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const allTypes = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const d of data.days) {
      for (const t of Object.keys(d.typeCounts)) set.add(t)
    }
    return Array.from(set).sort()
  }, [data])

  const filteredDays = useMemo(() => {
    if (!data) return []
    if (typeFilter === 'all') return data.days
    return data.days
      .map((d) => ({
        ...d,
        commits: d.commits.filter((c) => c.type === typeFilter),
      }))
      .filter((d) => d.commits.length > 0)
      .map((d) => ({ ...d, count: d.commits.length }))
  }, [data, typeFilter])

  const selectedDay = useMemo(() => {
    if (!selectedDate || !data) return null
    return data.days.find((d) => d.date === selectedDate) || null
  }, [selectedDate, data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || '데이터 없음'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">작업 히스토리</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          git 커밋 로그 기반 일간 작업 내역 · 총 {data.totalCommits.toLocaleString()}건 · 최근 업데이트{' '}
          {new Date(data.generatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            typeFilter === 'all'
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
          }`}
        >
          전체
        </button>
        {allTypes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              typeFilter === t
                ? 'bg-primary text-white border-primary'
                : `${typeBadge(t)} hover:opacity-80`
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Day list */}
      <div className="space-y-3">
        {filteredDays.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">조건에 맞는 작업이 없습니다</div>
        )}
        {filteredDays.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => setSelectedDate(day.date)}
            className="w-full text-left bg-white border border-border rounded-xl p-5 hover:border-primary hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-semibold text-foreground">{formatKoreanDate(day.date)}</span>
                  <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    {relativeDay(day.date)}
                  </span>
                  <span className="text-xs font-bold text-primary">{day.count}건</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {Object.entries(day.typeCounts).map(([t, n]) => (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${typeBadge(t)}`}
                    >
                      {t} {n}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {day.totals.files}개 파일
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <Plus className="w-3 h-3" />
                    {day.totals.insertions.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <Minus className="w-3 h-3" />
                    {day.totals.deletions.toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 text-xs text-muted-foreground line-clamp-1">
                  {day.commits[0]?.title}
                  {day.commits.length > 1 && <span className="text-zinc-400"> · 외 {day.commits.length - 1}건</span>}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-primary transition-colors shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selectedDay && (
        <DayDetailModal day={selectedDay} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  )
}

function DayDetailModal({ day, onClose }: { day: DayEntry; onClose: () => void }) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-[5vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 cursor-move select-none" onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{formatKoreanDate(day.date)}</h2>
              <p className="text-xs text-muted-foreground">
                {day.count}건의 작업 · +{day.totals.insertions.toLocaleString()} / -{day.totals.deletions.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            title="닫기"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {day.commits.map((c) => (
            <CommitCard key={c.fullHash} commit={c} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>이 PC 기준 ~/project/presales · devhojin/presales</span>
          <span>총 {day.totals.files}개 파일 변경</span>
        </div>
      </div>
    </div>
  )
}

function CommitCard({ commit }: { commit: Commit }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border rounded-xl p-4 bg-white">
      <div className="flex items-start gap-3">
        <GitCommit className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${typeBadge(commit.type)}`}>
              {commit.type}
            </span>
            {commit.scope && (
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted border border-border">
                {commit.scope}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {commit.time}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Hash className="w-3 h-3" />
              {commit.hash}
            </span>
          </div>

          <p className="text-sm font-medium text-foreground break-words">{commit.title}</p>

          {commit.body && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-[11px] text-primary hover:underline cursor-pointer"
              >
                {expanded ? '상세 접기' : '상세 보기'}
              </button>
              {expanded && (
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border/50">
                  {commit.body}
                </pre>
              )}
            </>
          )}

          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" />
              {commit.author}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {commit.stats.files}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Plus className="w-3 h-3" />
              {commit.stats.insertions}
            </span>
            <span className="inline-flex items-center gap-1 text-red-600">
              <Minus className="w-3 h-3" />
              {commit.stats.deletions}
            </span>
          </div>

          {expanded && commit.files.length > 0 && (
            <div className="mt-3 text-[11px] font-mono text-muted-foreground space-y-0.5 max-h-48 overflow-y-auto">
              {commit.files.map((f) => (
                <div key={f} className="truncate">· {f}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
