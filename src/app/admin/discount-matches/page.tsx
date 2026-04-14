'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, CheckCircle, X, Loader2, Search } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'
import type { DbProduct, DbProductDiscountMatch } from '@/lib/types'

// ===========================
// Types
// ===========================

interface ProductSearchItem {
  id: number
  title: string
  price: number
  format: string | null
  is_free: boolean
  thumbnail_url: string | null
}

interface DiscountMatch extends DbProductDiscountMatch {
  source_product?: DbProduct
  target_product?: DbProduct
}

// ===========================
// Toast Component
// ===========================

function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'info' ? 'bg-primary' : 'bg-green-600'
  const icon = type === 'error' ? '✕' : '✓'

  return (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div className={`flex items-center gap-2 ${bgColor} text-white px-5 py-3 rounded-xl shadow-lg text-sm`}>
        <span className="font-bold">{icon}</span>
        {message}
      </div>
    </div>
  )
}

// ===========================
// Toast Container
// ===========================

function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-primary' : 'bg-green-600'
          } text-white px-5 py-3 rounded-xl shadow-lg text-sm`}
        >
          <CheckCircle className="w-4 h-4" />
          {toast.message}
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ===========================
// Delete Confirm Modal
// ===========================

function DeleteModal({
  matchId,
  onConfirm,
  onCancel,
}: {
  matchId: number
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
          <h3 className="text-lg font-bold text-foreground">매칭 삭제</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">이 할인 매칭을 삭제하시겠습니까?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Product Search Dropdown
// ===========================

interface ProductSearchItem {
  id: number
  title: string
  price: number
  format: string | null
  is_free: boolean
  thumbnail_url: string | null
}

function ProductSearchDropdown({
  value,
  onChange,
  placeholder,
  onSelect,
}: {
  value: string
  onChange: (query: string) => void
  placeholder: string
  onSelect: (product: ProductSearchItem) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [products, setProducts] = useState<ProductSearchItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProducts([])
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('id, title, price, format, is_free, thumbnail_url')
        .eq('is_published', true)
        .ilike('title', `%${query}%`)
        .limit(100)
      setProducts((data || []) as ProductSearchItem[])
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(value)
    }, 300)
    return () => clearTimeout(timer)
  }, [value, fetchProducts])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {isOpen && value.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="p-3 text-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin inline-block" /> 검색 중...
            </div>
          )}
          {!isLoading && products.length === 0 && (
            <div className="p-3 text-center text-muted-foreground text-sm">검색 결과가 없습니다</div>
          )}
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                onSelect(product)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left hover:bg-primary/8 transition-colors border-b border-border/50 last:border-b-0 text-sm"
            >
              <div className="font-medium text-foreground">{product.title}</div>
              <div className="text-xs text-muted-foreground">
                {product.format && `${product.format} • `}
                {product.is_free || product.price === 0 ? '무료' : `${product.price.toLocaleString('ko-KR')}원`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================
// Discount Match Modal
// ===========================

function MatchModal({
  match,
  onSave,
  onCancel,
}: {
  match?: DiscountMatch | null
  onSave: (data: {
    source_product_id: number
    target_product_id: number
    discount_type: 'auto' | 'manual'
    discount_amount: number
  }) => Promise<void>
  onCancel: () => void
}) {
  const [sourceProduct, setSourceProduct] = useState<ProductSearchItem | null>(
    match?.source_product ? {
      id: match.source_product.id,
      title: match.source_product.title,
      price: match.source_product.price,
      format: match.source_product.format,
      is_free: match.source_product.is_free,
      thumbnail_url: match.source_product.thumbnail_url,
    } : null
  )
  const [targetProduct, setTargetProduct] = useState<ProductSearchItem | null>(
    match?.target_product ? {
      id: match.target_product.id,
      title: match.target_product.title,
      price: match.target_product.price,
      format: match.target_product.format,
      is_free: match.target_product.is_free,
      thumbnail_url: match.target_product.thumbnail_url,
    } : null
  )
  const [discountType, setDiscountType] = useState<'auto' | 'manual'>(match?.discount_type || 'auto')
  const [discountAmount, setDiscountAmount] = useState(match?.discount_amount?.toString() || '0')
  const [sourceQuery, setSourceQuery] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  const handleSave = async () => {
    if (!sourceProduct || !targetProduct) {
      alert('상품을 선택해주세요')
      return
    }
    if (sourceProduct.id === targetProduct.id) {
      alert('다른 상품을 선택해주세요')
      return
    }

    const amount = discountType === 'auto' ? sourceProduct.price : parseInt(discountAmount, 10)
    if (isNaN(amount) || amount <= 0) {
      alert('할인액을 입력해주세요')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        source_product_id: sourceProduct.id,
        target_product_id: targetProduct.id,
        discount_type: discountType,
        discount_amount: amount,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const finalDiscountAmount = discountType === 'auto' && sourceProduct ? sourceProduct.price : parseInt(discountAmount, 10) || 0
  const finalPrice = (targetProduct?.price || 0) - finalDiscountAmount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {match ? '매칭 수정' : '새 매칭 추가'}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-muted-foreground transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Source Product */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              소스 상품 (구매한 상품)
            </label>
            <ProductSearchDropdown
              value={sourceQuery}
              onChange={setSourceQuery}
              placeholder="상품명으로 검색..."
              onSelect={(product) => {
                setSourceProduct(product)
                setSourceQuery(product.title)
              }}
            />
            {sourceProduct && (
              <div className="mt-2 p-3 bg-primary/8 rounded-xl flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium text-foreground">{sourceProduct.title}</div>
                  <div className="text-xs text-muted-foreground">{sourceProduct.price.toLocaleString('ko-KR')}원</div>
                </div>
                <button
                  onClick={() => {
                    setSourceProduct(null)
                    setSourceQuery('')
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Target Product */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              타겟 상품 (구매할 상품)
            </label>
            <ProductSearchDropdown
              value={targetQuery}
              onChange={setTargetQuery}
              placeholder="상품명으로 검색..."
              onSelect={(product) => {
                setTargetProduct(product)
                setTargetQuery(product.title)
              }}
            />
            {targetProduct && (
              <div className="mt-2 p-3 bg-primary/8 rounded-xl flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium text-foreground">{targetProduct.title}</div>
                  <div className="text-xs text-muted-foreground">{targetProduct.price.toLocaleString('ko-KR')}원</div>
                </div>
                <button
                  onClick={() => {
                    setTargetProduct(null)
                    setTargetQuery('')
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">할인 유형</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="discount-type"
                  value="auto"
                  checked={discountType === 'auto'}
                  onChange={() => setDiscountType('auto')}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-foreground">
                  소스 상품 가격만큼 자동 할인
                  {sourceProduct && ` (${sourceProduct.price.toLocaleString('ko-KR')}원)`}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="discount-type"
                  value="manual"
                  checked={discountType === 'manual'}
                  onChange={() => setDiscountType('manual')}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-foreground">직접 입력</span>
              </label>
            </div>
          </div>

          {/* Discount Amount */}
          {discountType === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                할인 금액 (원)
              </label>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                min="0"
                step="1000"
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          {/* Preview */}
          {targetProduct && (
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-xs text-muted-foreground mb-2">미리보기</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">타겟 상품 {targetProduct.price.toLocaleString('ko-KR')}원</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-red-500 font-medium">할인 {finalDiscountAmount.toLocaleString('ko-KR')}원</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-green-600 font-bold">최종가 {finalPrice.toLocaleString('ko-KR')}원</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Main Page Component
// ===========================

export default function DiscountMatchesPage() {
  const [matches, setMatches] = useState<DiscountMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<DiscountMatch | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const addToast = useToastStore((state) => state.addToast)

  // Load matches
  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('product_discount_matches')
        .select(`
          *,
          source_product:products!product_discount_matches_source_product_id_fkey(id, title, price, format, thumbnail_url, is_free),
          target_product:products!product_discount_matches_target_product_id_fkey(id, title, price, format, thumbnail_url, is_free)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Failed to load matches:', error)
      addToast('매칭 목록 로드 실패', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (data: {
    source_product_id: number
    target_product_id: number
    discount_type: 'auto' | 'manual'
    discount_amount: number
  }) => {
    try {
      const supabase = createClient()

      if (editingMatch) {
        const { error } = await supabase
          .from('product_discount_matches')
          .update(data)
          .eq('id', editingMatch.id)

        if (error) throw error
        addToast('매칭이 수정되었습니다', 'success')
      } else {
        const { error } = await supabase
          .from('product_discount_matches')
          .insert([data])

        if (error) throw error
        addToast('새 매칭이 생성되었습니다', 'success')
      }

      setIsModalOpen(false)
      setEditingMatch(null)
      await loadMatches()
    } catch (error) {
      console.error('Failed to save match:', error)
      addToast('매칭 저장 실패', 'error')
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmId === null) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('product_discount_matches')
        .delete()
        .eq('id', deleteConfirmId)

      if (error) throw error
      addToast('매칭이 삭제되었습니다', 'success')
      setDeleteConfirmId(null)
      await loadMatches()
    } catch (error) {
      console.error('Failed to delete match:', error)
      addToast('매칭 삭제 실패', 'error')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">할인 상품 매칭</h1>
        <p className="text-muted-foreground">상품 간 할인을 설정합니다. 소스 상품을 구매한 사용자가 타겟 상품을 구매할 때 할인이 적용됩니다.</p>
      </div>

      {/* Add button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setEditingMatch(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          새 매칭 추가
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">로드 중...</span>
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="text-muted-foreground mb-2">할인 매칭이 없습니다</div>
          <p className="text-sm text-muted-foreground">"새 매칭 추가" 버튼을 클릭하여 할인 매칭을 생성해주세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  소스 상품
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  →
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  타겟 상품
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  할인 유형
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  할인액
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-muted/50 transition-colors">
                  {/* Source Product */}
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{match.source_product?.title || '상품 없음'}</div>
                      {match.source_product && (
                        <div className="text-xs text-muted-foreground">
                          {match.source_product.format && `${match.source_product.format} • `}
                          {match.source_product.price.toLocaleString('ko-KR')}원
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Arrow */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-muted-foreground">→</span>
                  </td>

                  {/* Target Product */}
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-foreground">{match.target_product?.title || '상품 없음'}</div>
                      {match.target_product && (
                        <div className="text-xs text-muted-foreground">
                          {match.target_product.format && `${match.target_product.format} • `}
                          {match.target_product.price.toLocaleString('ko-KR')}원
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Discount Type */}
                  <td className="px-6 py-4 text-center">
                    <Badge
                      variant={match.discount_type === 'auto' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {match.discount_type === 'auto' ? '자동' : '수동'}
                    </Badge>
                  </td>

                  {/* Discount Amount */}
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-red-600">
                      {match.discount_amount.toLocaleString('ko-KR')}원
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-center">
                    <Badge
                      variant={match.is_active ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {match.is_active ? '활성' : '비활성'}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingMatch(match)
                          setIsModalOpen(true)
                        }}
                        className="p-1.5 rounded-xl hover:bg-primary/10 transition-colors text-primary"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(match.id)}
                        className="p-1.5 rounded-xl hover:bg-red-100 transition-colors text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <MatchModal
          match={editingMatch}
          onSave={handleSave}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingMatch(null)
          }}
        />
      )}

      {deleteConfirmId !== null && (
        <DeleteModal
          matchId={deleteConfirmId}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  )
}
