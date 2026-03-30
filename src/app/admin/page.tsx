'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Package, ShoppingCart, Users, MessageSquare, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    members: 0,
    consulting: 0,
    revenue: 0,
  })

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      const [products, orders, members, consulting] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('consulting_requests').select('id', { count: 'exact', head: true }),
      ])

      const { data: paidOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'paid')

      setStats({
        products: products.count || 0,
        orders: orders.count || 0,
        members: members.count || 0,
        consulting: consulting.count || 0,
        revenue: paidOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0,
      })
    }
    loadStats()
  }, [])

  const cards = [
    { icon: Package, label: '등록 상품', value: stats.products + '개', color: 'bg-blue-500' },
    { icon: ShoppingCart, label: '총 주문', value: stats.orders + '건', color: 'bg-emerald-500' },
    { icon: Users, label: '가입 회원', value: stats.members + '명', color: 'bg-purple-500' },
    { icon: MessageSquare, label: '컨설팅 신청', value: stats.consulting + '건', color: 'bg-amber-500' },
    { icon: TrendingUp, label: '총 매출', value: new Intl.NumberFormat('ko-KR').format(stats.revenue) + '원', color: 'bg-red-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">관리자 대시보드</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
