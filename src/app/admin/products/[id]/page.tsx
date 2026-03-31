'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Save, Eye, EyeOff, Trash2, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor').then(m => ({ default: m.RichTextEditor })), { ssr: false, loading: () => <div className="h-[400px] border border-gray-300 rounded-lg animate-pulse bg-gray-50" /> })

interface Category {
  id: number
  name: string
}

interface ProductData {
  id: number
  title: string
  description: string
  description_html: string | null
  youtube_id: string | null
  price: number
  original_price: number
  category_id: number | null
  tier: string
  format: string
  pages: number | null
  file_size: string
  thumbnail_url: string
  tags: string[]
  is_published: boolean
  is_free: boolean
  download_count: number
  created_at: string
}

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<ProductData | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    description_html: '',
    youtube_id: '',
    price: '',
    original_price: '',
    category_id: '',
    tier: 'basic',
    format: '',
    pages: '',
    file_size: '',
    thumbnail_url: '',
    tags: '',
    is_published: false,
    is_free: false,
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('id', Number(id)).single(),
      ])
      setCategories(catRes.data || [])
      if (prodRes.data) {
        const p = prodRes.data as ProductData
        setProduct(p)
        setForm({
          title: p.title || '',
          description: p.description || '',
          description_html: p.description_html || '',
          youtube_id: p.youtube_id || '',
          price: String(p.price || 0),
          original_price: String(p.original_price || 0),
          category_id: String(p.category_id || ''),
          tier: p.tier || 'basic',
          format: p.format || '',
          pages: String(p.pages || ''),
          file_size: p.file_size || '',
          thumbnail_url: p.thumbnail_url || '',
          tags: (p.tags || []).join(', '),
          is_published: p.is_published,
          is_free: p.is_free,
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({
        title: form.title,
        description: form.description,
        description_html: form.description_html || null,
        youtube_id: form.youtube_id || null,
        price: parseInt(form.price) || 0,
        original_price: parseInt(form.original_price) || 0,
        category_id: parseInt(form.category_id) || null,
        tier: form.tier,
        format: form.format,
        pages: parseInt(form.pages) || null,
        file_size: form.file_size,
        thumbnail_url: form.thumbnail_url,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        is_published: form.is_published,
        is_free: form.is_free,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(id))

    if (error) {
      alert('저장 실패: ' + error.message)
      setSaving(false)
      return
    }
    router.push('/admin/products')
  }

  async function handleDelete() {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', Number(id))
    router.push('/admin/products')
  }

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        로딩 중...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">상품을 찾을 수 없습니다</p>
        <Link href="/admin/products" className="text-blue-600 text-sm mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  const discount = form.original_price && form.price
    ? Math.round((1 - parseInt(form.price) / parseInt(form.original_price)) * 100)
    : 0

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> 상품 목록
          </Link>
          <h1 className="text-2xl font-bold">상품 수정</h1>
          <p className="text-sm text-gray-500 mt-1">
            ID: {product.id} | 등록일: {new Date(product.created_at).toLocaleDateString('ko-KR')} | 다운로드: {product.download_count}회
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="h-9 px-3 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> 삭제
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">기본 정보</h2>
            <div className="flex items-center gap-2">
              {form.is_published ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">공개</Badge>
              ) : (
                <Badge className="bg-gray-50 text-gray-500 border-gray-200">비공개</Badge>
              )}
              {form.is_free && (
                <Badge className="bg-purple-50 text-purple-700 border-purple-200">무료</Badge>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>상품명 *</label>
            <input
              type="text"
              required
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>상품 설명</label>
            <textarea
              rows={6}
              className={inputClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>판매가 (원) *</label>
              <input
                type="number"
                required
                className={inputClass}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>정가 (원)</label>
              <input
                type="number"
                className={inputClass}
                value={form.original_price}
                onChange={(e) => setForm({ ...form, original_price: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>할인율</label>
              <div className="h-[42px] flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200">
                <span className={`text-sm font-bold ${discount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {discount > 0 ? `-${discount}%` : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>카테고리</label>
              <select
                className={inputClass}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">선택</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>티어</label>
              <select
                className={inputClass}
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
              >
                <option value="basic">기본</option>
                <option value="premium">프리미엄</option>
                <option value="package">패키지</option>
              </select>
            </div>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">상세 정보</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>파일 형식</label>
              <input
                type="text"
                className={inputClass}
                placeholder="PPTX, HWP"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>페이지 수</label>
              <input
                type="number"
                className={inputClass}
                value={form.pages}
                onChange={(e) => setForm({ ...form, pages: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>파일 크기</label>
              <input
                type="text"
                className={inputClass}
                placeholder="18MB"
                value={form.file_size}
                onChange={(e) => setForm({ ...form, file_size: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>태그 (쉼표로 구분)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="공공기관, 나라장터, IT사업"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 썸네일 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">이미지</h2>

          <div>
            <label className={labelClass}>썸네일 URL</label>
            <input
              type="url"
              className={inputClass}
              placeholder="https://..."
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
            />
          </div>

          {form.thumbnail_url && (
            <div className="relative w-64 aspect-[4/3] rounded-lg overflow-hidden bg-muted border border-gray-200">
              <img
                src={form.thumbnail_url}
                alt="썸네일 미리보기"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* 상세 설명 (리치 에디터) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">상세 설명 (HTML 에디터)</h2>
          <p className="text-xs text-gray-500">상품 상세 페이지에 표시되는 리치 텍스트 설명입니다. 목차, 포함 내용, 활용 대상 등을 작성하세요.</p>
          <RichTextEditor
            content={form.description_html}
            onChange={(html) => setForm({ ...form, description_html: html })}
            placeholder="상품 상세 설명을 입력하세요..."
          />
        </div>

        {/* 유튜브 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-gray-900">유튜브 영상</h2>
          </div>
          <div>
            <label className={labelClass}>유튜브 영상 ID (또는 전체 URL)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="예: dQw4w9WgXcQ 또는 https://youtube.com/watch?v=..."
              value={form.youtube_id}
              onChange={(e) => {
                let val = e.target.value
                const match = val.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
                if (match) val = match[1]
                setForm({ ...form, youtube_id: val })
              }}
            />
            <p className="text-xs text-gray-500 mt-1">유튜브 URL을 붙여넣으면 자동으로 ID가 추출됩니다.</p>
          </div>
          {form.youtube_id && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${form.youtube_id}`}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* 공개 설정 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">공개 설정</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            <div>
              <span className="text-sm font-medium">공개</span>
              <p className="text-xs text-gray-500">체크하면 스토어에 노출됩니다</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
              checked={form.is_free}
              onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
            />
            <div>
              <span className="text-sm font-medium">무료 상품</span>
              <p className="text-xs text-gray-500">체크하면 무료로 다운로드 가능합니다</p>
            </div>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-4 -mx-8 px-8 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '변경사항 저장'}
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
