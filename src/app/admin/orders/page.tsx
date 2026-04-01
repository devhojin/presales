'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

interface Order {
  id: number
  order_number: string
  user_id: string
  total_amount: number
  status: string
  payment_method: string | null
  created_at: string
  paid_at: string | null
}

interface ProfileMap {
  [userId: string]: { name: string; email: string }
}

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '대기', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  paid: { label: '결제완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소', class: 'bg-gray-50 text-gray-500 border-gray-200' },
  refunded: { label: '환불', class: 'bg-red-50 text-red-700 border-red-200' },
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [profileMap, setProfileMap] = useState<ProfileMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    const orderList = (data || []) as Order[]
    setOrders(orderList)

    // Fetch profiles for all user_ids
    const userIds = [...new Set(orderList.map(o => o.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      const map: ProfileMap = {}
      if (profiles) {
        for (const p of profiles) {
          map[p.id] = { name: p.name || '-', email: p.email || '-' }
        }
      }
      setProfileMap(map)
    }

    setLoading(false)
  }

  async function updateStatus(id: number, status: string) {
    const supabase = createClient()
    const updates: Record<string, unknown> = { status }
    if (status === 'paid') updates.paid_at = new Date().toISOString()
    if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()

    await supabase.from('orders').update(updates).eq('id', id)
    loadOrders()
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price) + '원'
  const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">주문 관리</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">주문번호</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">주문자</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">금액</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">주문일</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">로딩 중...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">주문 내역이 없습니다</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">{order.order_number}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{profileMap[order.user_id]?.name || '-'}</p>
                    <p className="text-xs text-gray-400">{profileMap[order.user_id]?.email || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">{formatPrice(order.total_amount)}</td>
                  <td className="px-6 py-4">
                    <Badge className={`text-xs border ${statusMap[order.status]?.class || ''}`}>
                      {statusMap[order.status]?.label || order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(order.id, 'paid')}
                          className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          결제확인
                        </button>
                      )}
                      {order.status === 'paid' && (
                        <button
                          onClick={() => updateStatus(order.id, 'refunded')}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          환불
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-gray-100"
                        >
                          취소
                        </button>
                      )}
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
