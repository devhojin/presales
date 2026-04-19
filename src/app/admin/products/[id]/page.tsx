'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage-upload'
import { useDraggableModal } from '@/hooks/useDraggableModal'
import {
  ArrowLeft, Save, Eye, EyeOff, Trash2, Play, Plus, X,
  ImageIcon, FileText, Tag, Upload, Loader2, Code, Monitor,
  FileType, User, Check, Download, AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor').then(m => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[400px] border border-border rounded-xl animate-pulse bg-muted" /> }
)

// ===========================
// Types
// ===========================

interface Category {
  id: number
  name: string
}

interface ProductFile {
  id: string
  product_id: number
  file_name: string
  file_url: string
  file_size: number
  created_at: string
}

interface SpecItem {
  label: string
  value: string
}

interface ProductForm {
  title: string
  description: string
  description_html: string
  youtube_id: string
  preview_pdf_url: string
  preview_clear_pages: string
  preview_blur_pages: string
  preview_note: string
  price: number
  original_price: number
  category_id: string
  category_ids: number[]
  tier: string
  format: string
  pages: string
  file_size: string
  thumbnail_url: string
  tags: string[]
  is_published: boolean
  is_free: boolean
  overview: string[]
  features: string[]
  specs: SpecItem[]
  file_types: string[]
  document_orientation: string[]
  badge_new: boolean
  badge_best: boolean
  badge_sale: boolean
  seller: string
  related_product_ids: number[]
  preview_images: string[]
}

// ===========================
// Constants
// ===========================

const FILE_TYPE_OPTIONS = ['PPT', 'PDF', 'HWP', 'XLS', 'DOC'] as const

const EMPTY_FORM: ProductForm = {
  title: '',
  description: '',
  description_html: '',
  youtube_id: '',
  preview_pdf_url: '',
  preview_clear_pages: '0',
  preview_blur_pages: '2',
  preview_note: '',
  price: 0,
  original_price: 0,
  category_id: '',
  category_ids: [],
  tier: 'basic',
  format: '',
  pages: '',
  file_size: '',
  thumbnail_url: '',
  tags: [],
  is_published: false,
  is_free: false,
  overview: [''],
  features: [''],
  specs: [{ label: '', value: '' }],
  file_types: [],
  document_orientation: ['가로형'],
  badge_new: false,
  badge_best: false,
  badge_sale: false,
  seller: '프리세일즈',
  related_product_ids: [],
  preview_images: [],
}

// ===========================
// Reusable: List Editor
// ===========================

function ListEditor({
  items,
  onChange,
  placeholder,
  label,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  label: string
}) {
  const addItem = () => onChange([...items, ''])
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, value: string) =>
    onChange(items.map((item, i) => (i === idx ? value : item)))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/8 rounded-xl transition-colors"
        >
          <Plus className="w-3 h-3" />
          추가
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===========================
// Reusable: Specs Editor
// ===========================

function SpecsEditor({
  specs,
  onChange,
}: {
  specs: SpecItem[]
  onChange: (specs: SpecItem[]) => void
}) {
  const addSpec = () => onChange([...specs, { label: '', value: '' }])
  const removeSpec = (idx: number) => onChange(specs.filter((_, i) => i !== idx))
  const updateSpec = (idx: number, field: 'label' | 'value', val: string) =>
    onChange(specs.map((s, i) => (i === idx ? { ...s, [field]: val } : s)))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-muted-foreground">스펙 (키-값)</label>
        <button
          type="button"
          onClick={addSpec}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/8 rounded-xl transition-colors"
        >
          <Plus className="w-3 h-3" />
          추가
        </button>
      </div>
      <div className="space-y-2">
        {specs.map((spec, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={spec.label}
              onChange={(e) => updateSpec(idx, 'label', e.target.value)}
              placeholder="항목명 (예: 페이지수)"
              className="w-1/3 px-3 py-2 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
            />
            <input
              type="text"
              value={spec.value}
              onChange={(e) => updateSpec(idx, 'value', e.target.value)}
              placeholder="값 (예: 45p)"
              className="flex-1 px-3 py-2 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
            />
            {specs.length > 1 && (
              <button
                type="button"
                onClick={() => removeSpec(idx)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ===========================
// Helper: extract YouTube ID
// ===========================

function extractYoutubeId(input: string): string {
  if (!input) return ''
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (match) return match[1]
  // If it's already just an ID (11 chars alphanumeric)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  return input
}

// Supabase PostgrestError / StorageError 는 Error 인스턴스가 아니므로
// instanceof Error 검사에서 누락됨 → message 필드를 직접 파내어 노출
function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const obj = e as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts: string[] = []
    if (typeof obj.message === 'string') parts.push(obj.message)
    else if (typeof obj.error === 'string') parts.push(obj.error)
    if (typeof obj.code === 'string') parts.push(`[${obj.code}]`)
    if (typeof obj.details === 'string') parts.push(obj.details)
    if (typeof obj.hint === 'string') parts.push(`(${obj.hint})`)
    if (parts.length > 0) return parts.join(' ')
    try { return JSON.stringify(e) } catch { return String(e) }
  }
  return String(e ?? '알 수 없는 오류')
}

// ===========================
// Main Page
// ===========================

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { handleMouseDown: handleDeleteFileModalMouseDown, modalStyle: deleteFileModalStyle } = useDraggableModal()
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showHtmlSource, setShowHtmlSource] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [downloadCount, setDownloadCount] = useState(0)
  const [createdAt, setCreatedAt] = useState('')

  const [relatedProducts, setRelatedProducts] = useState<{ id: number; title: string; price: number; is_free: boolean; thumbnail_url: string | null }[]>([])
  const [relatedSearch, setRelatedSearch] = useState('')
  const [relatedSearchResults, setRelatedSearchResults] = useState<{ id: number; title: string; price: number; is_free: boolean; thumbnail_url: string | null }[]>([])
  const [relatedSearchOpen, setRelatedSearchOpen] = useState(false)
  const [searchingRelated, setSearchingRelated] = useState(false)
  const relatedSearchRef = useRef<HTMLDivElement>(null)

  // Download file management
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [fileUploading, setFileUploading] = useState(false)
  const [fileUploadProgress, setFileUploadProgress] = useState(0)
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<ProductFile | null>(null)
  const [deletingFile, setDeletingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const downloadFileInputRef = useRef<HTMLInputElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Load product files
  const loadProductFiles = async () => {
    if (isNew) return
    const supabase = createClient()
    const { data } = await supabase
      .from('product_files')
      .select('*')
      .eq('product_id', Number(id))
      .order('created_at', { ascending: false })
    setProductFiles(data || [])
  }

  // Upload download file — TUS resumable (50GB 까지)
  const handleDownloadFileUpload = async (file: File) => {
    if (isNew) {
      showToast('상품을 먼저 저장한 후 파일을 업로드해주세요.')
      return
    }
    setFileUploading(true)
    setFileUploadProgress(0)
    try {
      // Supabase Storage key 는 ASCII 만 허용 (TUS 는 특히 엄격)
      // 사용자가 보는 파일명(file_name) 은 DB 에 원본 한글로 보존, storage key 만 sanitize
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
      const safeKey = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`
      const filePath = `products/${id}/${safeKey}`
      // 실제 업로드 진행률은 95% 까지만 반영, 나머지 5% 는 DB insert 단계
      const result = await uploadFile({
        bucket: 'product-files',
        path: filePath,
        file,
        upsert: true,
        onProgress: (pct) => setFileUploadProgress(Math.min(95, Math.round(pct * 0.95))),
      })
      if (!result.ok) throw new Error(result.error)

      const supabase = createClient()
      const { data: urlData } = supabase.storage
        .from('product-files')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase
        .from('product_files')
        .insert({
          product_id: Number(id),
          file_name: file.name, // 원본 한글 이름 그대로 보존 (다운로드 시 이 이름으로 저장됨)
          file_url: urlData.publicUrl,
          file_size: file.size,
        })
      if (insertError) throw insertError

      setFileUploadProgress(100)
      await loadProductFiles()
      showToast('파일이 업로드되었습니다.')
    } catch (err) {
      showToast(`업로드 오류: ${formatErr(err)}`)
    } finally {
      setFileUploading(false)
      setFileUploadProgress(0)
      if (downloadFileInputRef.current) downloadFileInputRef.current.value = ''
    }
  }

  // Delete download file
  const handleDeleteFile = async (file: ProductFile) => {
    setDeletingFile(true)
    try {
      const supabase = createClient()
      // file_url 에서 실제 storage key 추출
      // 예: https://xxx.supabase.co/storage/v1/object/public/product-files/products/58/1776-abc.pdf
      //     → products/58/1776-abc.pdf
      const match = file.file_url?.match(/\/product-files\/(.+)$/)
      const filePath = match ? decodeURIComponent(match[1]) : `products/${id}/${file.file_name}`
      await supabase.storage.from('product-files').remove([filePath])
      const { error } = await supabase
        .from('product_files')
        .delete()
        .eq('id', file.id)
      if (error) throw error
      setDeleteConfirmFile(null)
      await loadProductFiles()
      showToast('파일이 삭제되었습니다.')
    } catch (err) {
      showToast(`삭제 오류: ${formatErr(err)}`)
    } finally {
      setDeletingFile(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Load data
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        isNew
          ? Promise.resolve({ data: null })
          : supabase.from('products').select('*').eq('id', Number(id)).maybeSingle(),
      ])
      setCategories(catRes.data || [])

      if (prodRes.data) {
        const p = prodRes.data
        const overview = Array.isArray(p.overview) ? p.overview : []
        const features = Array.isArray(p.features) ? p.features : []
        const specs = Array.isArray(p.specs) ? p.specs : []
        setForm({
          title: p.title || '',
          description: p.description || '',
          description_html: p.description_html || '',
          youtube_id: p.youtube_id || '',
          preview_pdf_url: p.preview_pdf_url || '',
          preview_clear_pages: String(p.preview_clear_pages || 0),
          preview_blur_pages: String(p.preview_blur_pages || 2),
          preview_note: p.preview_note || '',
          price: p.price || 0,
          original_price: p.original_price || 0,
          category_id: String(p.category_id || ''),
          category_ids: Array.isArray(p.category_ids) ? p.category_ids : (p.category_id ? [p.category_id] : []),
          tier: p.tier || 'basic',
          format: p.format || '',
          pages: p.pages ? String(p.pages) : '',
          file_size: p.file_size || '',
          thumbnail_url: p.thumbnail_url || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          is_published: p.is_published ?? false,
          is_free: p.is_free ?? false,
          overview: overview.length > 0 ? overview : [''],
          features: features.length > 0 ? features : [''],
          specs: specs.length > 0 ? specs : [{ label: '', value: '' }],
          file_types: Array.isArray(p.file_types) ? p.file_types : [],
          document_orientation: Array.isArray(p.document_orientation)
            ? p.document_orientation
            : p.document_orientation ? [p.document_orientation] : ['가로형'],
          badge_new: p.badge_new ?? false,
          badge_best: p.badge_best ?? false,
          badge_sale: p.badge_sale ?? false,
          seller: p.seller || '프리세일즈',
          related_product_ids: Array.isArray(p.related_product_ids) ? p.related_product_ids : [],
          preview_images: Array.isArray(p.preview_images) ? p.preview_images : [],
        })
        setDownloadCount(p.download_count || 0)
        setCreatedAt(p.created_at || '')

        // Load related products details
        const rpIds = Array.isArray(p.related_product_ids) ? p.related_product_ids : []
        if (rpIds.length > 0) {
          const { data: rpData } = await supabase
            .from('products')
            .select('id, title, price, is_free, thumbnail_url')
            .in('id', rpIds)
          setRelatedProducts(rpData || [])
        }

        // Load product files
        const { data: filesData } = await supabase
          .from('product_files')
          .select('*')
          .eq('product_id', Number(id))
          .order('created_at', { ascending: false })
        setProductFiles(filesData || [])
      }
      setLoading(false)
    }
    load()
  }, [id, isNew])

  // Save
  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('상품명을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const dbRow: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        description_html: form.description_html || null,
        youtube_id: form.youtube_id || null,
        preview_pdf_url: form.preview_pdf_url || null,
        preview_clear_pages: Math.min(20, parseInt(form.preview_clear_pages) || 0),
        preview_blur_pages: 0, // 시스템 자동 계산 (70% 선명 / 30% 블러)
        preview_note: form.preview_note || null,
        price: form.is_free ? 0 : form.price,
        original_price: form.is_free ? 0 : form.original_price,
        category_id: form.category_ids.length > 0 ? form.category_ids[0] : (form.category_id ? parseInt(form.category_id) : null),
        category_ids: form.category_ids,
        tier: form.tier,
        format: form.format || null,
        pages: form.pages ? parseInt(form.pages) : null,
        file_size: form.file_size || null,
        thumbnail_url: form.thumbnail_url || null,
        tags: form.tags,
        is_published: form.is_published,
        is_free: form.is_free,
        overview: form.overview.filter(Boolean),
        features: form.features.filter(Boolean),
        specs: form.specs.filter(s => s.label || s.value),
        file_types: form.file_types,
        document_orientation: form.document_orientation,
        badge_new: form.badge_new,
        badge_best: form.badge_best,
        badge_sale: form.badge_sale,
        seller: form.seller || null,
        related_product_ids: form.related_product_ids,
        preview_images: form.preview_images,
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        const { error } = await supabase.from('products').insert(dbRow)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').update(dbRow).eq('id', Number(id))
        if (error) throw error
      }

      showToast(isNew ? '상품이 등록되었습니다.' : '상품이 수정되었습니다.')
      setTimeout(() => router.push('/admin/products'), 1000)
    } catch (e) {
      console.error('[handleSave] error:', e)
      showToast(`저장 오류: ${formatErr(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('products').delete().eq('id', Number(id))
      if (error) throw error
      showToast('상품이 삭제되었습니다.')
      setTimeout(() => router.push('/admin/products'), 1000)
    } catch (e) {
      showToast(`삭제 오류: ${formatErr(e)}`)
    }
  }

  // Thumbnail upload
  const handleThumbnailUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다.')
      return
    }
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `${isNew ? 'temp' : id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      const result = await uploadFile({ bucket: 'product-thumbnails', path: filePath, file, upsert: true })
      if (!result.ok) throw new Error(result.error)
      const { data: urlData } = createClient().storage.from('product-thumbnails').getPublicUrl(filePath)
      updateField('thumbnail_url', urlData.publicUrl)
      showToast('이미지가 업로드되었습니다.')
    } catch (err) {
      showToast(`업로드 오류: ${formatErr(err)}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Tag add
  const addTag = () => {
    const v = tagInput.trim()
    if (v && !form.tags.includes(v)) {
      updateField('tags', [...form.tags, v])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    updateField('tags', form.tags.filter(t => t !== tag))
  }

  // Related products search
  useEffect(() => {
    if (!relatedSearch.trim()) {
      setRelatedSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingRelated(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('id, title, price, is_free, thumbnail_url')
        .ilike('title', `%${relatedSearch.trim()}%`)
        .limit(100)
      const currentId = isNew ? -1 : Number(id)
      const filtered = (data || []).filter(
        p => p.id !== currentId && !form.related_product_ids.includes(p.id)
      )
      setRelatedSearchResults(filtered)
      setSearchingRelated(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [relatedSearch, form.related_product_ids, id, isNew])

  // Close related search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (relatedSearchRef.current && !relatedSearchRef.current.contains(e.target as Node)) {
        setRelatedSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addRelatedProduct = (product: { id: number; title: string; price: number; is_free: boolean; thumbnail_url: string | null }) => {
    if (form.related_product_ids.includes(product.id)) return
    updateField('related_product_ids', [...form.related_product_ids, product.id])
    setRelatedProducts(prev => [...prev, product])
    setRelatedSearch('')
    setRelatedSearchResults([])
    setRelatedSearchOpen(false)
  }

  const removeRelatedProduct = (productId: number) => {
    updateField('related_product_ids', form.related_product_ids.filter(id => id !== productId))
    setRelatedProducts(prev => prev.filter(p => p.id !== productId))
  }

  const discount =
    form.original_price > 0 && form.price < form.original_price
      ? Math.round((1 - form.price / form.original_price) * 100)
      : 0

  const inputClass =
    'w-full px-4 py-2.5 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Delete File Confirm Modal */}
      {deleteConfirmFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteConfirmFile(null)}
          onKeyDown={e => { if (e.key === 'Escape') setDeleteConfirmFile(null) }}
          tabIndex={-1}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            style={deleteFileModalStyle}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDeleteConfirmFile(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4 cursor-move select-none" onMouseDown={handleDeleteFileModalMouseDown}>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">파일 삭제</h3>
                <p className="text-xs text-muted-foreground mt-0.5">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium text-foreground">{deleteConfirmFile.file_name}</span>을 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmFile(null)}
                className="flex-1 px-4 py-2.5 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFile(deleteConfirmFile)}
                disabled={deletingFile}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deletingFile ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    삭제 중...
                  </span>
                ) : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="w-9 h-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isNew ? '상품 등록' : '상품 수정'}
            </h1>
            {!isNew && (
              <p className="text-xs text-muted-foreground mt-0.5">
                ID: {id}
                {createdAt && <> | 등록일: {new Date(createdAt).toLocaleDateString('ko-KR')}</>}
                {' '}| 다운로드: {downloadCount}회
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* ─── 기본 정보 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              기본 정보
            </h2>
            <div className="space-y-4">
              {/* 상품명 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  상품명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="상품명을 입력하세요"
                  className={inputClass}
                />
              </div>

              {/* 상품 설명 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">상품 설명</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="목록/카드에 표시되는 간단한 설명"
                  className={inputClass}
                />
              </div>

              {/* 카테고리 (복수 선택) */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">카테고리 (복수 선택 가능)</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => {
                    const checked = form.category_ids.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-primary/8 border-blue-300 text-primary'
                            : 'bg-white border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? form.category_ids.filter(id => id !== c.id)
                              : [...form.category_ids, c.id]
                            updateField('category_ids', next)
                            // Keep category_id in sync for backwards compat
                            updateField('category_id', next.length > 0 ? String(next[0]) : '')
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">{c.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* 가격 정보 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.is_free}
                    onChange={e => {
                      const isFree = e.target.checked
                      updateField('is_free', isFree)
                      if (isFree) {
                        updateField('price', 0)
                        updateField('original_price', 0)
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">무료 상품</span>
                </label>
                {!form.is_free && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">판매가 (원)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={e => updateField('price', Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">정가 (원)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.original_price}
                        onChange={e => updateField('original_price', Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">할인율</label>
                      <div className="h-[42px] flex items-center px-3 rounded-xl bg-muted border border-border">
                        <span className={`text-sm font-bold ${discount > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {discount > 0 ? `-${discount}%` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─── 대표 이미지 (썸네일) ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              대표 이미지
            </h2>
            <p className="text-[11px] text-muted-foreground mb-3">권장 해상도: 750 x 750px / JPG, PNG, WEBP</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleThumbnailUpload(file)
              }}
            />

            <div className="flex flex-col sm:flex-row gap-4">
              {/* 드래그앤드롭 영역 */}
              <div
                className="w-full sm:w-[280px] h-[200px] rounded-xl border-2 border-dashed border-border bg-muted cursor-pointer hover:border-blue-400 hover:bg-primary/8/30 transition-all flex flex-col items-center justify-center gap-2"
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.classList.add('border-blue-400', 'bg-primary/8/50')
                }}
                onDragLeave={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.classList.remove('border-blue-400', 'bg-primary/8/50')
                }}
                onDrop={async e => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.classList.remove('border-blue-400', 'bg-primary/8/50')
                  const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
                  if (file) handleThumbnailUpload(file)
                }}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">이미지를 드래그하여 놓거나 클릭하여 선택</span>
                    <span className="text-[10px] text-muted-foreground">750 x 750px 권장</span>
                  </>
                )}
              </div>

              {/* 썸네일 미리보기 */}
              {form.thumbnail_url && (
                <div className="relative group">
                  <div className="w-[160px] h-[160px] rounded-xl overflow-hidden border border-border bg-muted">
                    <img
                      src={form.thumbnail_url}
                      alt="썸네일 미리보기"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('thumbnail_url', '')}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* URL 직접 입력 */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">또는 URL 직접 입력</label>
              <input
                type="url"
                value={form.thumbnail_url}
                onChange={e => updateField('thumbnail_url', e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </section>

          {/* ─── 상세 설명 (리치 에디터 + HTML 소스) ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                상세 설명 (HTML 에디터)
              </h2>
              <button
                type="button"
                onClick={() => setShowHtmlSource(!showHtmlSource)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                  showHtmlSource
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                {showHtmlSource ? 'WYSIWYG' : 'HTML 소스'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              상품 상세 페이지에 표시되는 리치 텍스트 설명입니다.
            </p>

            {showHtmlSource ? (
              <textarea
                value={form.description_html}
                onChange={e => updateField('description_html', e.target.value)}
                placeholder="<h2>상품 소개</h2><p>내용을 입력하세요...</p>"
                rows={16}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all bg-muted"
                spellCheck={false}
              />
            ) : (
              <RichTextEditor
                content={form.description_html}
                onChange={html => updateField('description_html', html)}
                placeholder="상품에 대한 상세 소개를 작성하세요..."
              />
            )}
          </section>

          {/* ─── 유튜브 소개 영상 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-red-500" />
              유튜브 소개 영상
            </h2>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">유튜브 URL 또는 영상 ID</label>
              <input
                type="text"
                value={form.youtube_id}
                onChange={e => {
                  const extracted = extractYoutubeId(e.target.value)
                  updateField('youtube_id', extracted)
                }}
                placeholder="https://www.youtube.com/watch?v=... 또는 영상 ID"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">유튜브 URL을 붙여넣으면 자동으로 ID가 추출됩니다.</p>
            </div>
            {form.youtube_id && (
              <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black max-w-xl">
                <iframe
                  src={`https://www.youtube.com/embed/${form.youtube_id}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
          </section>

          {/* ─── 다운로드 파일 관리 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              다운로드 파일 관리
            </h2>
            <p className="text-xs text-muted-foreground mb-4">구매자가 다운로드할 실제 파일입니다. product-files 버킷에 저장됩니다.</p>

            {isNew ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                상품을 먼저 저장한 후 파일을 업로드할 수 있습니다.
              </div>
            ) : (
              <>
                {/* Upload area */}
                <input
                  ref={downloadFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleDownloadFileUpload(file)
                  }}
                />
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    dragOver
                      ? 'border-blue-400 bg-primary/8/50'
                      : 'border-border bg-muted hover:border-blue-300 hover:bg-primary/8/20'
                  }`}
                  onClick={() => !fileUploading && downloadFileInputRef.current?.click()}
                  onDragOver={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOver(true)
                  }}
                  onDragLeave={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOver(false)
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleDownloadFileUpload(file)
                  }}
                >
                  {fileUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      <p className="text-xs text-primary font-medium">업로드 중...</p>
                      {fileUploadProgress > 0 && (
                        <div className="w-full max-w-[200px] bg-muted rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${fileUploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">파일을 드래그하거나 클릭하여 업로드</p>
                      <p className="text-xs text-muted-foreground">PPT, PDF, HWP, XLS, ZIP 등 모든 파일 형식</p>
                    </div>
                  )}
                </div>

                {/* File list */}
                {productFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{productFiles.length}개 파일 등록됨</p>
                    <div className="divide-y divide-gray-100 border border-border rounded-xl overflow-hidden">
                      {productFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-muted transition-colors group">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/download', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ productId: Number(id), fileId: file.id }),
                                })
                                const body = await res.json()
                                if (!res.ok || !body.url) throw new Error(body.error || '다운로드 실패')
                                window.location.href = body.url
                              } catch (e) {
                                alert(e instanceof Error ? e.message : '다운로드에 실패했습니다')
                              }
                            }}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                            title="다운로드"
                          >
                            <div className="w-8 h-8 bg-primary/8 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                              <Download className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{file.file_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatFileSize(file.file_size)} · {new Date(file.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmFile(file)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {productFiles.length === 0 && !fileUploading && (
                  <p className="text-center text-xs text-muted-foreground mt-3">등록된 파일이 없습니다</p>
                )}

                {/* 미리보기 PDF 미등록 경고 */}
                {productFiles.length > 0 && !form.preview_pdf_url && (() => {
                  const hasPdfFile = productFiles.some((f: { file_name: string }) => f.file_name?.toLowerCase().endsWith('.pdf'))
                  const fileExts = productFiles.map((f: { file_name: string }) => f.file_name?.split('.').pop()?.toUpperCase()).join(', ')
                  return (
                    <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-800">미리보기 PDF가 등록되지 않았습니다</p>
                          <p className="text-xs text-amber-700 mt-1">
                            등록된 파일: {fileExts}
                            {!hasPdfFile && ' — PDF가 아닌 파일은 미리보기가 지원되지 않습니다.'}
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            아래의 📖 PDF 미리보기 섹션에서 미리보기용 PDF를 업로드하거나, 안내 문구를 입력해주세요.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </section>

          {/* ─── PDF 미리보기 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              📖 PDF 미리보기
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">미리보기 PDF 파일</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/8/50') }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/8/50') }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('border-primary', 'bg-primary/8/50')
                    const file = e.dataTransfer.files[0]
                    if (!file || !file.name.endsWith('.pdf')) { setToast('PDF 파일만 업로드 가능합니다'); return }
                    const fileName = `preview-${Number(id)}-${Date.now()}.pdf`
                    const result = await uploadFile({ bucket: 'product-previews', path: fileName, file })
                    if (!result.ok) { setToast('업로드 실패: ' + result.error); return }
                    const { data: urlData } = createClient().storage.from('product-previews').getPublicUrl(fileName)
                    updateField('preview_pdf_url', urlData.publicUrl)
                    setToast('PDF 업로드 완료')
                  }}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-gray-400"
                  onClick={() => document.getElementById('pdf-upload-input')?.click()}
                >
                  <input
                    id="pdf-upload-input"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const fileName = `preview-${Number(id)}-${Date.now()}.pdf`
                      const result = await uploadFile({ bucket: 'product-previews', path: fileName, file })
                      if (!result.ok) { setToast('업로드 실패: ' + result.error); return }
                      const { data: urlData } = createClient().storage.from('product-previews').getPublicUrl(fileName)
                      updateField('preview_pdf_url', urlData.publicUrl)
                      setToast('PDF 업로드 완료')
                    }}
                  />
                  {form.preview_pdf_url ? (
                    <div>
                      <p className="text-sm text-blue-700 font-medium mb-1">✅ PDF 등록됨</p>
                      <p className="text-xs text-muted-foreground">{form.preview_pdf_url.split('/').pop()}</p>
                      <p className="text-xs text-primary mt-2">클릭하거나 새 파일을 드래그해서 교체</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm text-muted-foreground font-medium">PDF 파일을 드래그하거나 클릭해서 업로드</p>
                      <p className="text-xs text-muted-foreground mt-1">미리보기용 PDF 파일</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">미리보기 페이지 수 (0=자동)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={form.preview_clear_pages}
                    onChange={e => updateField('preview_clear_pages', String(Math.min(20, Math.max(0, parseInt(e.target.value) || 0))))}
                    placeholder="0 (자동)"
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0이면 자동 계산. <span className="font-medium text-amber-600">최대 20장</span>. 70% 선명 / 30% 블러 자동 적용</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">미리보기 안내 문구 (PDF 없을 때 표시)</label>
                <input
                  type="text"
                  value={form.preview_note}
                  onChange={e => updateField('preview_note', e.target.value)}
                  placeholder="예: 무료 다운로드 후 바로 사용 가능합니다"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">PDF 미리보기가 없을 때 상품 상세에 표시될 안내 문구</p>
              </div>
            </div>
          </section>

          {/* ─── 이미지 미리보기 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              🖼️ 이미지 미리보기
            </h2>
            <div className="space-y-4">
              {/* 업로드 드래그 영역 */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5') }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5') }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                  if (!files.length) return
                  const supabase = createClient()
                  const newUrls: string[] = []
                  const failed: string[] = []
                  for (const file of files) {
                    const ext = file.name.split('.').pop() ?? 'jpg'
                    const fileName = `preview-images/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
                    const result = await uploadFile({ bucket: 'product-previews', path: fileName, file })
                    if (result.ok) {
                      const { data } = supabase.storage.from('product-previews').getPublicUrl(fileName)
                      newUrls.push(data.publicUrl)
                    } else {
                      failed.push(`${file.name}: ${result.error}`)
                    }
                  }
                  if (newUrls.length) {
                    updateField('preview_images', [...form.preview_images, ...newUrls])
                  }
                  if (failed.length) {
                    showToast(`${newUrls.length}개 성공, ${failed.length}개 실패: ${failed[0]}`)
                  } else if (newUrls.length) {
                    showToast(`${newUrls.length}개 이미지 업로드 완료`)
                  }
                }}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-gray-400"
                onClick={() => document.getElementById('preview-images-input')?.click()}
              >
                <input
                  id="preview-images-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'))
                    if (!files.length) return
                    const supabase = createClient()
                    const newUrls: string[] = []
                    const failed: string[] = []
                    for (const file of files) {
                      const ext = file.name.split('.').pop() ?? 'jpg'
                      const fileName = `preview-images/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
                      const result = await uploadFile({ bucket: 'product-previews', path: fileName, file })
                      if (result.ok) {
                        const { data } = supabase.storage.from('product-previews').getPublicUrl(fileName)
                        newUrls.push(data.publicUrl)
                      } else {
                        failed.push(`${file.name}: ${result.error}`)
                      }
                    }
                    if (newUrls.length) {
                      updateField('preview_images', [...form.preview_images, ...newUrls])
                    }
                    if (failed.length) {
                      showToast(`${newUrls.length}개 성공, ${failed.length}개 실패: ${failed[0]}`)
                    } else if (newUrls.length) {
                      showToast(`${newUrls.length}개 이미지 업로드 완료`)
                    }
                    e.target.value = ''
                  }}
                />
                <p className="text-2xl mb-2">🖼️</p>
                <p className="text-sm text-muted-foreground">이미지를 드래그하거나 클릭해서 업로드 (여러 장 가능)</p>
              </div>

              {/* 등록된 이미지 목록 - 그리드 */}
              {form.preview_images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {form.preview_images.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-border">
                      <img src={url} alt={`미리보기 ${idx + 1}`} className="w-full aspect-[4/3] object-cover" />
                      <button
                        type="button"
                        onClick={() => updateField('preview_images', form.preview_images.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ─── 소개 리스트 (overview) ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">소개 (Overview)</h2>
            <p className="text-xs text-muted-foreground mb-3">판매 페이지의 &quot;상품 소개&quot; 섹션에 표시됩니다.</p>
            <ListEditor
              items={form.overview}
              onChange={items => updateField('overview', items)}
              placeholder="소개 내용 입력..."
              label="소개 항목"
            />
          </section>

          {/* ─── 특장점 (features) ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">특장점 (Features)</h2>
            <p className="text-xs text-muted-foreground mb-3">판매 페이지의 &quot;이런 점이 좋아요&quot; 섹션에 표시됩니다.</p>
            <ListEditor
              items={form.features}
              onChange={items => updateField('features', items)}
              placeholder="특장점 항목 입력..."
              label="특장점 항목"
            />
          </section>

          {/* ─── 스펙 (specs) ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">스펙 정보</h2>
            <p className="text-xs text-muted-foreground mb-3">판매 페이지의 &quot;상품 정보&quot; 테이블에 표시됩니다.</p>
            <SpecsEditor
              specs={form.specs}
              onChange={specs => updateField('specs', specs)}
            />
          </section>

          {/* ─── 문서 유형 / 형태 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <FileType className="w-4 h-4 text-muted-foreground" />
              문서 유형 / 형태
            </h2>
            <div className="space-y-4">
              {/* 파일 유형 체크박스 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">파일 유형 (복수 선택 가능)</label>
                <div className="flex flex-wrap gap-2">
                  {FILE_TYPE_OPTIONS.map(ft => {
                    const checked = form.file_types.includes(ft)
                    return (
                      <label
                        key={ft}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-primary/8 border-blue-300 text-primary'
                            : 'bg-white border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? form.file_types.filter(t => t !== ft)
                              : [...form.file_types, ft]
                            updateField('file_types', next)
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">{ft}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* 문서 형태 (체크박스 — 중복선택 가능) */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  문서 형태
                </label>
                <div className="flex gap-3">
                  {(['가로형', '세로형'] as const).map(orient => {
                    const checked = form.document_orientation.includes(orient)
                    return (
                      <label
                        key={orient}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-primary/8 border-blue-300 text-primary'
                            : 'bg-white border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? form.document_orientation.filter(v => v !== orient)
                              : [...form.document_orientation, orient]
                            updateField('document_orientation', next.length > 0 ? next : [orient])
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">{orient}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ─── 해시태그 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              해시태그
            </h2>
            <p className="text-xs text-muted-foreground mb-3">검색 및 필터링에 사용되는 태그입니다. Enter를 눌러 추가하세요.</p>

            {/* 태그 표시 */}
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/8 text-primary text-xs font-medium rounded-xl cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => removeTag(tag)}
                  >
                    #{tag}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            )}

            {/* 태그 입력 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="태그 입력 후 Enter"
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2.5 bg-muted hover:bg-muted text-foreground rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* ─── 관련 상품 ─── */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              관련 상품
            </h2>
            <p className="text-xs text-muted-foreground mb-3">상품 상세 페이지 하단에 표시되는 관련 상품을 직접 지정합니다. 비어있으면 같은 카테고리 상품이 자동 표시됩니다.</p>

            {/* Current related products */}
            {relatedProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {form.related_product_ids.map(rpId => {
                  const rp = relatedProducts.find(p => p.id === rpId)
                  if (!rp) return null
                  return (
                    <div key={rp.id} className="relative group border border-border rounded-xl overflow-hidden bg-muted">
                      <div className="aspect-[4/3] bg-muted overflow-hidden">
                        {rp.thumbnail_url ? (
                          <img src={rp.thumbnail_url} alt={rp.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-blue-900 to-blue-700">📄</div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{rp.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {rp.is_free ? '무료' : `${rp.price.toLocaleString()}원`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRelatedProduct(rp.id)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Search to add */}
            <div ref={relatedSearchRef} className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={relatedSearch}
                  onChange={e => {
                    setRelatedSearch(e.target.value)
                    setRelatedSearchOpen(true)
                  }}
                  onFocus={() => {
                    if (relatedSearch.trim()) setRelatedSearchOpen(true)
                  }}
                  placeholder="상품명으로 검색하여 추가..."
                  className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (relatedSearch.trim()) setRelatedSearchOpen(true)
                  }}
                  className="px-3 py-2.5 bg-muted hover:bg-muted text-foreground rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown results */}
              {relatedSearchOpen && relatedSearch.trim() && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {searchingRelated ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                      검색 중...
                    </div>
                  ) : relatedSearchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      검색 결과가 없습니다
                    </div>
                  ) : (
                    relatedSearchResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addRelatedProduct(p)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt="관련 상품 이미지" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm bg-gradient-to-br from-blue-900 to-blue-700">📄</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.is_free ? '무료' : `${p.price.toLocaleString()}원`}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {form.related_product_ids.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{form.related_product_ids.length}개 상품이 연결되었습니다</p>
            )}
          </section>

        </div>
        {/* END LEFT COLUMN */}

        {/* RIGHT SIDEBAR */}
        <div className="lg:w-[320px] shrink-0 space-y-5">

          {/* 상태 */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">상태</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={e => updateField('is_published', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">공개</span>
                  <p className="text-xs text-muted-foreground">체크하면 스토어에 노출됩니다</p>
                </div>
              </label>
              <div className="flex items-center gap-2 pt-1">
                {form.is_published ? (
                  <Badge className="bg-blue-50 text-blue-800 border-blue-200">
                    <Eye className="w-3 h-3 mr-1" />
                    공개
                  </Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground border-border">
                    <EyeOff className="w-3 h-3 mr-1" />
                    비공개
                  </Badge>
                )}
                {form.is_free && (
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200">무료</Badge>
                )}
              </div>
            </div>
          </section>

          {/* 배지 설정 */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">배지 설정</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.badge_new}
                  onChange={e => updateField('badge_new', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded">NEW</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.badge_best}
                  onChange={e => updateField('badge_best', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-600 rounded">BEST</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.badge_sale}
                  onChange={e => updateField('badge_sale', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-500 rounded">SALE</span>
                {discount > 0 && (
                  <span className="text-xs text-muted-foreground">(-{discount}%)</span>
                )}
              </label>
            </div>
          </section>

          {/* 파일 정보 */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-3">파일 정보</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">파일 형식</label>
                <input
                  value={form.format}
                  onChange={e => updateField('format', e.target.value)}
                  placeholder="예: PPTX, HWP"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">페이지 수</label>
                <input
                  value={form.pages}
                  onChange={e => updateField('pages', e.target.value)}
                  placeholder="예: 45"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">파일 크기</label>
                <input
                  value={form.file_size}
                  onChange={e => updateField('file_size', e.target.value)}
                  placeholder="예: 18MB"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* 판매자 */}
          <section className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              판매자
            </h2>
            <input
              value={form.seller}
              onChange={e => updateField('seller', e.target.value)}
              placeholder="판매자명"
              className={inputClass}
            />
          </section>

          {/* 빠른 미리보기 */}
          {form.thumbnail_url && (
            <section className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-sm font-bold text-foreground mb-3">미리보기</h2>
              <div className="rounded-xl overflow-hidden border border-border/50 bg-muted">
                <div className="aspect-square relative">
                  <img
                    src={form.thumbnail_url}
                    alt="미리보기"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    {form.badge_new && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-white rounded">NEW</span>
                    )}
                    {form.badge_best && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded">BEST</span>
                    )}
                    {form.badge_sale && discount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded">-{discount}%</span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{form.title || '상품명'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{form.description || '상품 설명'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {form.is_free ? (
                      <span className="text-xs font-bold text-purple-600">무료</span>
                    ) : (
                      <>
                        {form.original_price > form.price && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {form.original_price.toLocaleString()}원
                          </span>
                        )}
                        <span className="text-xs font-bold text-foreground">
                          {form.price.toLocaleString()}원
                        </span>
                      </>
                    )}
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                      ))}
                      {form.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{form.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
        {/* END RIGHT SIDEBAR */}
      </div>
    </div>
  )
}
