'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, MessageSquare, User, Settings, Loader2, Mail, Phone, Building } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Profile {
  name: string | null
  email: string
  phone: string | null
  company: string | null
  role: string
  created_at: string
}

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  created_at: string
}

interface PurchasedProduct {
  id: number
  title: string
  thumbnail_url: string | null
  format: string | null
  is_free: boolean
}

interface DownloadLog {
  id: number
  product_id: number
  file_name: string
  downloaded_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products?: any
}

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '대기', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  paid: { label: '결제완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소', class: 'bg-gray-50 text-gray-500 border-gray-200' },
  refunded: { label: '환불', class: 'bg-red-50 text-red-700 border-red-200' },
}

type TabId = 'orders' | 'downloads' | 'profile'

export default function MyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([])
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('orders')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }

      const [{ data: profileData }, { data: ordersData }, { data: logsData }] = await Promise.all([
        supabase.from('profiles').select('name, email, phone, company, role, created_at').eq('id', user.id).single(),
        supabase.from('orders').select('id, order_number, total_amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('download_logs').select('id, product_id, file_name, downloaded_at, products(title)').eq('user_id', user.id).order('downloaded_at', { ascending: false }).limit(50),
      ])

      // Load purchased products (from paid orders)
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('id, order_items(product_id, products(id, title, thumbnail_url, format, is_free))')
        .eq('user_id', user.id)
        .eq('status', 'paid')
      const productsMap = new Map<number, PurchasedProduct>()
      if (paidOrders) {
        for (const order of paidOrders) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = (order as any).order_items || []
          for (const item of items) {
            const prod = Array.isArray(item.products) ? item.products[0] : item.products
            if (prod) {
              productsMap.set(prod.id, prod as PurchasedProduct)
            }
          }
        }
      }
      setPurchasedProducts(Array.from(productsMap.values()))

      setProfile(profileData || { name: null, email: user.email || '', phone: null, company: null, role: 'user', created_at: user.created_at || '' })
      setOrders(ordersData || [])
      setDownloadLogs((logsData || []) as DownloadLog[])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleProductDownload(productId: number, productTitle: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get product files
    const { data: files } = await supabase
      .from('product_files')
      .select('file_url, file_name')
      .eq('product_id', productId)
      .limit(1)

    // Log the download
    await supabase.from('download_logs').insert({
      user_id: user.id,
      product_id: productId,
      file_name: files?.[0]?.file_name || productTitle,
    })

    // Increment download count
    const { data: prod } = await supabase.from('products').select('download_count').eq('id', productId).single()
    await supabase.from('products').update({ download_count: ((prod?.download_count) || 0) + 1 }).eq('id', productId)

    if (files && files[0]?.file_url) {
      const a = document.createElement('a')
      a.href = files[0].file_url
      a.download = files[0].file_name || ''
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    // Refresh logs
    const { data: newLogs } = await supabase
      .from('download_logs')
      .select('id, product_id, file_name, downloaded_at, products(title)')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false })
      .limit(50)
    setDownloadLogs((newLogs || []) as DownloadLog[])
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price) + '원'
  const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

  const tabs = [
    { id: 'orders' as TabId, icon: FileText, label: '주문 내역' },
    { id: 'downloads' as TabId, icon: Download, label: '다운로드' },
    { id: 'profile' as TabId, icon: User, label: '내 정보' },
  ]

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">마이페이지</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {activeTab === 'orders' && (
            <div className="border border-border rounded-xl p-6">
              <h2 className="font-semibold mb-4">주문 내역</h2>
              <Separator className="mb-6" />
              {orders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">주문 내역이 없습니다</p>
                  <p className="text-sm mt-2">템플릿을 구매하시면 여기에 표시됩니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-mono text-muted-foreground">{order.order_number}</p>
                        <p className="text-sm font-semibold mt-1">{formatPrice(order.total_amount)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-xs border ${statusMap[order.status]?.class || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'downloads' && (
            <div className="space-y-6">
              {/* Purchased products with download buttons */}
              <div className="border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">구매한 상품</h2>
                <Separator className="mb-6" />
                {purchasedProducts.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">구매한 상품이 없습니다</p>
                    <p className="text-sm mt-2">상품을 구매하시면 여기에서 다운로드할 수 있습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchasedProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center shrink-0">
                              <span className="text-lg">📄</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{p.title}</p>
                            {p.format && <p className="text-xs text-muted-foreground">{p.format}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleProductDownload(p.id, p.title)}
                          className="ml-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          다운로드
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Download history */}
              <div className="border border-border rounded-xl p-6">
                <h2 className="font-semibold mb-4">다운로드 내역</h2>
                <Separator className="mb-6" />
                {downloadLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">다운로드 내역이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {downloadLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{(Array.isArray(log.products) ? log.products[0]?.title : log.products?.title) || '-'}</p>
                          <p className="text-xs text-muted-foreground">{log.file_name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0 ml-3">{formatDate(log.downloaded_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && profile && (
            <div className="border border-border rounded-xl p-6">
              <h2 className="font-semibold mb-4">내 정보</h2>
              <Separator className="mb-6" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">이름</p>
                    <p className="text-sm font-medium">{profile.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">이메일</p>
                    <p className="text-sm font-medium">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">연락처</p>
                    <p className="text-sm font-medium">{profile.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">회사명</p>
                    <p className="text-sm font-medium">{profile.company || '-'}</p>
                  </div>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  가입일: {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
