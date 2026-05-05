'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSearch,
  FileText,
  Loader2,
  Lock,
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

function FileDropZone({ slot, title, description, required, file, disabled, onSelect, onRemove }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      className={`rounded-2xl border border-dashed p-5 transition-colors ${
        dragging
          ? 'border-primary bg-primary/5'
          : file
            ? 'border-blue-200 bg-blue-50/60'
            : 'border-border bg-card'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {required && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">필수</span>}
          </div>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
          {file ? (
            <div className="mt-4 flex min-w-0 items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-3 py-3">
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
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed"
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
  const router = useRouter()
  const { addToast } = useToastStore()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
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
    const res = await fetch(`/api/rfp-analysis/jobs/${jobId}`)
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
    const res = await fetch(`/api/rfp-analysis/jobs/${jobId}/report`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      addToast(data.error || '리포트 다운로드 URL 생성에 실패했습니다', 'error')
      return
    }
    triggerBrowserDownload(data.url, data.fileName)
  }

  async function handleAnalyze() {
    if (!userEmail) {
      router.push('/auth/login?redirect=/ai-analysis')
      return
    }
    if (!rfpFile) {
      setError('RFP 제안요청서 PDF를 업로드해주세요.')
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfpFile: { name: rfpFile.name, size: rfpFile.size, type: rfpFile.type },
          taskFile: taskFile ? { name: taskFile.name, size: taskFile.size, type: taskFile.type } : null,
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
          upsert: true,
          onProgress: (percent) => setProgress(26 + Math.round(percent * 0.08)),
        })
        if (!taskUpload.ok) throw new Error(taskUpload.error)
      }

      setStep('extracting')
      setProgress(35)
      setStatusText('업로드 완료. 원문 추출을 시작합니다.')
      poll = setInterval(() => { void refreshJob(jobId) }, 1500)

      const runRes = await fetch(`/api/rfp-analysis/jobs/${jobId}/run`, { method: 'POST' })
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

  const canSubmit = Boolean(rfpFile && userEmail && !running && !analysisCompleted)
  const activeProgress = step === 'failed' ? 100 : Math.max(progress, steps.find((item) => item.key === step)?.progress ?? 0)

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f7f8fb]">
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <FileSearch className="h-3.5 w-3.5" />
                회원 무료 AI 분석 · 선착순 {GLOBAL_FREE_USER_LIMIT}명
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

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          {!authLoading && !userEmail && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">로그인 후 이용할 수 있습니다.</p>
                <Link href="/auth/login?redirect=/ai-analysis" className="mt-1 inline-flex text-xs font-semibold text-amber-900 underline">
                  로그인하기
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="mb-5 flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">분석 기준</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  PDF 원문에서 확인된 문장과 페이지 근거가 있는 항목만 리포트에 표시합니다. HWP/HWPX 파일은 PDF로 변환한 뒤 업로드해주세요.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
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

        <aside className="rounded-2xl border border-border/50 bg-card p-5 lg:sticky lg:top-20 lg:self-start">
          <div className="mb-5 flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">분석 진행상태</h2>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{statusText}</span>
              <span>{activeProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${step === 'failed' ? 'bg-red-500' : 'bg-primary'}`}
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
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${reached ? 'bg-primary text-primary-foreground' : current ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {current && running ? <Loader2 className="h-4 w-4 animate-spin" /> : reached ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </div>
                  <span className={`text-sm ${current ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleAnalyze}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            {running ? '분석 중' : 'AI 분석 시작'}
          </button>

          {job?.status === 'completed' && (
            <button
              type="button"
              onClick={() => downloadReport(job.id)}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Download className="h-4 w-4" />
              HTML 보고서 다운로드
            </button>
          )}

          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            완성된 리포트는 나의콘솔의 내 AI 분석 리포트에서도 다시 다운로드할 수 있습니다.
          </p>
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
