'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

interface Product {
  id: number
  title: string
  price: number
  original_price: number
  tier: string
  is_published: boolean
  download_count: number
  created_at: string
  categories: { name: string } | null
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  async function togglePublish(id: number, current: boolean) {
    const supabase = createClient()
    await supabase.from('products').update({ is_published: !current }).eq('id', id)
    loadProducts()
  }

  async function deleteProduct(id: number) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price) + '원'

  const tierLabels: Record<string, { label: string; class: string }> = {
    basic: { label: '기본', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    premium: { label: '프리미엄', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    package: { label: '패키지', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 상품 등록
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상품명</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">카테고리</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">가격</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">티어</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">다운로드</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  로딩 중...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  등록된 상품이 없습니다
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.title}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {product.categories?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`text-xs border ${tierLabels[product.tier]?.class || ''}`}>
                      {tierLabels[product.tier]?.label || product.tier}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={product.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}>
                      {product.is_published ? '공개' : '비공개'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {product.download_count}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => togglePublish(product.id, product.is_published)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title={product.is_published ? '비공개로 변경' : '공개로 변경'}
                      >
                        {product.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
