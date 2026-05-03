'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock, Factory, FileSearch, FileText, Layers3, Loader2, Mic, ShieldCheck, Sparkles, Star, Target, Trophy, Upload, Video, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useDraggableModal } from '@/hooks/useDraggableModal'
import { CONSULTING_PACKAGES, INDUSTRY_CONSULTING_PRICE_FLOOR_WON, formatWonShort } from '@/lib/constants'
import { uploadFile } from '@/lib/storage-upload'

const CONSULTING_MAX_FILE_SIZE = 1024 * 1024 * 1024 // 1GB

// ===========================
// Consulting Inquiry Modal
// ===========================

function InquiryModal({ isOpen, onClose, initialPackage }: { isOpen: boolean; onClose: () => void; initialPackage: string }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    package_type: initialPackage || 'spot',
    message: '',
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const { handleMouseDown, modalStyle } = useDraggableModal()

  // 로그인 회원이면 이름/이메일 자동 채우기
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        supabase.from('profiles').select('name, email').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) {
              setForm(f => ({
                ...f,
                name: f.name || data.name || '',
                email: f.email || data.email || '',
              }))
            }
          })
      }
    })
  }, [])

  useEffect(() => {
    if (isOpen) {
      setForm(f => ({ ...f, package_type: initialPackage || 'spot' }))
      setSubmitted(false)
      setError('')
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, initialPackage])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > CONSULTING_MAX_FILE_SIZE) {
      setError('파일 크기는 1GB 이하여야 합니다.')
      return
    }
    setError('')
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.email) {
      setError('이름, 연락처, 이메일은 필수입니다.')
      return
    }
    if (!form.message.trim()) {
      setError('문의 내용을 입력해주세요.')
      return
    }
    // 길이 방어 (DB CHECK 제약과 동일한 상한). 서버 제약에 걸리기 전에 명확한 메시지.
    if (form.name.length > 100) { setError('이름이 너무 깁니다 (최대 100자).'); return }
    if (form.email.length > 254) { setError('이메일이 너무 깁니다.'); return }
    if (form.phone.length > 50) { setError('연락처가 올바르지 않습니다.'); return }
    if (form.company.length > 200) { setError('회사명이 너무 깁니다 (최대 200자).'); return }
    if (form.message.length > 20000) { setError('문의 내용이 너무 깁니다 (최대 20,000자).'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('올바른 이메일 형식이 아닙니다.'); return
    }
    setSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      // Upload file if exists — uploadFile() 은 6MB 초과 시 자동 TUS resumable (최대 50GB)
      // 저장 형식: "[첨부파일:{storage_path}]" — 표시 시점 관리자가 서명 URL 재발급.
      let attachmentMarker = ''
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileName = `inquiry-${Date.now()}-${safeName}`
        const result = await uploadFile({
          bucket: 'consulting-files',
          path: fileName,
          file,
          contentType: file.type,
        })
        if (result.ok) {
          attachmentMarker = `[첨부파일:${fileName}]`
        }
      }

      const messageWithFile = attachmentMarker
        ? `${form.message}\n\n${attachmentMarker}`
        : form.message

      const { data: insertedRows, error: insertErr } = await supabase
        .from('consulting_requests')
        .insert({
          user_id: userId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          company: form.company || null,
          package_type: form.package_type,
          message: messageWithFile || null,
          status: 'pending',
        })
        .select('id')

      if (insertErr) throw insertErr

      // 이메일 알림 발송 (비동기, 실패해도 제출 성공으로 처리)
      const newId = insertedRows?.[0]?.id
      if (newId) {
        fetch('/api/email/consulting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultingRequestId: newId }),
        }).catch(() => { /* 이메일 실패는 무시 */ })
      }

      setSubmitted(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setError('제출 실패: ' + message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const pkgOptions = Object.values(CONSULTING_PACKAGES).map((pkg) => ({
    value: pkg.value,
    label: `${pkg.name} (${pkg.priceLabel})`,
  }))

  const inputClass = "w-full px-3 py-2.5 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh]" role="dialog" aria-modal="true" aria-labelledby="consulting-modal-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 sticky top-0 bg-card rounded-t-2xl z-10 cursor-move" onMouseDown={handleMouseDown}>
          <h2 id="consulting-modal-title" className="text-lg font-bold text-foreground">컨설팅 문의</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">문의가 접수되었습니다</h3>
            <p className="text-sm text-muted-foreground mb-6">영업일 기준 24시간 이내에 담당자가 연락드리겠습니다.</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer">
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* 요금 방식 */}
            <div>
              <label className={labelClass}>요금 방식 *</label>
              <div className="space-y-2">
                {pkgOptions.map(opt => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.package_type === opt.value ? 'border-blue-500 bg-primary/5' : 'border-border hover:bg-muted'}`}>
                    <input
                      type="radio"
                      name="package_type"
                      value={opt.value}
                      checked={form.package_type === opt.value}
                      onChange={e => setForm({ ...form, package_type: e.target.value })}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 이름 */}
            <div>
              <label className={labelClass}>이름 <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="홍길동" className={inputClass} />
            </div>

            {/* 연락처 */}
            <div>
              <label className={labelClass}>연락처 <span className="text-red-500">*</span></label>
              <input type="tel" required value={form.phone} onChange={e => {
                const nums = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
                let formatted = nums
                if (nums.length > 3 && nums.length <= 7) formatted = nums.slice(0, 3) + '-' + nums.slice(3)
                else if (nums.length > 7) formatted = nums.slice(0, 3) + '-' + nums.slice(3, 7) + '-' + nums.slice(7)
                setForm({ ...form, phone: formatted })
              }} placeholder="숫자만 입력하세요" className={inputClass} />
            </div>

            {/* 이메일 */}
            <div>
              <label className={labelClass}>이메일 <span className="text-red-500">*</span></label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" className={inputClass} />
            </div>

            {/* 회사명 (선택) */}
            <div>
              <label className={labelClass}>회사명 <span className="text-muted-foreground">(선택)</span></label>
              <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="(주)OO기업" className={inputClass} />
            </div>

            {/* 문의 내용 */}
            <div>
              <label className={labelClass}>문의 내용 <span className="text-red-500">*</span></label>
              <textarea rows={4} required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="입찰 준비 상황, 제안서 관련 질문 등을 자유롭게 작성해주세요." className={inputClass} />
            </div>

            {/* 첨부파일 (선택) */}
            <div>
              <label className={labelClass}>첨부파일 <span className="text-muted-foreground">(선택, RFP/사업계획서, 1GB 이하)</span></label>
              <div className="relative">
                <input type="file" accept=".pdf,.doc,.docx,.hwp,.pptx,.ppt,.xlsx,.xls,.zip" onChange={handleFileChange} className="hidden" id="inquiry-file" />
                <label htmlFor="inquiry-file" className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-lg cursor-pointer hover:border-gray-400 hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{file ? file.name : '파일 선택 (PDF, DOC, HWP, PPT, XLS, ZIP)'}</span>
                </label>
                {file && (
                  <button type="button" onClick={() => setFile(null)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 제출 중...</> : '상담 문의하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

interface ConsultingPackage {
  slug: string
  name: string
  description: string
  price: string
  price_unit: string
  features: string[]
  is_best: boolean
  sort_order: number
}

// 비교표 기능 항목
const compareFeatures = [
  { label: '화상 미팅', spot: '30분', review: '30분', project: '무제한' },
  { label: '사전 공고/자료 검토', spot: true, review: true, project: true },
  { label: '핵심 피드백 요약', spot: true, review: true, project: true },
  { label: '이메일 후속 Q&A', spot: '1회', review: '포함', project: '무제한' },
  { label: '제안서 리뷰 (정성적 제안서)', spot: true, review: true, project: true },
  { label: '제안서 리뷰 (발표본)', spot: true, review: true, project: true },
  { label: '수정 방향 리포트', spot: true, review: true, project: true },
  { label: '1회 재리뷰', spot: false, review: true, project: true },
  { label: '전담 컨설턴트 배정', spot: false, review: false, project: true },
  { label: '입찰공고 분석 및 전략 수립', spot: false, review: false, project: true },
  { label: '제안서 공동 작성/코칭 (비상주)', spot: false, review: false, project: true },
  { label: '발표 PT 리허설', spot: false, review: false, project: true },
  { label: '프로젝트 완료 후 30일 지원', spot: false, review: false, project: true },
]

const heroStats = [
  { value: '24h', label: '영업일 기준 1차 응답' },
  { value: '4단계', label: 'RFP 분석부터 제출 전 검수' },
  { value: '1:1', label: '자료 기반 맞춤 리뷰' },
]

const riskSignals = [
  {
    icon: FileSearch,
    title: 'RFP는 읽었지만 구조가 안 잡힐 때',
    body: '과업 범위, 평가항목, 제출물을 분리해 제안서 목차와 대응표로 바꿉니다.',
  },
  {
    icon: AlertTriangle,
    title: '마감이 가까운데 누락이 불안할 때',
    body: '참가자격, 증빙, 파일명, 가격서 분리, PDF 상태까지 제출 전 위험을 점검합니다.',
  },
  {
    icon: Layers3,
    title: '기존 제안서를 재사용해야 할 때',
    body: '그대로 붙여넣기보다 이번 공고의 평가 언어에 맞게 메시지와 순서를 재배치합니다.',
  },
]

const consultingOutputs = [
  'RFP 핵심 요구사항과 평가항목 요약',
  '제안서 목차와 요구사항 대응표 방향',
  '감점 위험 문구와 누락 가능성 체크',
  '발표 PT 흐름과 예상 질의 정리',
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-primary mx-auto" />
  if (value === false) return <X className="w-5 h-5 text-gray-300 mx-auto" />
  return <span className="text-sm font-medium text-primary">{value}</span>
}

export default function ConsultingPage() {
  const [packages, setPackages] = useState<ConsultingPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showInquiry, setShowInquiry] = useState(false)
  const [inquiryPackage, setInquiryPackage] = useState('spot')

  const openInquiry = (slug: string) => {
    setInquiryPackage(slug)
    setShowInquiry(true)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('consulting_packages')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPackages(data)
        setLoading(false)
      })
  }, [])

  const spot = packages.find(p => p.slug === 'spot')
  const review = packages.find(p => p.slug === 'review')
  const project = packages.find(p => p.slug === 'project')

  return (
    <main className="overflow-x-hidden bg-[#F5F7FA] text-foreground">
      <section className="relative min-h-[760px] overflow-hidden bg-[#07111F] text-white md:min-h-[720px]">
        <Image
          src="/images/consulting-strategy-room-gemini.webp"
          alt="공공조달 제안서 컨설팅 전략 회의"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.98)_0%,rgba(7,17,31,0.9)_36%,rgba(7,17,31,0.42)_70%,rgba(7,17,31,0.2)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.18)_0%,rgba(7,17,31,0.24)_66%,#F5F7FA_100%)]" />

        <div className="relative z-10 mx-auto grid min-h-[760px] max-w-[1240px] gap-10 px-4 pb-24 pt-20 md:min-h-[720px] md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pt-24">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/78 backdrop-blur-md">
              PRESALES CONSULTING
            </p>
            <h1 className="max-w-3xl text-[2.55rem] font-black leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
              <span className="block whitespace-nowrap">제안서가 아니라</span>
              <span className="block whitespace-nowrap">평가 대응 구조를</span>
              <span className="block">점검합니다.</span>
            </h1>
            <p className="mt-6 max-w-2xl break-words text-base leading-8 text-white/74 md:text-lg">
              RFP 원문, 평가표, 기존 제안서, 발표자료를 함께 보고 이번 공고에서 바로 고쳐야 할 목차, 메시지, 증빙, 제출 리스크를 정리합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => openInquiry('review')}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#07111F] shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition-colors hover:bg-blue-50 active:scale-[0.98]"
              >
                제안서 리뷰 문의
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => openInquiry('spot')}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/24 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/16 active:scale-[0.98]"
              >
                스팟 상담 시작
              </button>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div key={item.label} className="border-y border-white/18 py-4">
                  <p className="text-2xl font-black tabular-nums text-white">{item.value}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/58">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="self-end md:pb-10">
            <div className="ml-auto max-w-md border border-white/14 bg-white/10 p-5 shadow-[0_26px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-blue-100/72">REVIEW SCOPE</p>
              <div className="mt-5 grid gap-3">
                {consultingOutputs.map((item) => (
                  <div key={item} className="flex gap-3 border-t border-white/12 pt-3 text-sm leading-6 text-white/82">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-white/48">
                컨설팅은 낙찰이나 평가점수를 보장하지 않습니다. 대신 제출 전에 확인해야 할 구조와 리스크를 명확히 드러냅니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <section className="relative z-10 -mt-16 mb-16 grid gap-4 md:grid-cols-3">
          {riskSignals.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="min-w-0 border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-5 break-words text-lg font-bold tracking-tight">{item.title}</h2>
                <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">{item.body}</p>
              </article>
            )
          })}
        </section>

        <section className="mx-auto mb-20 grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">OPERATING MODEL</p>
            <h2 className="mt-3 break-words text-3xl font-black leading-tight tracking-tight md:text-4xl">
              공고 해석, 제안서 리뷰, 발표 준비를 한 흐름으로 봅니다.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: ClipboardCheck, title: '평가표 대응', body: '평가항목별로 본문 위치와 증빙 근거를 연결합니다.' },
              { icon: FileText, title: '본문 구조', body: '기술 설명을 평가자가 읽는 순서에 맞게 재배치합니다.' },
              { icon: ShieldCheck, title: '제출 리스크', body: '누락 서류, 파일 형식, 가격서 분리, 위험 문구를 확인합니다.' },
              { icon: Mic, title: '발표 흐름', body: '제안 메시지, 예상 질의, 핵심 장표 순서를 점검합니다.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="min-w-0 border-t border-slate-200 pt-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 break-words text-base font-bold">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-7 text-muted-foreground">{item.body}</p>
                </article>
              )
            })}
          </div>
        </section>

      {/* Package Cards - equal height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-6 space-y-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded w-2/5" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 bg-muted rounded w-full" />
                  ))}
                </div>
                <div className="h-10 bg-muted rounded w-full" />
              </div>
            ))
          : packages.map((pkg) => (
              <div
                key={pkg.slug}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  pkg.is_best
                    ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary'
                    : 'border-border'
                }`}
              >
                {pkg.is_best && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    BEST
                  </Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-2xl font-bold text-primary">{pkg.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{pkg.price_unit}</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => openInquiry(pkg.slug)}
                  className={`w-full h-10 rounded-lg font-medium text-sm transition-colors mt-6 cursor-pointer ${
                    pkg.is_best
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  상담 문의하기
                </button>
              </div>
            ))}
      </div>

      {/* Compare Table - Google AI Plans style */}
      {!loading && packages.length >= 3 && (
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-xl font-bold text-center mb-2">요금 비교</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">상위 패키지는 하위 패키지의 모든 기능을 포함합니다</p>

          {/* Desktop: Table View */}
          <div className="hidden md:block border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 bg-muted/50">
              <div className="p-4 border-r border-border">
                <p className="text-sm font-semibold text-muted-foreground">기능</p>
              </div>
              {[spot, review, project].map((pkg) => (
                <div key={pkg?.slug || ''} className={`p-4 text-center ${pkg?.slug === 'review' ? 'bg-primary/5 border-x border-primary/20' : ''}`}>
                  {pkg?.is_best && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">BEST</Badge>
                  )}
                  <p className="font-bold text-sm">{pkg?.name || ''}</p>
                  <p className="text-primary font-bold text-lg mt-1">{pkg?.price || ''}</p>
                  <p className="text-xs text-muted-foreground">{pkg?.price_unit || ''}</p>
                </div>
              ))}
            </div>

            {/* Feature Rows */}
            {compareFeatures.map((feat, i) => (
              <div
                key={feat.label}
                className={`grid grid-cols-4 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'} ${i < compareFeatures.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="p-3.5 border-r border-border/50 flex items-center">
                  <p className="text-sm text-foreground">{feat.label}</p>
                </div>
                <div className={`p-3.5 flex items-center justify-center`}>
                  <FeatureCell value={feat.spot} />
                </div>
                <div className={`p-3.5 flex items-center justify-center bg-primary/[0.02] border-x border-primary/10`}>
                  <FeatureCell value={feat.review} />
                </div>
                <div className={`p-3.5 flex items-center justify-center`}>
                  <FeatureCell value={feat.project} />
                </div>
              </div>
            ))}

            {/* Bottom CTA row */}
            <div className="grid grid-cols-4 bg-muted/30 border-t border-border">
              <div className="p-4" />
              {[spot, review, project].map((pkg) => (
                <div key={pkg?.slug || ''} className={`p-4 flex items-center justify-center ${pkg?.slug === 'review' ? 'bg-primary/5 border-x border-primary/20' : ''}`}>
                  <button
                    onClick={() => pkg?.slug && openInquiry(pkg.slug)}
                    className="w-full h-9 rounded-lg font-medium text-xs transition-all cursor-pointer border border-primary/30 bg-card text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md"
                  >
                    이 플랜으로 시작하기
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Card View */}
          <div className="md:hidden space-y-6">
            {[spot, review, project].map((pkg) => {
              if (!pkg) return null
              const slugKey = pkg.slug as 'spot' | 'review' | 'project'
              return (
                <div
                  key={pkg.slug}
                  className={`rounded-xl border p-5 ${pkg.is_best ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border'}`}
                >
                  <div className="text-center mb-4">
                    {pkg.is_best && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] mb-2">BEST</Badge>
                    )}
                    <p className="font-bold text-base">{pkg.name}</p>
                    <p className="text-primary font-bold text-xl mt-1">{pkg.price}</p>
                    <p className="text-xs text-muted-foreground">{pkg.price_unit}</p>
                  </div>
                  <div className="space-y-2.5">
                    {compareFeatures.map((feat) => {
                      const val = feat[slugKey]
                      if (val === false) return null
                      return (
                        <div key={feat.label} className="flex items-center gap-2.5 text-sm">
                          {val === true ? (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <span className="text-xs font-medium text-primary shrink-0 min-w-[40px]">{val}</span>
                          )}
                          <span className="text-foreground">{feat.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => openInquiry(pkg.slug)}
                    className={`w-full h-11 rounded-lg font-medium text-sm transition-colors mt-5 cursor-pointer ${
                      pkg.is_best
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    이 플랜으로 시작하기
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===========================
          3. 성공 사례 / 소셜 프루프 섹션
          =========================== */}
      <div className="max-w-5xl mx-auto mb-20">
        <h2 className="text-xl font-bold text-center mb-2">함께한 기업들의 이야기</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">비식별 수행 사례를 바탕으로 한 컨설팅 방향</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Case 1: ITS */}
          <div className="rounded-2xl bg-[#0C1220] p-6 border border-blue-900/30 hover:border-blue-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">수도권 광역시 ITS 유지관리 용역</h3>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-4">
              3주 일정 안에서 공고 분석, 목차 재정리, 발표 리허설까지 단계별로 점검해 평가 대응 구조를 정리했습니다.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium">
              <Trophy className="w-3 h-3" />
              평가 대응 구조화
            </span>
          </div>

          {/* Case 2: AI 도시 데이터 관제 */}
          <div className="rounded-2xl bg-[#0C1220] p-6 border border-blue-900/30 hover:border-blue-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">AI 도시 데이터 통합 관제 플랫폼</h3>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-4">
              민원, CCTV, IoT 센서 데이터를 하나의 운영 시나리오로 묶고 서비스 개념도와 단계별 구축 로드맵을 평가표에 맞춰 재구성했습니다.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-[11px] font-medium">
              <Sparkles className="w-3 h-3" />
              AI 관제 구조화
            </span>
          </div>

          {/* Case 3: 스마트공장 */}
          <div className="rounded-2xl bg-[#0C1220] p-6 border border-blue-900/30 hover:border-blue-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-5">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">반도체 기업 스마트공장 구축</h3>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-4">
              300페이지 규모의 기술제안서를 2주 안에 구조화. PM 경험을 바탕으로 실행 가능성 중심의 제안 전략을 수립했습니다.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium">
              <Factory className="w-3 h-3" />
              실행 전략 구조화
            </span>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          사례는 고객 정보를 비식별 처리하고 유사 유형으로 재구성했습니다. 컨설팅은 낙찰 또는 특정 평가점수를 보장하지 않습니다.
        </p>
      </div>

      {/* Process - Timeline style */}
      <div className="max-w-4xl mx-auto mb-20">
        <h2 className="text-xl font-bold text-center mb-3">진행 프로세스</h2>
        <p className="text-sm text-muted-foreground text-center mb-12">신청부터 완료까지 4단계로 진행됩니다</p>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: FileText, step: '01', title: '상담 신청', desc: '온라인 폼으로 간편하게 신청하세요. 요금 방식을 선택하고 RFP를 첨부할 수 있습니다.', color: 'from-blue-400 to-blue-500' },
              { icon: Clock, step: '02', title: '자료 확인 및 일정 조율', desc: '영업일 기준 24시간 이내에 자료 범위와 상담 일정을 먼저 확인합니다.', color: 'from-blue-500 to-blue-600' },
              { icon: Video, step: '03', title: '컨설팅 진행', desc: '화상 또는 대면 미팅으로 제안서 리뷰, 전략 수립, 코칭을 진행합니다.', color: 'from-blue-600 to-indigo-600' },
              { icon: Star, step: '04', title: '리포트 & 지원', desc: '피드백 리포트를 전달하고 후속 질의응답을 지원합니다.', color: 'from-indigo-600 to-indigo-700' },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div className={`relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} shadow-lg flex flex-col items-center justify-center mb-5`}>
                  <item.icon className="w-6 h-6 text-white mb-1" />
                  <span className="text-[10px] font-bold text-primary-foreground/80">STEP {item.step}</span>
                </div>
                {/* Arrow between steps (mobile) */}
                {i < 3 && (
                  <div className="md:hidden w-0.5 h-6 bg-blue-200 -mt-1 mb-1" />
                )}
                <h3 className="font-bold text-base mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===========================
          6. "왜 전문가 컨설팅인가?" 섹션
          =========================== */}
      <div className="max-w-5xl mx-auto mb-20">
        <h2 className="text-xl font-bold text-center mb-2">왜 전문가 컨설팅인가?</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">직접 준비하는 것과 전문가와 함께하는 것의 차이</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 가격 앵커링 */}
          <div className="rounded-2xl border border-border bg-card p-7 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-2">합리적 비용</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              컨설팅 외주 {formatWonShort(INDUSTRY_CONSULTING_PRICE_FLOOR_WON)}+ 대비, 스팟 상담은 <span className="text-primary font-semibold">{formatWonShort(CONSULTING_PACKAGES.spot.priceWon)}</span>부터.
              필요한 범위만 선택할 수 있어 과도한 외주 비용 없이 핵심 점검부터 시작할 수 있습니다.
            </p>
          </div>

          {/* 전문성 */}
          <div className="rounded-2xl border border-border bg-card p-7 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-2">감점 포인트 사전 점검</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              평가표 항목별로 감점이 발생하기 쉬운 패턴을 미리 확인합니다.
              내용이 좋아도 구성 실수로 손해 보는 상황을 줄입니다.
            </p>
          </div>

          {/* 차별화 */}
          <div className="rounded-2xl border border-border bg-card p-7 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-2">발표 리허설까지</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              제안서 작성에서 끝나지 않습니다. 발표 PT 리허설까지 함께하여
              제출 전 <span className="text-primary font-semibold">마지막 점검</span>을 돕습니다.
            </p>
          </div>
        </div>
      </div>

      </div>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={showInquiry}
        onClose={() => setShowInquiry(false)}
        initialPackage={inquiryPackage}
      />
    </main>
  )
}
