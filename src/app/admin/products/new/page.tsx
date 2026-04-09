'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function NewProductPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    async function createAndRedirect() {
      const supabase = createClient()

      const { data, error: insertError } = await supabase
        .from('products')
        .insert({
          title: '새 상품 (수정해주세요)',
          price: 0,
          original_price: 0,
          is_free: true,
          is_published: false,
          download_count: 0,
        })
        .select('id')
        .single()

      if (insertError || !data) {
        setError('상품 생성에 실패했습니다: ' + (insertError?.message || ''))
        return
      }

      router.replace(`/admin/products/${data.id}`)
    }

    createAndRedirect()
  }, [router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
        >
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">상품을 생성하고 있습니다...</span>
      </div>
    </div>
  )
}
