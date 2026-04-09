'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Save, Eye, EyeOff, Trash2, X, Loader2,
  Building2, Calendar, DollarSign, FileText, Phone, Link as LinkIcon,
  AlertTriangle, Tag,
} from 'lucide-react'

// ===========================
// Types
// ===========================

interface AnnouncementForm {
  title: string
  organization: string
  type: 'government' | 'private' | 'poc'
  budget: string
  start_date: string
  end_date: string
  application_method: string
  target: string
  description: string
  eligibility: string
  department: string
  contact: string
  source_url: string
  is_published: boolean
  status: 'active' | 'closed'
}

const EMPTY_FORM: AnnouncementForm = {
  title: '',
  organization: '',
  type: 'government',
  budget: '',
  start_date: '',
  end_date: '',
  application_method: '',
  target: '',
  description: '',
  eligibility: '',
  department: '',
  contact: '',
  source_url: '',
  is_published: true,
  status: 'active',
}

const TYPE_LABELS: Record<string, string> = {
  government: '정부지원',
  private: '민간',
  poc: 'PoC',
}

// ===========================
// Toast
// ===========================

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm">
        {message}
        <button onClick={onClose} className="text-gray-300 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ===========================
// Delete Confirmation Modal
// ===========================

function DeleteModal({
  title,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-foreground">공고 삭제</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          &apos;{title}&apos;을(를) 삭제하시겠습니까?
          <br />
          <span className="text-red-600 font-medium">삭제 후 복구할 수 없습니다.</span>
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 border border-border/50 text-foreground text-sm font-semibold rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Main Page
// ===========================

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
  }

  // Load announcement
  useEffect(() => {
    if (!isNew) {
      const fetchAnnouncement = async () => {
        try {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (error) throw new Error(error.message)
          if (data) {
            setForm({
              title: data.title || '',
              organization: data.organization || '',
              type: data.type || 'government',
              budget: data.budget || '',
              start_date: data.start_date || '',
              end_date: data.end_date || '',
              application_method: data.application_method || '',
              target: data.target || '',
              description: data.description || '',
              eligibility: data.eligibility || '',
              department: data.department || '',
              contact: data.contact || '',
              source_url: data.source_url || '',
              is_published: data.is_published || false,
              status: data.status || 'active',
            })
          }
        } catch (e) {
          showToast(e instanceof Error ? e.message : '공고를 불러오는 중 오류가 발생했습니다')
        } finally {
          setLoading(false)
        }
      }

      fetchAnnouncement()
    }
  }, [id, isNew])

  const updateField = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.organization.trim()) {
      showToast('공고명과 기관명은 필수입니다')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      if (isNew) {
        const { error } = await supabase.from('announcements').insert([form])
        if (error) throw new Error(error.message)
        showToast('공고가 등록되었습니다')
      } else {
        const { error } = await supabase.from('announcements').update(form).eq('id', id)
        if (error) throw new Error(error.message)
        showToast('공고가 수정되었습니다')
      }

      setTimeout(() => router.push('/admin/announcements'), 1500)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], permanent: false }),
      })

      if (!res.ok) throw new Error('삭제 실패')
      showToast('공고가 삭제되었습니다')
      setTimeout(() => router.push('/admin/announcements'), 1500)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const inputClass = 'w-full px-4 py-2.5 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition'
  const labelClass = 'block text-sm font-semibold text-foreground mb-1.5'
  const sectionClass = 'p-6 space-y-5 border-b border-border/50 last:border-0'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/announcements"
            className="w-9 h-9 rounded-xl border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tag className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {isNew ? '공고 등록' : '공고 수정'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              onClick={() => updateField('is_published', !form.is_published)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                form.is_published
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'bg-red-100/50 text-red-600 hover:bg-red-100'
              }`}
            >
              {form.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {form.is_published ? '공개' : '비공개'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
        {/* Basic Info Section */}
        <div className={sectionClass}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-muted-foreground" />
            기본 정보
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 공고명 */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                <span className="flex items-center gap-1">공고명 *</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="공고명을 입력하세요"
                className={inputClass}
              />
            </div>

            {/* 기관명 */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  기관명 *
                </span>
              </label>
              <input
                type="text"
                value={form.organization}
                onChange={(e) => updateField('organization', e.target.value)}
                placeholder="기관명을 입력하세요"
                className={inputClass}
              />
            </div>

            {/* 유형 */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1">유형</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value as 'government' | 'private' | 'poc')}
                className={inputClass}
              >
                <option value="government">정부지원</option>
                <option value="private">민간</option>
                <option value="poc">PoC</option>
              </select>
            </div>

            {/* 사업 규모 */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  사업 규모
                </span>
              </label>
              <input
                type="text"
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                placeholder="예: 3억원"
                className={inputClass}
              />
            </div>

            {/* 상태 */}
            <div className="md:col-span-2">
              <label className={labelClass}>상태</label>
              <button
                type="button"
                onClick={() => updateField('status', form.status === 'active' ? 'closed' : 'active')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors w-full ${
                  form.status === 'active'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-muted border-border/50 text-muted-foreground'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${form.status === 'active' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                {form.status === 'active' ? '모집중' : '마감'}
              </button>
            </div>
          </div>
        </div>

        {/* Period & Method Section */}
        <div className={sectionClass}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            접수 정보
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 접수 시작일 */}
            <div>
              <label className={labelClass}>접수 시작일</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 접수 종료일 */}
            <div>
              <label className={labelClass}>접수 종료일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className={inputClass}
              />
            </div>

            {/* 접수방법 */}
            <div className="md:col-span-2">
              <label className={labelClass}>접수방법</label>
              <input
                type="text"
                value={form.application_method}
                onChange={(e) => updateField('application_method', e.target.value)}
                placeholder="접수방법을 입력하세요"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className={sectionClass}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-muted-foreground" />
            상세 정보
          </h2>

          {/* 지원대상 */}
          <div>
            <label className={labelClass}>지원대상</label>
            <input
              type="text"
              value={form.target}
              onChange={(e) => updateField('target', e.target.value)}
              placeholder="지원대상을 입력하세요"
              className={inputClass}
            />
          </div>

          {/* 지원내용 */}
          <div>
            <label className={labelClass}>지원내용</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="지원내용을 상세히 입력하세요"
              rows={5}
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* 신청자격 */}
          <div>
            <label className={labelClass}>신청자격</label>
            <textarea
              value={form.eligibility}
              onChange={(e) => updateField('eligibility', e.target.value)}
              placeholder="신청자격을 입력하세요"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </div>
        </div>

        {/* Contact Section */}
        <div className={sectionClass}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-5">
            <Phone className="w-4 h-4 text-muted-foreground" />
            담당자 정보
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 담당부서 */}
            <div>
              <label className={labelClass}>담당부서</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="담당부서를 입력하세요"
                className={inputClass}
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className={labelClass}>연락처</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => updateField('contact', e.target.value)}
                placeholder="연락처를 입력하세요"
                className={inputClass}
              />
            </div>

            {/* 원문 링크 */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                <span className="flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  원문 URL
                </span>
              </label>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => updateField('source_url', e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex items-center justify-between pb-6">
        {!isNew && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            공고 삭제
          </button>
        )}
        {isNew && <div />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          저장
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          title={form.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleting}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
