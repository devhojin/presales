'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Category {
  id: number
  name: string
}

export default function NewProduct() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    original_price: '',
    category_id: '',
    category_ids: [] as number[],
    format: '',
    pages: '',
    file_size: '',
    thumbnail_url: '',
    tags: '',
    is_published: false,
    is_free: false,
  })

  useEffect(() => {
    async function loadCategories() {
      const supabase = createClient()
      const { data } = await supabase.from('categories').select('*').order('sort_order')
      setCategories(data || [])
    }
    loadCategories()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from('products').insert({
      title: form.title,
      description: form.description,
      price: parseInt(form.price) || 0,
      original_price: parseInt(form.original_price) || 0,
      category_id: form.category_ids.length > 0 ? form.category_ids[0] : (parseInt(form.category_id) || null),
      category_ids: form.category_ids,
      format: form.format,
      pages: parseInt(form.pages) || null,
      file_size: form.file_size,
      thumbnail_url: form.thumbnail_url,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      is_published: form.is_published,
      is_free: form.is_free,
    })

    if (error) {
      alert('등록 실패: ' + error.message)
      setSaving(false)
      return
    }

    router.push('/admin/products')
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> 상품 목록으로
      </Link>

      <h1 className="text-2xl font-bold mb-8">상품 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">기본 정보</h2>

          <div>
            <label className={labelClass}>상품명 *</label>
            <input type="text" required className={inputClass} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <label className={labelClass}>상품 설명</label>
            <textarea rows={4} className={inputClass} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>판매가 (원) *</label>
              <input type="number" required className={inputClass} value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>정가 (원)</label>
              <input type="number" className={inputClass} value={form.original_price}
                onChange={(e) => setForm({ ...form, original_price: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelClass}>카테고리 (복수 선택 가능)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const checked = form.category_ids.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? form.category_ids.filter(id => id !== c.id)
                          : [...form.category_ids, c.id]
                        setForm({ ...form, category_ids: next, category_id: next.length > 0 ? String(next[0]) : '' })
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{c.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">상세 정보</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>파일 형식</label>
              <input type="text" className={inputClass} placeholder="PPTX, HWP" value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>페이지 수</label>
              <input type="number" className={inputClass} value={form.pages}
                onChange={(e) => setForm({ ...form, pages: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>파일 크기</label>
              <input type="text" className={inputClass} placeholder="18MB" value={form.file_size}
                onChange={(e) => setForm({ ...form, file_size: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelClass}>썸네일 URL</label>
            <input type="url" className={inputClass} placeholder="https://..." value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
          </div>

          <div>
            <label className={labelClass}>태그 (쉼표로 구분)</label>
            <input type="text" className={inputClass} placeholder="공공기관, 나라장터, IT사업" value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">공개 설정</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            <span className="text-sm">바로 공개</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={form.is_free}
              onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
            <span className="text-sm">무료 상품</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '등록 중...' : '상품 등록'}
          </button>
          <Link
            href="/admin/products"
            className="h-10 px-6 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 inline-flex items-center transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
