'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSearch,
  FileText,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage-upload'
import { GLOBAL_FREE_USER_LIMIT } from '@/lib/free-access-policy'
import { useToastStore } from '@/stores/toast-store'

const MAX_TOTAL_SIZE = 50 * 1024 * 1024
const MAX_TOTAL_SIZE_LABEL = '50MB'
const GUEST_ID_STORAGE_KEY = 'presales:rfp-analysis:guest-id'
const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PDF_CONVERSION_NOTICE = 'HWP/HWPX는 PDF 변환 후 업로드'

type Slot = 'rfp' | 'task'
type StepKey = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'rendering' | 'completed' | 'failed'

interface JobStatus {
  id: string
  status: string
  progress: number
  step: string | null
  project_title: string | null
  rfp_file_name: string
  task_file_name: string | null
  error_message: string | null
}

interface DropZoneProps {
  slot: Slot
  title: string
  description: string
  required?: boolean
  file: File | null
  disabled: boolean
  onSelect: (slot: Slot, file: File) => void
  onRemove: (slot: Slot) => void
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
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

function isPdfFile(file: File) {
  return file.name.toLowerCase().endsWith('.pdf') && (!file.type || file.type === 'application/pdf')
}

function createGuestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) => {
    const value = Number(char)
    return (value ^ (Math.random() * 16 >> value / 4)).toString(16)
  })
}

function FileDropZone({ slot, title, description, required, file, disabled, onSelect, onRemove }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isRequiredSlot = slot === 'rfp'

  const handleFiles = useCallback((files: FileList | null) => {
    const selected = files?.[0]
    if (selected) onSelect(slot, selected)
  }, [onSelect, slot])

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(event.dataTransfer.files)
      }}
      className={`group relative min-h-[168px] overflow-hidden rounded-[28px] border-2 border-dashed p-5 transition-all duration-300 ${
        dragging
          ? 'border-blue-500 bg-blue-50 shadow-[0_24px_54px_-34px_rgba(37,99,235,0.65)]'
          : file
            ? 'border-blue-300 bg-blue-50/80 shadow-[0_18px_48px_-38px_rgba(37,99,235,0.7)]'
            : isRequiredSlot
              ? 'border-blue-200 bg-[linear-gradient(135deg,#ffffff_0%,#f3f7ff_100%)] hover:border-blue-300 hover:shadow-[0_18px_48px_-38px_rgba(37,99,235,0.55)]'
              : 'border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] hover:border-slate-300 hover:shadow-[0_18px_48px_-38px_rgba(15,23,42,0.35)]'
      } ${disabled ? 'opacity-60' : 'hover:-translate-y-0.5'}`}
      aria-disabled={disabled}
    >
      <div className="pointer-events-none absolute right-5 top-5 rounded-lg border border-slate-200/70 bg-white/70 px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
        {isRequiredSlot ? 'REQUIRED PDF' : 'OPTIONAL PDF'}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${
          isRequiredSlot
            ? 'border-blue-200 bg-blue-600 text-white'
            : 'border-slate-200 bg-white text-slate-700'
        }`}>
          <Upload className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pr-20">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {required && <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">필수</span>}
          </div>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
          <p className="mt-5 text-center text-xs font-medium text-slate-500">{PDF_CONVERSION_NOTICE}</p>
          {file ? (
            <div className="mt-4 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-white px-3 py-3 shadow-[0_10px_30px_-24px_rgba(37,99,235,0.85)]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(slot)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed"
                aria-label="파일 제거"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:translate-y-px disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              PDF 선택
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const steps: Array<{ key: StepKey; label: string; progress: number }> = [
  { key: 'idle', label: '업로드 대기', progress: 0 },
  { key: 'uploading', label: '파일 업로드', progress: 20 },
  { key: 'extracting', label: '원문 추출', progress: 40 },
  { key: 'analyzing', label: 'AI 분석', progress: 70 },
  { key: 'rendering', label: 'HTML 생성', progress: 90 },
  { key: 'completed', label: '완료', progress: 100 },
]

export function AiAnalysisClient() {
  const { addToast } = useToastStore()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [guestId, setGuestId] = useState<string | null>(null)
  const [rfpFile, setRfpFile] = useState<File | null>(null)
  const [taskFile, setTaskFile] = useState<File | null>(null)
  const [step, setStep] = useState<StepKey>('idle')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('RFP 제안요청서 PDF를 업로드하면 분석을 시작할 수 있습니다.')
  const [error, setError] = useState('')
  const [job, setJob] = useState<JobStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [showExamplePreview, setShowExamplePreview] = useState(false)
  const [exampleHtml, setExampleHtml] = useState('')
  const [exampleLoading, setExampleLoading] = useState(false)
  const [exampleError, setExampleError] = useState('')
  const analysisCompleted = job?.status === 'completed' || step === 'completed'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem(GUEST_ID_STORAGE_KEY)
    if (stored && GUEST_ID_RE.test(stored)) {
      setGuestId(stored.toLowerCase())
      return
    }

    const nextGuestId = createGuestId().toLowerCase()
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, nextGuestId)
    setGuestId(nextGuestId)
  }, [])

  useEffect(() => {
    if (!showExamplePreview) return
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowExamplePreview(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [showExamplePreview])

  useEffect(() => {
    if (!showExamplePreview || exampleHtml) return

    let cancelled = false
    setExampleLoading(true)
    setExampleError('')

    fetch('/rfp-analysis-report-preview.html', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('분석결과 예시를 불러오지 못했습니다.')
        return res.text()
      })
      .then((html) => {
        if (!cancelled) setExampleHtml(html)
      })
      .catch((err) => {
        if (!cancelled) setExampleError(err instanceof Error ? err.message : '분석결과 예시를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setExampleLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showExamplePreview, exampleHtml])

  const validateAndSetFile = useCallback((slot: Slot, file: File) => {
    setError('')
    if (analysisCompleted) {
      setJob(null)
      setStep('idle')
      setProgress(0)
      setStatusText('RFP 제안요청서 PDF를 업로드하면 분석을 시작할 수 있습니다.')
    }
    if (!isPdfFile(file)) {
      setError(`${slot === 'rfp' ? 'RFP 제안요청서' : '과업지시서'}는 PDF만 업로드할 수 있습니다. HWP/HWPX/DOCX 파일은 PDF로 변환해주세요.`)
      return
    }
    const nextTotal = file.size + (slot === 'rfp' ? taskFile?.size ?? 0 : rfpFile?.size ?? 0)
    if (nextTotal > MAX_TOTAL_SIZE) {
      setError(`업로드 파일 합계는 ${MAX_TOTAL_SIZE_LABEL} 이하여야 합니다.`)
      return
    }
    if (slot === 'rfp') setRfpFile(file)
    else setTaskFile(file)
  }, [analysisCompleted, rfpFile, taskFile])

  const removeFile = useCallback((slot: Slot) => {
    if (slot === 'rfp') setRfpFile(null)
    else setTaskFile(null)
    setError('')
    if (analysisCompleted) {
      setJob(null)
      setStep('idle')
      setProgress(0)
      setStatusText('RFP 제안요청서 PDF를 업로드하면 분석을 시작할 수 있습니다.')
    }
  }, [analysisCompleted])

  async function refreshJob(jobId: string) {
    const res = await fetch(`/api/rfp-analysis/jobs/${jobId}`, {
      headers: guestId ? { 'x-rfp-analysis-guest-id': guestId } : undefined,
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.job) {
      setJob(data.job)
      if (typeof data.job.progress === 'number') setProgress(data.job.progress)
      if (data.job.step) setStatusText(data.job.step)
      if (data.job.status === 'extracting') setStep('extracting')
      if (data.job.status === 'analyzing') setStep('analyzing')
      if (data.job.status === 'rendering') setStep('rendering')
      if (data.job.status === 'completed') setStep('completed')
      if (data.job.status === 'failed') {
        setStep('failed')
        setError(data.job.error_message || 'AI 분석에 실패했습니다.')
      }
    }
  }

  async function downloadReport(jobId: string) {
    const res = await fetch(`/api/rfp-analysis/jobs/${jobId}/report`, {
      headers: guestId ? { 'x-rfp-analysis-guest-id': guestId } : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      addToast(data.error || '리포트 다운로드 URL 생성에 실패했습니다', 'error')
      return
    }
    triggerBrowserDownload(data.url, data.fileName)
  }

  async function handleAnalyze() {
    const currentGuestId = guestId
    if (!rfpFile) {
      setError('RFP 제안요청서 PDF를 업로드해주세요.')
      return
    }
    if (authLoading || (!userEmail && !currentGuestId)) {
      setError('분석 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    if (running) return
    if (analysisCompleted) return

    setRunning(true)
    setError('')
    setJob(null)
    setStep('uploading')
    setProgress(8)
    setStatusText('AI 분석 작업을 생성하고 있습니다.')

    let poll: ReturnType<typeof setInterval> | null = null
    try {
      const createRes = await fetch('/api/rfp-analysis/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentGuestId ? { 'x-rfp-analysis-guest-id': currentGuestId } : {}),
        },
        body: JSON.stringify({
          rfpFile: { name: rfpFile.name, size: rfpFile.size, type: rfpFile.type },
          taskFile: taskFile ? { name: taskFile.name, size: taskFile.size, type: taskFile.type } : null,
          guestId: currentGuestId,
        }),
      })
      const created = await createRes.json()
      if (!createRes.ok) throw new Error(created.error || 'AI 분석 작업 생성에 실패했습니다')

      const jobId = created.job.id as string
      setJob(created.job)
      setStatusText('RFP PDF를 업로드하고 있습니다.')
      const rfpUpload = await uploadFile({
        bucket: created.upload.bucket,
        path: created.upload.rfpPath,
        file: rfpFile,
        contentType: 'application/pdf',
        signedToken: created.upload.rfpToken,
        upsert: true,
        onProgress: (percent) => setProgress(10 + Math.round(percent * 0.16)),
      })
      if (!rfpUpload.ok) throw new Error(rfpUpload.error)

      if (taskFile && created.upload.taskPath) {
        setStatusText('과업지시서 PDF를 업로드하고 있습니다.')
        const taskUpload = await uploadFile({
          bucket: created.upload.bucket,
          path: created.upload.taskPath,
          file: taskFile,
          contentType: 'application/pdf',
          signedToken: created.upload.taskToken,
          upsert: true,
          onProgress: (percent) => setProgress(26 + Math.round(percent * 0.08)),
        })
        if (!taskUpload.ok) throw new Error(taskUpload.error)
      }

      setStep('extracting')
      setProgress(35)
      setStatusText('업로드 완료. 원문 추출을 시작합니다.')
      poll = setInterval(() => { void refreshJob(jobId) }, 1500)

      const runRes = await fetch(`/api/rfp-analysis/jobs/${jobId}/run`, {
        method: 'POST',
        headers: currentGuestId ? { 'x-rfp-analysis-guest-id': currentGuestId } : undefined,
      })
      const runData = await runRes.json().catch(() => ({}))
      if (!runRes.ok) throw new Error(runData.error || 'AI 분석에 실패했습니다')

      await refreshJob(jobId)
      setStep('completed')
      setProgress(100)
      setStatusText('AI 분석 리포트가 완성되었습니다.')
      addToast('AI 분석 리포트가 생성되었습니다', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다'
      setStep('failed')
      setProgress(100)
      setError(message)
      setStatusText('분석에 실패했습니다.')
      addToast(message, 'error')
    } finally {
      if (poll) clearInterval(poll)
      setRunning(false)
    }
  }

  const actorReady = !authLoading && Boolean(userEmail || guestId)
  const canSubmit = Boolean(rfpFile && actorReady && !running && !analysisCompleted)
  const activeProgress = step === 'failed' ? 100 : Math.max(progress, steps.find((item) => item.key === step)?.progress ?? 0)

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f7f8fb]">
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <FileSearch className="h-3.5 w-3.5" />
                회원/비회원 무료 AI 분석 · 선착순 {GLOBAL_FREE_USER_LIMIT}명
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">AI RFP 분석</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                RFP 제안요청서를 PDF로 변환해 업로드하면 원문 근거 기반 HTML 분석 리포트를 생성합니다.
                본 분석결과는 프리세일즈의 전문가 노하우가 적용된 AI 가 분석하여 파일을 제공해드립니다.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowExamplePreview(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Eye className="h-4 w-4" />
                분석결과 예시
              </button>
              <Link
                href="/mypage"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                나의콘솔
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-stretch gap-6 px-4 py-6 md:px-8 lg:grid-cols-[1fr_420px]">
        <div className="flex min-h-0 flex-col gap-5">
          {!authLoading && !userEmail && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">비회원도 AI 분석을 이용할 수 있습니다.</p>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  비회원 리포트는 현재 화면에서 다운로드할 수 있습니다.
                  <br />
                  회원만 나의콘솔에 분석결과가 보관됩니다.
                </p>
                <Link href="/auth/login?redirect=/ai-analysis" className="mt-1 inline-flex text-xs font-semibold text-blue-900 underline">
                  로그인하고 보관하기
                </Link>
              </div>
            </div>
          )}

          <div className="flex min-h-[560px] flex-1 flex-col rounded-[32px] border border-blue-100 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(37,99,235,0.55)]">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.9)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Upload desk</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">파일 접수</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
                    이 영역은 PDF 원문을 받는 접수대입니다. PDF 원문에서 확인된 문장과 페이지 근거가 있는 항목만 리포트에 표시합니다.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid flex-1 gap-4">
              <FileDropZone
                slot="rfp"
                title="RFP 제안요청서"
                description="RFP 제안요청서 PDF를 여기에 끌어오거나 선택하세요."
                required
                file={rfpFile}
                disabled={running}
                onSelect={validateAndSetFile}
                onRemove={removeFile}
              />
              <FileDropZone
                slot="task"
                title="과업지시서"
                description="과업지시서 PDF가 있으면 추가하세요."
                file={taskFile}
                disabled={running}
                onSelect={validateAndSetFile}
                onRemove={removeFile}
              />
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="flex min-h-[560px] flex-col rounded-[32px] border border-slate-800 bg-[#101827] p-5 text-white shadow-[0_30px_90px_-55px_rgba(15,23,42,0.95)] ring-1 ring-white/10 lg:sticky lg:top-20 lg:h-full lg:self-stretch">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <FileSearch className="h-5 w-5 text-blue-200" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">Analysis engine</p>
                <h2 className="mt-1 font-semibold text-white">분석 진행상태</h2>
              </div>
            </div>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300">
              LIVE
            </span>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-start justify-between gap-3 text-xs text-slate-300">
              <span className="leading-5">{statusText}</span>
              <span className="font-mono text-sm font-semibold text-white">{activeProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${step === 'failed' ? 'bg-red-400' : 'bg-blue-400'}`}
                style={{ width: `${activeProgress}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((item) => {
              const reached = activeProgress >= item.progress && step !== 'failed'
              const current = item.key === step
              return (
                <div key={item.key} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    reached
                      ? 'border-blue-400 bg-blue-400 text-[#08111f]'
                      : current
                        ? 'border-blue-300/50 bg-blue-300/10 text-blue-100'
                        : 'border-white/10 bg-white/5 text-slate-500'
                  }`}>
                    {current && running ? <Loader2 className="h-4 w-4 animate-spin" /> : reached ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <span className={`text-sm ${current ? 'font-semibold text-white' : reached ? 'text-blue-100' : 'text-slate-400'}`}>{item.label}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-auto pt-6">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleAnalyze}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(59,130,246,0.95)] transition-all hover:bg-blue-400 active:translate-y-px disabled:cursor-not-allowed disabled:bg-white/18 disabled:text-white/55 disabled:shadow-none"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            {running ? '분석 중' : 'AI 분석 시작'}
          </button>

          {job?.status === 'completed' && (
            <button
              type="button"
              onClick={() => downloadReport(job.id)}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/40 bg-white text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
              HTML 보고서 다운로드
            </button>
          )}

          <p className="mt-4 text-xs leading-6 text-slate-400">
            {userEmail
              ? '완성된 리포트는 나의콘솔의 내 AI 분석 리포트에서도 다시 다운로드할 수 있습니다.'
              : (
                <>
                  비회원 리포트는 현재 화면에서 다운로드할 수 있습니다.
                  <br />
                  회원만 나의콘솔에 분석결과가 보관됩니다.
                </>
              )}
          </p>
          </div>
        </aside>
      </section>

      {showExamplePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rfp-analysis-example-title"
          onClick={() => setShowExamplePreview(false)}
        >
          <div
            className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
              <div className="min-w-0">
                <h2 id="rfp-analysis-example-title" className="truncate text-sm font-semibold text-foreground md:text-base">
                  분석결과 예시
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  실제 발주기관, 담당자, 연락처, 사업 내용은 모두 가상화한 샘플입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExamplePreview(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="분석결과 예시 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 bg-[#eef2f7]">
              {exampleLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  분석결과 예시를 불러오는 중입니다.
                </div>
              )}
              {exampleError ? (
                <div className="flex w-full items-center justify-center p-6">
                  <div className="max-w-sm rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    {exampleError}
                  </div>
                </div>
              ) : (
                <iframe
                  title="분석결과 예시 리포트"
                  srcDoc={exampleHtml}
                  sandbox=""
                  className="h-full w-full flex-1 border-0 bg-[#eef2f7]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
