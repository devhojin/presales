'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock, Video, FileText, Star, Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

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
    if (f.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.')
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
    setSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      // Upload file if exists
      let fileUrl = ''
      if (file) {
        const fileName = `inquiry-${Date.now()}-${file.name}`
        const { error: uploadErr } = await supabase.storage.from('product-previews').upload(fileName, file)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('product-previews').getPublicUrl(fileName)
          fileUrl = urlData.publicUrl
        }
      }

      const messageWithFile = fileUrl
        ? `${form.message}\n\n[첨부파일] ${fileUrl}`
        : form.message

      const { error: insertErr } = await supabase.from('consulting_requests').insert({
        name: form.name,
        phone: form.phone,
        email: form.email,
        company: form.company || null,
        package_type: form.package_type,
        message: messageWithFile || null,
        status: 'pending',
      })

      if (insertErr) throw insertErr
      setSubmitted(true)
    } catch (err: any) {
      setError('제출 실패: ' + (err.message || '오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const pkgOptions = [
    { value: 'spot', label: '스팟 상담 (150,000원 / 30분)' },
    { value: 'review', label: '제안서 리뷰 패키지 (500,000원 / 건)' },
    { value: 'project', label: '프로젝트 컨설팅 (3,000,000원~ / 프로젝트)' },
  ]

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
  const labelClass = "block text-xs font-medium text-gray-600 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">컨설팅 문의</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">문의가 접수되었습니다</h3>
            <p className="text-sm text-gray-500 mb-6">24시간 이내에 담당자가 연락드리겠습니다.</p>
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
                  <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.package_type === opt.value ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="package_type"
                      value={opt.value}
                      checked={form.package_type === opt.value}
                      onChange={e => setForm({ ...form, package_type: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
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
              <label className={labelClass}>회사명 <span className="text-gray-400">(선택)</span></label>
              <input type="text" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="(주)OO기업" className={inputClass} />
            </div>

            {/* 문의 내용 */}
            <div>
              <label className={labelClass}>문의 내용</label>
              <textarea rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="입찰 준비 상황, 제안서 관련 질문 등을 자유롭게 작성해주세요." className={inputClass} />
            </div>

            {/* 첨부파일 (선택) */}
            <div>
              <label className={labelClass}>첨부파일 <span className="text-gray-400">(선택, RFP/사업계획서, 10MB 이하)</span></label>
              <div className="relative">
                <input type="file" accept=".pdf,.doc,.docx,.hwp,.pptx,.ppt,.xlsx,.xls,.zip" onChange={handleFileChange} className="hidden" id="inquiry-file" />
                <label htmlFor="inquiry-file" className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{file ? file.name : '파일 선택 (PDF, DOC, HWP, PPT, XLS, ZIP)'}</span>
                </label>
                {file && (
                  <button type="button" onClick={() => setFile(null)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
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
  { label: '제안서 리뷰 (정성적 제안서)', spot: false, review: true, project: true },
  { label: '평가항목별 점수 예측', spot: false, review: true, project: true },
  { label: '수정 방향 리포트 (10p)', spot: false, review: true, project: true },
  { label: '1회 재리뷰', spot: false, review: true, project: true },
  { label: '전담 컨설턴트 배정', spot: false, review: false, project: true },
  { label: '입찰공고 분석 및 전략 수립', spot: false, review: false, project: true },
  { label: '제안서 공동 작성/코칭', spot: false, review: false, project: true },
  { label: '발표 PT 리허설', spot: false, review: false, project: true },
  { label: '프로젝트 완료 후 30일 지원', spot: false, review: false, project: true },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-blue-600 mx-auto" />
  if (value === false) return <X className="w-5 h-5 text-gray-300 mx-auto" />
  return <span className="text-sm font-medium text-blue-600">{value}</span>
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
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 mb-4">
          전문가 컨설팅
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          공공조달, 혼자 하지 마세요
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          나라장터·조달청 입찰 경험이 풍부한 전문가가
          제안서 작성부터 발표까지 함께합니다.
        </p>
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
                  상담 신청하기
                </button>
              </div>
            ))}
      </div>

      {/* Compare Table - Google AI Plans style */}
      {!loading && packages.length >= 3 && (
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-xl font-bold text-center mb-2">요금 비교</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">상위 패키지는 하위 패키지의 모든 기능을 포함합니다</p>

          <div className="border border-border rounded-2xl overflow-hidden">
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
                className={`grid grid-cols-4 ${i % 2 === 0 ? 'bg-white' : 'bg-muted/20'} ${i < compareFeatures.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="p-3.5 border-r border-border/50 flex items-center">
                  <p className="text-sm text-gray-700">{feat.label}</p>
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
                    className={`w-full h-9 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                      pkg?.is_best
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-white hover:bg-muted'
                    }`}
                  >
                    선택하기
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Process */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">진행 프로세스</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: FileText, step: '01', title: '신청', desc: '온라인 폼 작성' },
            { icon: Clock, step: '02', title: '매칭', desc: '24시간 내 전문가 배정' },
            { icon: Video, step: '03', title: '컨설팅', desc: '화상/대면 미팅 진행' },
            { icon: Star, step: '04', title: '완료', desc: '리포트 및 후속 지원' },
          ].map((item) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground font-medium">STEP {item.step}</div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
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
