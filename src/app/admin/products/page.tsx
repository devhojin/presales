'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ===========================
// Types
// ===========================

interface Category {
  id: number
  name: string
}

interface Product {
  id: number
  title: string
  price: number
  original_price: number
  tier: string
  is_published: boolean
  is_free: boolean
  download_count: number
  created_at: string
  category_id: number | null
  category_ids: number[] | null
  format: string | null
  sort_order: number | null
  categories: { name: string }[] | { name: string } | null
}

type StatusFilter = 'all' | 'published' | 'unpublished'

const PAGE_SIZES = [20, 50, 100] as const


function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return dateStr.split('T')[0]
}

// ===========================
// Toast
// ===========================

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])
  return (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm">
        <CheckCircle className="w-4 h-4 text-green-400" />
        {message}
      </div>
    </div>
  )
}

// ===========================
// Delete Confirm Modal
// ===========================

function DeleteModal({
  productName,
  onConfirm,
  onCancel,
}: {
  productName: string
  onConfirm: () => void
  onCancel: () => void
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
        className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">상품 삭제</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">&apos;{productName}&apos;을 삭제하시겠습니까?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Sortable Row
// ===========================

function SortableProductRow({
  product,
  onTogglePublish,
  onDelete,
}: {
  product: Product
  onTogglePublish: (id: number, current: boolean) => void
  onDelete: (id: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : undefined,
    background: isDragging ? '#f0f6ff' : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
    >
      {/* Drag handle */}
      <td className="px-2 py-3 w-10">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 cursor-grab active:cursor-grabbing"
          title="드래그하여 순서 변경"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
      </td>
      <ProductRowCells
        product={product}
        onTogglePublish={onTogglePublish}
        onDelete={onDelete}
      />
    </tr>
  )
}

// ===========================
// Row Cells (shared between sortable / non-sortable)
// ===========================

function ProductRowCells({
  product,
  onTogglePublish,
  onDelete,
}: {
  product: Product
  onTogglePublish: (id: number, current: boolean) => void
  onDelete: (id: number) => void
}) {
  return (
    <>
      {/* Title + external link */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/products/${product.id}`}
            className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate max-w-[300px] block"
          >
            {product.title}
          </Link>
          <a
            href={`/store/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
            title="스토어 페이지 열기"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500 transition-colors" />
          </a>
        </div>
      </td>
      {/* Category */}
      <td className="px-3 py-3 text-sm text-gray-500">
        {Array.isArray(product.categories)
          ? product.categories[0]?.name || '-'
          : product.categories?.name || '-'}
      </td>
      {/* Price */}
      <td className="px-3 py-3 text-right">
        {product.is_free || product.price === 0 ? (
          <span className="font-medium text-emerald-600">무료</span>
        ) : (
          <div>
            <span className="text-sm font-medium text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.original_price > product.price && (
              <p className="text-xs text-gray-400 line-through">
                {formatPrice(product.original_price)}
              </p>
            )}
          </div>
        )}
      </td>
      {/* 무료/유료 */}
      <td className="px-3 py-3">
        <Badge
          className={`text-xs border ${product.is_free ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
        >
          {product.is_free ? '무료' : '유료'}
        </Badge>
      </td>
      {/* Status */}
      <td className="px-3 py-3 text-center">
        <Badge
          className={
            product.is_published
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }
        >
          {product.is_published ? '공개' : '비공개'}
        </Badge>
      </td>
      {/* Download count */}
      <td className="px-3 py-3 text-center text-sm text-gray-500">
        {product.download_count}
      </td>
      {/* Created date */}
      <td className="px-3 py-3 text-center text-xs text-gray-500">
        {formatDate(product.created_at)}
      </td>
      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/products/${product.id}`}
            className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
            title="수정"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onTogglePublish(product.id, product.is_published)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={product.is_published ? '비공개로 변경' : '공개로 변경'}
          >
            {product.is_published ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  )
}

// ===========================
// Main Page
// ===========================

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [pageSize, setPageSize] = useState<number>(20)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('id, title, price, original_price, tier, is_published, is_free, download_count, created_at, category_id, format, sort_order, categories(name)')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (data) setProducts(data as Product[])
    setLoading(false)
  }, [supabase])

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true })
    if (data) setCategories(data)
  }, [supabase])

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = products.findIndex((p) => p.id === active.id)
      const newIndex = products.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(products, oldIndex, newIndex)
      setProducts(reordered)

      const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }))
      const changedUpdates = updates.filter((u) => {
        const original = products.find((p) => p.id === u.id)
        return original && original.sort_order !== u.sort_order
      })
      if (changedUpdates.length === 0) return

      setSaving(true)
      try {
        const promises = changedUpdates.map((u) =>
          supabase.from('products').update({ sort_order: u.sort_order }).eq('id', u.id)
        )
        await Promise.all(promises)
        setProducts(reordered.map((p, i) => ({ ...p, sort_order: i + 1 })))
        setToast('순서가 변경되었습니다')
      } catch {
        setProducts(products)
        setToast('순서 변경 실패')
      } finally {
        setSaving(false)
      }
    },
    [products, supabase]
  )

  // Toggle publish
  const handleTogglePublish = async (id: number, current: boolean) => {
    await supabase.from('products').update({ is_published: !current }).eq('id', id)
    setToast(current ? '비공개로 변경되었습니다' : '공개로 변경되었습니다')
    loadProducts()
  }

  // Delete
  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    await supabase.from('products').delete().eq('id', id)
    setToast('상품이 삭제되었습니다')
    loadProducts()
  }

  // Status counts
  const statusCounts = useMemo(
    () => ({
      all: products.length,
      published: products.filter((p) => p.is_published).length,
      unpublished: products.filter((p) => !p.is_published).length,
    }),
    [products]
  )

  // Filtering
  const filtered = useMemo(() => {
    let list = products
    if (statusFilter === 'published') list = list.filter((p) => p.is_published)
    if (statusFilter === 'unpublished') list = list.filter((p) => !p.is_published)
    if (categoryFilter !== null) list = list.filter((p) => {
      const ids = Array.isArray(p.category_ids) && p.category_ids.length > 0
        ? p.category_ids
        : p.category_id ? [p.category_id] : []
      return ids.includes(categoryFilter)
    })
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q))
    }
    return list
  }, [products, statusFilter, categoryFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)
  const isDragEnabled =
    statusFilter === 'all' && categoryFilter === null && !search.trim() && totalPages <= 1

  // Pagination range
  const getPageRange = () => {
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">상품 관리</h1>
            <p className="text-sm text-gray-500 mt-1">전체 {products.length}개 상품</p>
          </div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            상품 등록
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => {
              setCategoryFilter(null)
              setPage(1)
            }}
            className={`px-4 py-2 text-sm font-medium rounded-full transition ${
              categoryFilter === null
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => {
            const catCount = products.filter((p) => {
              const ids = Array.isArray(p.category_ids) && p.category_ids.length > 0
                ? p.category_ids
                : p.category_id ? [p.category_id] : []
              return ids.includes(cat.id)
            }).length
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryFilter(cat.id)
                  setPage(1)
                }}
                className={`px-4 py-2 text-sm font-medium rounded-full transition ${
                  categoryFilter === cat.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name} ({catCount})
              </button>
            )
          })}
        </div>

        {/* Status Tabs + Search + Page Size */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1">
            {(
              [
                { key: 'all' as StatusFilter, label: '전체' },
                { key: 'published' as StatusFilter, label: '공개' },
                { key: 'unpublished' as StatusFilter, label: '비공개' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key)
                  setPage(1)
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  statusFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 text-xs ${
                    statusFilter === tab.key ? 'text-gray-300' : 'text-gray-400'
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="상품명 검색..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
              />
            </div>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-gray-400 mr-1">보기</span>
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pageSize === size
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {size}개
              </button>
            ))}
          </div>
        </div>

        {/* Drag hint */}
        {isDragEnabled ? (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <GripVertical className="w-3.5 h-3.5" />
            좌측 핸들을 드래그하여 순서 변경 (위쪽 = 스토어 상단 노출)
            {saving && <span className="ml-2 text-blue-500">저장 중...</span>}
          </p>
        ) : (statusFilter !== 'all' || categoryFilter !== null || search.trim()) && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            필터를 해제하면 순서를 변경할 수 있습니다
          </p>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10" />
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 min-w-[260px]">
                    상품명
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 w-28">
                    카테고리
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 w-28">
                    가격
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-20">
                    구분
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-20">
                    상태
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-20">
                    다운로드
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 w-24">
                    등록일
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 w-28">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                      로딩 중...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">
                      {search ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
                    </td>
                  </tr>
                ) : isDragEnabled ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={paginated.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {paginated.map((product) => (
                        <SortableProductRow
                          key={product.id}
                          product={product}
                          onTogglePublish={handleTogglePublish}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  paginated.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-2 py-3 w-10">
                        <div className="flex items-center justify-center w-7 h-7">
                          <GripVertical className="w-4 h-4 text-gray-200" />
                        </div>
                      </td>
                      <ProductRowCells
                        product={product}
                        onTogglePublish={handleTogglePublish}
                        onDelete={handleDelete}
                      />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              총 {filtered.length}개 중{' '}
              {filtered.length === 0
                ? '0'
                : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)}`}
              개
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {getPageRange().map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirm Modal */}
        {deleteConfirmId !== null && (
          <DeleteModal
            productName={products.find((p) => p.id === deleteConfirmId)?.title || ''}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}

        {/* Toast */}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  )
}
