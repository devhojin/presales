'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock, Video, FileText, Star, Upload, Loader2, MessageSquare, Trophy, Sparkles, Factory, Quote, ShieldCheck, Target, Mic } from 'lucide-react'
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
            <p className="text-sm text-muted-foreground mb-6">24시간 이내에 담당자가 연락드리겠습니다.</p>
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
              <label className={labelClass}>첨부파일 <span className="text-muted-foreground">(선택, RFP/사업계획서, 10MB 이하)</span></label>
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
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Page Header */}
      <div className="py-8 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">컨설팅</h1>
        </div>
        <p className="text-muted-foreground">이번 입찰, 혼자 준비하지 마세요 — 낙찰 전략을 함께 짜는 전문가 컨설팅</p>
      </div>

      {/* ===========================
          1. Roy.Chae 전문가 프로필 섹션
          =========================== */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            {/* 이니셜 아바타 */}
            <div className="shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl font-bold text-white tracking-wide">RC</span>
            </div>

            {/* 프로필 텍스트 */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-foreground mb-1">Roy. Chae</h2>
              <p className="text-sm text-primary font-medium mb-3">공공조달 전략 컨설턴트 | Pre-sales 총괄</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                ITS·스마트시티·AI 분야에서 수십 건의 낙찰을 이끈 공공조달 전문가.
                공고 분석부터 제안서 발표까지, 수주의 전 과정을 함께합니다.
              </p>

              {/* 핵심 실적 뱃지 */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  ITS/스마트시티 수주 10건+
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Factory className="w-3.5 h-3.5" />
                  스마트팩토리 PM 경력
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 기반 신사업 기획
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===========================
          2. 전략적 메시지 섹션
          =========================== */}
      <div className="max-w-3xl mx-auto mb-20">
        <div className="relative rounded-2xl bg-[#0C1220] p-8 md:p-10">
          <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/20" />
          <div className="relative z-10 text-center space-y-4">
            <p className="text-sm md:text-base text-blue-100/90 leading-relaxed">
              대부분의 제안서는 &lsquo;기술을 설명&rsquo;합니다.
            </p>
            <p className="text-sm md:text-base text-white font-semibold leading-relaxed">
              하지만 낙찰되는 제안서는 &lsquo;평가위원을 설득&rsquo;합니다.
            </p>
            <div className="w-12 h-px bg-primary/40 mx-auto" />
            <p className="text-sm md:text-base text-blue-100/80 leading-relaxed">
              저는 평가위원이 어떤 구조에서 높은 점수를 주는지,<br className="hidden md:block" />
              어떤 표현이 감점을 유발하는지 알고 있습니다.
            </p>
            <p className="text-sm md:text-base text-white font-semibold leading-relaxed">
              그 차이를 만드는 것이 제 일입니다.
            </p>
            <p className="text-xs text-blue-300/60 mt-4 font-medium">— Roy. Chae</p>
          </div>
        </div>
      </div>

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
                  Roy.Chae에게 문의하기
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
        <p className="text-sm text-muted-foreground text-center mb-8">실제 프로젝트 기반의 컨설팅 성과</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Case 1: ITS */}
          <div className="rounded-2xl bg-[#0C1220] p-6 border border-blue-900/30 hover:border-blue-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">수도권 광역시 ITS 유지관리 용역</h3>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-4">
              3주 만에 제안서 완성. 공고 분석부터 발표 리허설까지 전 과정을 코칭하여 기술점수 1위로 낙찰.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium">
              <Trophy className="w-3 h-3" />
              기술점수 1위 낙찰
            </span>
          </div>

          {/* Case 2: AI 스마트빌리지 */}
          <div className="rounded-2xl bg-[#0C1220] p-6 border border-blue-900/30 hover:border-blue-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">경기도 스마트빌리지 AI 서비스</h3>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-4">
              AI 기반 서비스 기획부터 제안서까지 원스톱 코칭. 기술 난이도가 높은 사업에서도 평가위원이 이해할 수 있는 구조를 설계.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-[11px] font-medium">
              <Sparkles className="w-3 h-3" />
              원스톱 코칭 완료
            </span>
          </div>

          {/* Case 3: 스마트공장 */}
          <div className="rounded-2xl bg-[#0C1220] p-6 border border-blue-900/30 hover:border-blue-700/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-5">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">반도체 기업 스마트공장 구축</h3>
            <p className="text-xs text-blue-200/70 leading-relaxed mb-4">
              300페이지 기술제안서를 2주 만에 구조화. PM 경험을 바탕으로 실행 가능성 중심의 제안 전략을 수립.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium">
              <Factory className="w-3 h-3" />
              2주 만에 구조화 완료
            </span>
          </div>
        </div>
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
              { icon: Clock, step: '02', title: '전문가 매칭', desc: '24시간 이내 프로젝트에 적합한 전문가를 배정하고 일정을 조율합니다.', color: 'from-blue-500 to-blue-600' },
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
              핵심만 짚어주는 집중 상담으로 최소 비용, 최대 효과를 만듭니다.
            </p>
          </div>

          {/* 전문성 */}
          <div className="rounded-2xl border border-border bg-card p-7 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-2">감점 포인트 사전 차단</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              평가표 항목별로 감점이 발생하는 패턴을 미리 파악하고 차단합니다.
              내용이 좋아도 구성 실수로 탈락하는 일을 막습니다.
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
              수주의 <span className="text-primary font-semibold">마지막 1%</span>를 챙깁니다.
            </p>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={showInquiry}
        onClose={() => setShowInquiry(false)}
        initialPackage={inquiryPackage}
      />
    </div>
  )
}
