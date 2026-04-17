'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  Loader2,
} from 'lucide-react'

interface FaqItem {
  id: number
  category_id: number
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

interface FaqCategory {
  id: number
  name: string
  icon: string
  sort_order: number
  is_active: boolean
  faqs: FaqItem[]
}

// ===========================
// Delete Confirm Modal
// ===========================
function DeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// FAQ Edit Modal
// ===========================
function FaqEditModal({
  faq,
  categories,
  onSave,
  onCancel,
}: {
  faq: Partial<FaqItem> | null
  categories: FaqCategory[]
  onSave: (data: { category_id: number; question: string; answer: string }) => void
  onCancel: () => void
}) {
  const [categoryId, setCategoryId] = useState(faq?.category_id || categories[0]?.id || 0)
  const [question, setQuestion] = useState(faq?.question || '')
  const [answer, setAnswer] = useState(faq?.answer || '')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  const isNew = !faq?.id

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{isNew ? 'FAQ 추가' : 'FAQ 수정'}</h3>
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-muted-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">카테고리</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">질문</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="자주 묻는 질문을 입력하세요"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">답변</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="답변을 입력하세요"
              rows={5}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (!question.trim() || !answer.trim()) return
              onSave({ category_id: categoryId, question: question.trim(), answer: answer.trim() })
            }}
            disabled={!question.trim() || !answer.trim()}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Category Edit Modal
// ===========================
function CategoryEditModal({
  category,
  onSave,
  onCancel,
}: {
  category: Partial<FaqCategory> | null
  onSave: (data: { name: string; icon: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category?.name || '')
  const [icon, setIcon] = useState(category?.icon || '📄')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  const isNew = !category?.id

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg">{isNew ? '카테고리 추가' : '카테고리 수정'}</h3>
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-muted-foreground cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">아이콘 (이모지)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-20 px-3 py-2 border border-border rounded-xl text-center text-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">카테고리명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 구매/결제"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (!name.trim() || !icon.trim()) return
              onSave({ name: name.trim(), icon: icon.trim() })
            }}
            disabled={!name.trim() || !icon.trim()}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isNew ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Main Admin FAQ Page
// ===========================
export default function AdminFaqPage() {
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set())

  // Modals
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null)
  const [editingCategory, setEditingCategory] = useState<Partial<FaqCategory> | null>(null)
  const [deletingFaq, setDeletingFaq] = useState<FaqItem | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<FaqCategory | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('faq_categories')
      .select(`
        id, name, icon, sort_order, is_active,
        faqs (id, category_id, question, answer, sort_order, is_active)
      `)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'faqs' })

    if (data) {
      setCategories(data as FaqCategory[])
      if (expandedCats.size === 0) {
        setExpandedCats(new Set(data.map((c: { id: number }) => c.id)))
      }
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleExpand = (id: number) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Toggle FAQ active status
  const toggleFaqActive = async (faq: FaqItem) => {
    const { error } = await supabase.from('faqs').update({ is_active: !faq.is_active }).eq('id', faq.id)
    if (error) { alert(`FAQ 활성 변경 실패: ${error.message}`); return }
    fetchData()
  }

  // Toggle category active status
  const toggleCategoryActive = async (cat: FaqCategory) => {
    const { error } = await supabase.from('faq_categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    if (error) { alert(`카테고리 활성 변경 실패: ${error.message}`); return }
    fetchData()
  }

  // Save FAQ (create or update)
  const saveFaq = async (data: { category_id: number; question: string; answer: string }) => {
    if (editingFaq?.id) {
      const { error } = await supabase.from('faqs').update(data).eq('id', editingFaq.id)
      if (error) { alert(`FAQ 수정 실패: ${error.message}`); return }
    } else {
      const maxOrder = categories
        .find((c) => c.id === data.category_id)
        ?.faqs.reduce((max, f) => Math.max(max, f.sort_order), 0) ?? 0
      const { error } = await supabase.from('faqs').insert({ ...data, sort_order: maxOrder + 1 })
      if (error) { alert(`FAQ 등록 실패: ${error.message}`); return }
    }
    setEditingFaq(null)
    fetchData()
  }

  // Save category (create or update)
  const saveCategory = async (data: { name: string; icon: string }) => {
    if (editingCategory?.id) {
      const { error } = await supabase.from('faq_categories').update(data).eq('id', editingCategory.id)
      if (error) { alert(`카테고리 수정 실패: ${error.message}`); return }
    } else {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0)
      const { error } = await supabase.from('faq_categories').insert({ ...data, sort_order: maxOrder + 1 })
      if (error) { alert(`카테고리 등록 실패: ${error.message}`); return }
    }
    setEditingCategory(null)
    fetchData()
  }

  // Delete FAQ
  const deleteFaq = async () => {
    if (!deletingFaq) return
    const { error } = await supabase.from('faqs').delete().eq('id', deletingFaq.id)
    if (error) { alert(`FAQ 삭제 실패: ${error.message}`); return }
    setDeletingFaq(null)
    fetchData()
  }

  // Delete category (cascade)
  const deleteCategory = async () => {
    if (!deletingCategory) return
    const { error } = await supabase.from('faq_categories').delete().eq('id', deletingCategory.id)
    if (error) { alert(`카테고리 삭제 실패: ${error.message}`); return }
    setDeletingCategory(null)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalFaqs = categories.reduce((sum, c) => sum + c.faqs.length, 0)
  const activeFaqs = categories.reduce(
    (sum, c) => sum + c.faqs.filter((f) => f.is_active).length,
    0
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">FAQ 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {categories.length}개 카테고리, {activeFaqs}/{totalFaqs}개 활성
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditingCategory({})}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            카테고리 추가
          </button>
          <button
            type="button"
            onClick={() => setEditingFaq({})}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            FAQ 추가
          </button>
        </div>
      </div>

      {/* Categories & FAQs */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const isExpanded = expandedCats.has(cat.id)
          return (
            <div
              key={cat.id}
              className={`border rounded-xl overflow-hidden ${
                cat.is_active ? 'border-border bg-white' : 'border-border/50 bg-muted opacity-60'
              }`}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-muted/80">
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.id)}
                  className="text-muted-foreground hover:text-muted-foreground cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-lg">{cat.icon}</span>
                <span className="font-semibold text-sm">{cat.name}</span>
                <span className="text-xs text-muted-foreground">({cat.faqs.length})</span>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategoryActive(cat)}
                    className={`px-2.5 py-1 text-xs rounded-full cursor-pointer ${
                      cat.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {cat.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(cat)}
                    className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer"
                    title="카테고리 수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(cat)}
                    className="p-1.5 text-muted-foreground hover:text-red-600 cursor-pointer"
                    title="카테고리 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* FAQ items */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {cat.faqs.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      등록된 FAQ가 없습니다
                    </div>
                  ) : (
                    cat.faqs.map((faq) => (
                      <div
                        key={faq.id}
                        className={`px-5 py-3.5 flex items-start gap-3 group hover:bg-primary/8/30 transition-colors ${
                          !faq.is_active ? 'opacity-50' : ''
                        }`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-200 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {faq.question}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {faq.answer}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => toggleFaqActive(faq)}
                            className={`px-2 py-0.5 text-xs rounded-full cursor-pointer ${
                              faq.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {faq.is_active ? '활성' : '비활성'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFaq(faq)}
                            className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer"
                            title="수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingFaq(faq)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add FAQ to this category */}
                  <div className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setEditingFaq({ category_id: cat.id })}
                      className="text-xs text-primary hover:text-primary inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      이 카테고리에 FAQ 추가
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {editingFaq !== null && (
        <FaqEditModal
          faq={editingFaq}
          categories={categories}
          onSave={saveFaq}
          onCancel={() => setEditingFaq(null)}
        />
      )}

      {editingCategory !== null && (
        <CategoryEditModal
          category={editingCategory}
          onSave={saveCategory}
          onCancel={() => setEditingCategory(null)}
        />
      )}

      {deletingFaq && (
        <DeleteModal
          title="FAQ 삭제"
          message={`"${deletingFaq.question}" 항목을 삭제하시겠습니까?`}
          onConfirm={deleteFaq}
          onCancel={() => setDeletingFaq(null)}
        />
      )}

      {deletingCategory && (
        <DeleteModal
          title="카테고리 삭제"
          message={`"${deletingCategory.name}" 카테고리와 포함된 FAQ ${deletingCategory.faqs.length}개가 모두 삭제됩니다.`}
          onConfirm={deleteCategory}
          onCancel={() => setDeletingCategory(null)}
        />
      )}
    </div>
  )
}
