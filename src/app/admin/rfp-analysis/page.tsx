'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

type RfpStatus = 'all' | 'created' | 'extracting' | 'analyzing' | 'rendering' | 'completed' | 'failed'

type AdminRfpJob = {
  id: string
  userId: string | null
  guestId: string | null
  isGuest: boolean
  user: AdminRfpUser | null
  status: string
  progress: number
  step: string | null
  rfpFileName: string
  rfpFileSize: number | null
  hasRfpFile: boolean
  taskFileName: string | null
  taskFileSize: number | null
  hasTaskFile: boolean
  projectTitle: string | null
  reportHtmlPath: string | null
  errorMessage: string | null
  openaiResponseId: string | null
  sourcePageCount: number | null
  createdAt: string
  completedAt: string | null
  downloadCount: number
  userDeletedAt: string | null
  summary: {
    projectTitle: string | null
    organization: string | null
    period: string | null
    budget: string | null
    evaluationMethod: string | null
    quantitativeScore: string | null
    qualitativeScore: string | null
    priceScore: string | null
    keyRequirementsCount: number
    questionsCount: number
  }
}

type AdminRfpUser = {
  id: string
  email: string | null
  name: string | null
  company: string | null
  phone: string | null
  role: string | null
  rewardBalance: number | null
  createdAt: string | null
  deletedAt: string | null
}

type JobsResponse = {
  jobs: AdminRfpJob[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

const PAGE_SIZE = 20

const statusOptions: Array<{ value: RfpStatus; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'created', label: '업로드 대기' },
  { value: 'extracting', label: '원문 추출' },
  { value: 'analyzing', label: 'AI 분석중' },
  { value: 'rendering', label: 'HTML 생성' },
  { value: 'completed', label: '완료' },
  { value: 'failed', label: '실패' },
]

const statusMap: Record<string, { label: string; className: string }> = {
  created: { label: '업로드 대기', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  extracting: { label: '원문 추출', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  analyzing: { label: 'AI 분석중', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  rendering: { label: 'HTML 생성', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  completed: { label: '완료', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { label: '실패', className: 'border-red-200 bg-red-50 text-red-700' },
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number | null) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '-'
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024).toLocaleString('ko-KR')}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatWon(value: number | null) {
  return `${Math.max(0, Number(value || 0)).toLocaleString('ko-KR')}원`
}

function roleLabel(value: string | null) {
  if (value === 'admin') return '관리자'
  if (value === 'user') return '일반 회원'
  if (value === 'guest') return '비회원'
  return value || '-'
}

function triggerBrowserDownload(url: string, fileName?: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  if (fileName) anchor.download = fileName
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function readDownloadFileName(header: string | null) {
  if (!header) return null

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1])
    } catch {
      return null
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(header)
  return quotedMatch?.[1] || null
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  triggerBrowserDownload(url, fileName)
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

function compactText(value: string | null, fallback = '-') {
  return value && value !== '원문에서 확인 불가' ? value : fallback
}

function userLabel(job: AdminRfpJob) {
  if (job.isGuest) return '비회원'
  return job.user?.name || job.user?.email || job.userId || '-'
}

function userForModal(job: AdminRfpJob): AdminRfpUser {
  if (job.isGuest) {
    return {
      id: job.guestId || job.id,
      email: null,
      name: '비회원',
      company: null,
      phone: null,
      role: 'guest',
      rewardBalance: null,
      createdAt: job.createdAt,
      deletedAt: null,
    }
  }

  return job.user || {
    id: job.userId || job.id,
    email: null,
    name: null,
    company: null,
    phone: null,
    role: null,
    rewardBalance: null,
    createdAt: null,
    deletedAt: null,
  }
}

export default function AdminRfpAnalysisPage() {
  const [jobs, setJobs] = useState<AdminRfpJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState<RfpStatus>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [inputDownloadingId, setInputDownloadingId] = useState<string | null>(null)
  const [mutatingJobId, setMutatingJobId] = useState<string | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminRfpUser | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      status,
    })
    if (search) params.set('q', search)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    try {
      const res = await fetch(`/api/admin/rfp-analysis/jobs?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({})) as Partial<JobsResponse> & { error?: string }
      if (!res.ok) {
        setError(data.error || 'AI 분석 목록을 불러오지 못했습니다')
        setJobs([])
        setTotalCount(0)
        setTotalPages(1)
        return
      }
      setJobs(data.jobs || [])
      setTotalCount(data.pagination?.totalCount || 0)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch {
      setError('AI 분석 목록 조회 중 오류가 발생했습니다')
      setJobs([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, status])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const completedCount = useMemo(() => jobs.filter((job) => job.status === 'completed').length, [jobs])
  const failedCount = useMemo(() => jobs.filter((job) => job.status === 'failed').length, [jobs])
  const visibleJobIds = useMemo(() => jobs.map((job) => job.id), [jobs])
  const selectedVisibleCount = useMemo(
    () => visibleJobIds.filter((id) => selectedJobIds.has(id)).length,
    [selectedJobIds, visibleJobIds],
  )
  const allVisibleSelected = jobs.length > 0 && selectedVisibleCount === jobs.length

  useEffect(() => {
    setSelectedJobIds((current) => {
      if (current.size === 0) return current

      const visible = new Set(visibleJobIds)
      const next = new Set(Array.from(current).filter((id) => visible.has(id)))
      return next.size === current.size ? current : next
    })
  }, [visibleJobIds])

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function handleStatusChange(nextStatus: RfpStatus) {
    setPage(1)
    setStatus(nextStatus)
  }

  function toggleJobSelection(jobId: string, checked: boolean) {
    setSelectedJobIds((current) => {
      const next = new Set(current)
      if (checked) next.add(jobId)
      else next.delete(jobId)
      return next
    })
  }

  function toggleVisibleJobsSelection(checked: boolean) {
    setSelectedJobIds((current) => {
      const next = new Set(current)
      for (const jobId of visibleJobIds) {
        if (checked) next.add(jobId)
        else next.delete(jobId)
      }
      return next
    })
  }

  async function handleDownload(jobId: string) {
    setDownloadingId(jobId)
    try {
      const res = await fetch(`/api/admin/rfp-analysis/jobs/${jobId}/report`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error || '리포트 파일을 다운로드하지 못했습니다')
        return
      }

      const blob = await res.blob()
      const fileName = readDownloadFileName(res.headers.get('Content-Disposition')) || '프리세일즈-AI 사업분석.html'
      triggerBlobDownload(blob, fileName)
      await loadJobs()
    } catch {
      setError('리포트 다운로드 중 오류가 발생했습니다')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleInputDownload(jobId: string) {
    setInputDownloadingId(jobId)
    setError('')
    try {
      const res = await fetch(`/api/admin/rfp-analysis/jobs/${jobId}/input?kind=rfp`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({})) as { url?: string; fileName?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error || 'RFP 다운로드 URL을 만들지 못했습니다')
        return
      }
      triggerBrowserDownload(data.url, data.fileName)
    } catch {
      setError('RFP 다운로드 중 오류가 발생했습니다')
    } finally {
      setInputDownloadingId(null)
    }
  }

  async function handleSoftDelete(job: AdminRfpJob) {
    if (job.userDeletedAt) return
    const confirmed = window.confirm('이 분석 건을 사용자 페이지에서 삭제 처리할까요? 관리자 목록과 데이터는 유지됩니다.')
    if (!confirmed) return

    setMutatingJobId(`${job.id}:soft`)
    setError('')
    try {
      const res = await fetch(`/api/admin/rfp-analysis/jobs/${job.id}`, {
        method: 'PATCH',
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error || '사용자 삭제 처리에 실패했습니다')
        return
      }
      await loadJobs()
    } catch {
      setError('사용자 삭제 처리 중 오류가 발생했습니다')
    } finally {
      setMutatingJobId(null)
    }
  }

  async function handleHardDelete(job: AdminRfpJob) {
    const confirmed = window.confirm('이 분석 건과 관련 DB 데이터, 업로드 PDF, 생성 HTML을 완전삭제할까요? 이 작업은 되돌릴 수 없습니다.')
    if (!confirmed) return

    setMutatingJobId(`${job.id}:hard`)
    setError('')
    try {
      const res = await fetch(`/api/admin/rfp-analysis/jobs/${job.id}`, {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error || '완전삭제에 실패했습니다')
        return
      }
      await loadJobs()
    } catch {
      setError('완전삭제 중 오류가 발생했습니다')
    } finally {
      setMutatingJobId(null)
    }
  }

  async function handleBulkHardDelete() {
    const ids = Array.from(selectedJobIds)
    if (ids.length === 0) return

    const confirmed = window.confirm(`선택한 AI 분석 ${ids.length.toLocaleString('ko-KR')}건과 관련 DB 데이터, 업로드 PDF, 생성 HTML을 완전삭제할까요? 이 작업은 되돌릴 수 없습니다.`)
    if (!confirmed) return

    setBulkDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/rfp-analysis/jobs', {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string; deletedCount?: number }
      if (!res.ok) {
        const partialMessage = data.deletedCount
          ? ` (${data.deletedCount.toLocaleString('ko-KR')}건 삭제 후 중단)`
          : ''
        setError(`${data.error || '선택 완전삭제에 실패했습니다'}${partialMessage}`)
        await loadJobs()
        return
      }
      setSelectedJobIds(new Set())
      await loadJobs()
    } catch {
      setError('선택 완전삭제 중 오류가 발생했습니다')
    } finally {
      setBulkDeleting(false)
    }
  }

  function renderStatus(job: AdminRfpJob) {
    const statusInfo = statusMap[job.status] || { label: job.status, className: 'border-border bg-muted text-muted-foreground' }
    return <Badge className={`border ${statusInfo.className}`}>{statusInfo.label}</Badge>
  }

  function renderResultSummary(job: AdminRfpJob) {
    if (job.status === 'failed') {
      return (
        <p className="line-clamp-2 text-xs leading-relaxed text-red-600">
          {job.errorMessage || '분석 실패'}
        </p>
      )
    }

    const score = [job.summary.quantitativeScore, job.summary.qualitativeScore, job.summary.priceScore]
      .map((item) => compactText(item, ''))
      .filter(Boolean)
      .join(' · ')

    return (
      <div className="space-y-1 text-xs leading-relaxed text-[#514d46]">
        <p><span className="font-semibold text-[#17171f]">사업명</span> {compactText(job.summary.projectTitle || job.projectTitle)}</p>
        <p><span className="font-semibold text-[#17171f]">발주기관</span> {compactText(job.summary.organization)}</p>
        <p><span className="font-semibold text-[#17171f]">기간/금액</span> {compactText(job.summary.period)} / {compactText(job.summary.budget)}</p>
        <p><span className="font-semibold text-[#17171f]">평가</span> {score || compactText(job.summary.evaluationMethod)}</p>
        <p className="text-[#767268]">
          원문 {job.sourcePageCount ?? '-'}쪽 · 주요 요구사항 {job.summary.keyRequirementsCount}건 · 질의 후보 {job.summary.questionsCount}건
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#17171f] text-[#c8ff2e]">
            <FileSearch className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#17171f]">AI 분석 관리</h1>
          <p className="mt-1 text-sm text-[#767268]">
            언제 누가 어떤 RFP를 올렸고, 어떤 분석 결과가 생성됐는지 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadJobs()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#ddd8ce] bg-white px-4 text-sm font-semibold text-[#35332e] hover:bg-[#f2f0eb]"
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[20px] border border-[#e1ddd4] bg-white p-5">
          <p className="text-xs font-semibold text-[#767268]">전체 분석 건수</p>
          <p className="mt-2 text-3xl font-bold text-[#17171f]">{totalCount.toLocaleString('ko-KR')}</p>
        </div>
        <div className="rounded-[20px] border border-[#e1ddd4] bg-white p-5">
          <p className="text-xs font-semibold text-[#767268]">현재 페이지 완료</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{completedCount.toLocaleString('ko-KR')}</p>
        </div>
        <div className="rounded-[20px] border border-[#e1ddd4] bg-white p-5">
          <p className="text-xs font-semibold text-[#767268]">현재 페이지 실패</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{failedCount.toLocaleString('ko-KR')}</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#e1ddd4] bg-white p-4">
        <form onSubmit={handleSearchSubmit} className="grid gap-3 lg:grid-cols-[1fr_150px_150px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a867f]" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="회원명, 이메일, 회사명, 사업명, RFP 파일명 검색"
              className="h-11 w-full rounded-xl border border-[#ddd8ce] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#17171f]"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => { setPage(1); setDateFrom(event.target.value) }}
            className="h-11 rounded-xl border border-[#ddd8ce] bg-white px-3 text-sm outline-none focus:border-[#17171f]"
            title="시작일"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => { setPage(1); setDateTo(event.target.value) }}
            className="h-11 rounded-xl border border-[#ddd8ce] bg-white px-3 text-sm outline-none focus:border-[#17171f]"
            title="종료일"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-[#17171f] px-5 text-sm font-semibold text-white hover:bg-[#272733]"
          >
            검색
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === option.value
                  ? 'border-[#17171f] bg-[#17171f] text-white'
                  : 'border-[#ddd8ce] bg-white text-[#5f5b52] hover:bg-[#f2f0eb]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[24px] border border-[#e1ddd4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#e8e4dc] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#17171f]">RFP 분석 작업 목록</h2>
            <p className="mt-1 text-xs text-[#767268]">총 {totalCount.toLocaleString('ko-KR')}건 · {page}/{totalPages}페이지</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#ddd8ce] bg-white px-3 text-xs font-semibold text-[#35332e] hover:bg-[#f2f0eb]">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                disabled={loading || jobs.length === 0 || bulkDeleting}
                onChange={(event) => toggleVisibleJobsSelection(event.target.checked)}
                className="h-4 w-4 rounded border-[#cfc8bd] text-[#17171f] accent-[#17171f]"
              />
              현재 페이지 선택
            </label>
            <button
              type="button"
              disabled={selectedJobIds.size === 0 || bulkDeleting || loading}
              onClick={() => void handleBulkHardDelete()}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              선택 완전삭제 {selectedJobIds.size > 0 ? `${selectedJobIds.size.toLocaleString('ko-KR')}건` : ''}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#767268]" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-[#767268]">
            <FileSearch className="mb-3 h-10 w-10 opacity-35" />
            <p className="text-sm">조건에 맞는 AI 분석 작업이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#ece9e2]">
            {jobs.map((job) => {
              const canDownload = job.status === 'completed' && Boolean(job.reportHtmlPath)
              const softDeleting = mutatingJobId === `${job.id}:soft`
              const hardDeleting = mutatingJobId === `${job.id}:hard`
              return (
                <div key={job.id} className="grid gap-4 p-5 xl:grid-cols-[32px_130px_150px_minmax(220px,1fr)_minmax(300px,1.45fr)_190px] 2xl:grid-cols-[32px_150px_170px_minmax(340px,1.1fr)_minmax(540px,1.8fr)_210px]">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedJobIds.has(job.id)}
                      disabled={bulkDeleting || softDeleting || hardDeleting}
                      onChange={(event) => toggleJobSelection(job.id, event.target.checked)}
                      aria-label={`${job.projectTitle || job.summary.projectTitle || job.rfpFileName} 선택`}
                      className="mt-1 h-4 w-4 rounded border-[#cfc8bd] text-[#17171f] accent-[#17171f]"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#767268]">접수일</p>
                    <p className="mt-1 text-sm font-semibold text-[#17171f]">{formatDateTime(job.createdAt)}</p>
                    <p className="mt-1 text-xs text-[#767268]">완료 {formatDateTime(job.completedAt)}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#767268]">회원</p>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(userForModal(job))}
                      className="mt-1 flex max-w-full items-center gap-1.5 truncate text-left text-sm font-semibold text-[#17171f] underline-offset-4 hover:text-blue-700 hover:underline"
                    >
                      <UserRound className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{userLabel(job)}</span>
                    </button>
                    <p className="truncate text-xs text-[#767268]">
                      {job.isGuest ? '비회원 분석 요청' : job.user?.email || '-'}
                    </p>
                    <p className="truncate text-xs text-[#767268]">
                      {job.isGuest ? `Guest ${job.guestId?.slice(0, 8) || '-'}` : job.user?.company || '-'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      {renderStatus(job)}
                      {job.userDeletedAt && (
                        <Badge className="border border-amber-200 bg-amber-50 text-amber-700">(사용자 삭제처리)</Badge>
                      )}
                      <span className="text-xs text-[#767268]">{job.progress}%</span>
                    </div>
                    <p className="line-clamp-2 break-words text-sm font-semibold text-[#17171f]">
                      {job.projectTitle || job.summary.projectTitle || job.rfpFileName}
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-xs text-[#767268]">
                      RFP: {job.rfpFileName} · {formatFileSize(job.rfpFileSize)}
                    </p>
                    {job.taskFileName && <p className="mt-0.5 line-clamp-1 break-words text-xs text-[#767268]">과업: {job.taskFileName}</p>}
                  </div>

                  <div className="min-w-0">{renderResultSummary(job)}</div>

                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-xs text-[#767268] xl:text-right">다운로드 {job.downloadCount.toLocaleString('ko-KR')}회</p>
                    <button
                      type="button"
                      disabled={!job.hasRfpFile || inputDownloadingId === job.id}
                      onClick={() => void handleInputDownload(job.id)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#ddd8ce] bg-white px-3 text-xs font-semibold text-[#35332e] hover:bg-[#f2f0eb] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {inputDownloadingId === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      RFP 다운로드
                    </button>
                    <button
                      type="button"
                      disabled={!canDownload || downloadingId === job.id}
                      onClick={() => void handleDownload(job.id)}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#17171f] px-4 text-xs font-semibold text-white hover:bg-[#272733] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {downloadingId === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      HTML 다운로드
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={Boolean(job.userDeletedAt) || softDeleting || hardDeleting || bulkDeleting}
                        onClick={() => void handleSoftDelete(job)}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {softDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        {job.userDeletedAt ? '삭제됨' : '삭제'}
                      </button>
                      <button
                        type="button"
                        disabled={softDeleting || hardDeleting || bulkDeleting}
                        onClick={() => void handleHardDelete(job)}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {hardDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        완전삭제
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#e8e4dc] px-5 py-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#ddd8ce] bg-white px-3 text-xs font-semibold text-[#35332e] hover:bg-[#f2f0eb] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>
          <span className="text-xs text-[#767268]">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#ddd8ce] bg-white px-3 text-xs font-semibold text-[#35332e] hover:bg-[#f2f0eb] disabled:cursor-not-allowed disabled:opacity-45"
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rfp-analysis-user-modal-title"
          onMouseDown={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-lg rounded-[24px] border border-[#e1ddd4] bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#767268]">회원정보</p>
                <h2 id="rfp-analysis-user-modal-title" className="mt-1 text-xl font-bold text-[#17171f]">
                  {selectedUser.name || selectedUser.email || selectedUser.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ddd8ce] text-[#5f5b52] hover:bg-[#f2f0eb]"
                aria-label="회원정보 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              {[
                ['회원 ID', selectedUser.id],
                ['이름', selectedUser.name || '-'],
                ['이메일', selectedUser.email || '-'],
                ['회사명', selectedUser.company || '-'],
                ['연락처', selectedUser.phone || '-'],
                ['권한', roleLabel(selectedUser.role)],
                ['적립금', formatWon(selectedUser.rewardBalance)],
                ['가입일', formatDateTime(selectedUser.createdAt)],
                ['탈퇴일', formatDateTime(selectedUser.deletedAt)],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-2 rounded-xl border border-[#eeeae2] bg-[#fbfaf7] px-4 py-3 sm:grid-cols-[96px_1fr]">
                  <p className="text-xs font-semibold text-[#767268]">{label}</p>
                  <p className="min-w-0 break-words font-medium text-[#17171f]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
