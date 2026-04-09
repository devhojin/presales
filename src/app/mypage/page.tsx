'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, MessageSquare, User, Loader2, Mail, Phone, Building, Pencil, Save, X, Lock, Eye, EyeOff, ChevronDown, ShoppingBag, AlertTriangle, Heart, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { validatePassword } from '@/lib/password-policy'
import { useToastStore } from '@/stores/toast-store'

interface Profile {
  name: string | null
  email: string
  phone: string | null
  company: string | null
  role: string
  created_at: string
}

interface OrderItem {
  id: number
  quantity: number
  unit_price: number
  products: { id: number; title: string; price: number } | { id: number; title: string; price: number }[] | null
}

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  created_at: string
  paid_at?: string | null
  refund_reason?: string | null
  order_items?: OrderItem[]
}

interface PurchasedProduct {
  id: number
  title: string
  thumbnail_url: string | null
  format: string | null
  file_size: string | null
  is_free: boolean
}

interface DownloadLog {
  id: number
  product_id: number
  file_name: string
  downloaded_at: string
  products?: { title: string } | { title: string }[] | null
}

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '대기', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  paid: { label: '결제완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: '완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소', class: 'bg-red-50 text-red-700 border-red-200' },
  refunded: { label: '환불', class: 'bg-muted text-muted-foreground border-border' },
  pending_refund: { label: '환불문의', class: 'bg-orange-50 text-orange-700 border-orange-200' },
}

type TabId = 'orders' | 'downloads' | 'profile'

export default function MyPage() {
  const router = useRouter()
  const { addToast } = useToastStore()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([])
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('orders')
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', company: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  const [showDeleteAccountPw, setShowDeleteAccountPw] = useState(false)
  const pwCheck = validatePassword(newPassword)
  // Refund modal state
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  // Download history collapsible
  const [showDownloadHistory, setShowDownloadHistory] = useState(false)

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
        supabase.from('orders').select('id, order_number, total_amount, status, created_at, paid_at, refund_reason, order_items(id, quantity, unit_price, products(id, title, price))').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('download_logs').select('id, product_id, file_name, downloaded_at, products(title)').eq('user_id', user.id).order('downloaded_at', { ascending: false }).limit(50),
      ])

      // Load purchased products (from paid orders)
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('id, order_items(product_id, products(id, title, thumbnail_url, format, file_size, is_free))')
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed'])
      const productsMap = new Map<number, PurchasedProduct>()
      if (paidOrders) {
        for (const order of paidOrders) {
          const items = (order.order_items || []) as { product_id: number; products: PurchasedProduct | PurchasedProduct[] | null }[]
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

  async function handleProductDownload(productId: number, _productTitle: string) {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || '다운로드 실패', 'error')
        return
      }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch {
      addToast('다운로드 중 오류가 발생했습니다', 'error')
      return
    }

    // Refresh logs
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newLogs } = await supabase
      .from('download_logs')
      .select('id, product_id, file_name, downloaded_at, products(title)')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false })
      .limit(50)
    setDownloadLogs((newLogs || []) as DownloadLog[])

    // Review CTA toast after successful download
    setTimeout(() => {
      addToast('이 상품이 도움이 되셨나요? 상품 페이지에서 리뷰를 작성해주세요!', 'info')
    }, 1500)
  }

  async function handleRefundRequest(orderId: number, reason: string) {
    setRefundSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ refund_reason: reason })
        .eq('id', orderId)
      if (error) {
        addToast('환불 문의 접수에 실패했습니다: ' + error.message, 'error')
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, refund_reason: reason } : o))
        setRefundOrderId(null)
        setRefundReason('')
        addToast('환불 문의가 접수되었습니다. 관리자 검토 후 처리됩니다.', 'success')
      }
    } catch {
      addToast('환불 문의 접수 중 오류가 발생했습니다', 'error')
    } finally {
      setRefundSubmitting(false)
    }
  }

  function printReceipt(order: Order) {
    const printWindow = window.open('', '_blank', 'width=600,height=800')
    if (!printWindow) return

    const receiptDate = order.paid_at ? new Date(order.paid_at).toLocaleDateString('ko-KR') : new Date(order.created_at).toLocaleDateString('ko-KR')
    const orderItems = order.order_items || []

    const itemsHtml = orderItems.map((item) => {
      const prod = Array.isArray(item.products) ? item.products[0] : item.products
      const productTitle = prod?.title || '상품'
      const quantity = item.quantity > 1 ? `x${item.quantity}` : ''
      const totalPrice = (item.unit_price * item.quantity).toLocaleString()
      return `<tr><td>${productTitle}${quantity ? ' ' + quantity : ''}</td><td style="text-align:right">${totalPrice}원</td></tr>`
    }).join('')

    const htmlContent = `
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>거래 영수증</title>
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; max-width: 500px; margin: 0 auto; color: #333; }
        h1 { text-align: center; font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; margin: 0 0 24px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; font-size: 14px; }
        th { background: #f5f5f5; font-weight: 600; }
        td { padding: 10px 8px; }
        .total { font-weight: bold; font-size: 18px; text-align: right; padding-top: 16px; border-top: 2px solid #333; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        .info { margin: 16px 0; }
        .info dt { color: #999; font-size: 12px; margin: 8px 0 4px 0; }
        .info dd { margin: 0 0 12px 0; font-weight: 500; font-size: 14px; }
        .company-info { margin-top: 32px; padding: 16px; background: #fafafa; border-radius: 4px; font-size: 13px; }
        hr { margin: 20px 0; border: none; border-top: 1px solid #ddd; }
        .footer p { margin: 8px 0; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>거래 영수증</h1>

      <dl class="info">
        <dt>주문번호</dt>
        <dd>${order.order_number || order.id}</dd>
        <dt>발행일</dt>
        <dd>${receiptDate}</dd>
      </dl>

      <table>
        <thead>
          <tr>
            <th>상품명</th>
            <th style="text-align:right">금액</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="2">상품 정보가 없습니다.</td></tr>'}
        </tbody>
      </table>

      <p class="total">합계: ${order.total_amount?.toLocaleString()}원</p>

      <hr />

      <div class="company-info">
        <dl class="info">
          <dt>공급자</dt>
          <dd>주식회사 아마란스</dd>
          <dt>대표</dt>
          <dd>채호진</dd>
          <dt>사업자등록번호</dt>
          <dd>000-00-00000</dd>
          <dt>이메일</dt>
          <dd>hojin@amarans.co.kr</dd>
        </dl>
      </div>

      <div class="footer">
        <p>이 영수증은 전자상거래 거래증빙용입니다.</p>
        <button onclick="window.print()" style="margin-top: 16px; padding: 8px 24px; cursor: pointer; border: 1px solid #999; background: #fff; border-radius: 4px; font-size: 14px;">인쇄</button>
      </div>
    </body>
    </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
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

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
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
        <div>
          {activeTab === 'orders' && (
            <div className="border border-border rounded-xl p-6">
              <h2 className="font-semibold mb-4">주문 내역</h2>
              <Separator className="mb-6" />
              {orders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">아직 주문 내역이 없습니다</p>
                  <p className="text-sm mt-2">스토어에서 제안서를 둘러보세요!</p>
                  <Link
                    href="/store"
                    className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    스토어 바로가기
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id
                    const items = (order.order_items || []) as OrderItem[]
                    const statusInfo = statusMap[order.status] || { label: order.status, class: 'bg-muted text-muted-foreground border-border' }
                    return (
                      <div key={order.id} className="rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer text-left"
                        >
                          <div>
                            <p className="text-sm font-mono text-muted-foreground">{order.order_number}</p>
                            <p className="text-sm font-semibold mt-1">{formatPrice(order.total_amount)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge className={`text-xs border ${statusInfo.class}`}>
                                {statusInfo.label}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span>주문일시: {new Date(order.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="mx-1">|</span>
                              <span>상태: </span>
                              <Badge className={`text-[10px] border ${statusInfo.class}`}>{statusInfo.label}</Badge>
                            </div>

                            {items.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">상품 정보가 없습니다.</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">포함 상품</p>
                                {items.map((item) => {
                                  const prod = Array.isArray(item.products) ? item.products[0] : item.products
                                  return (
                                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-background border border-border">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{prod?.title || '-'}</p>
                                        {item.quantity > 1 && (
                                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <p className="text-sm font-medium">{formatPrice(item.unit_price)}</p>
                                        {(order.status === 'paid' || order.status === 'completed') && prod && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleProductDownload(prod.id, prod.title)
                                            }}
                                            className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                                          >
                                            <Download className="w-3 h-3" />
                                            다운로드
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              <div className="flex items-center gap-2">
                                {(order.status === 'paid' || order.status === 'completed') && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); printReceipt(order) }}
                                    className="px-3 py-1.5 rounded-lg border border-blue-300 text-primary text-xs font-medium hover:bg-primary/8 transition-colors cursor-pointer"
                                  >
                                    영수증
                                  </button>
                                )}
                                {order.status === 'paid' && !order.refund_reason && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setRefundOrderId(order.id); setRefundReason('') }}
                                    className="px-3 py-1.5 rounded-lg border border-orange-300 text-orange-600 text-xs font-medium hover:bg-orange-50 transition-colors cursor-pointer"
                                  >
                                    환불 문의
                                  </button>
                                )}
                                {order.refund_reason && (
                                  <p className="text-xs text-orange-600">환불 문의 접수됨</p>
                                )}
                              </div>
                              <p className="text-sm font-semibold">합계: {formatPrice(order.total_amount)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'downloads' && (
            <div className="space-y-6">
              {/* Purchased products with download buttons */}
              <div className="border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">다운로드 가능한 파일</h2>
                  <span className="text-xs text-muted-foreground">{purchasedProducts.length}개 상품</span>
                </div>
                <Separator className="mb-6" />
                {purchasedProducts.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">구매한 상품이 없습니다</p>
                    <p className="text-sm mt-2">상품을 구매하시면 여기에서 다운로드할 수 있습니다.</p>
                    <Link
                      href="/store"
                      className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      스토어 바로가기
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchasedProducts.map((p) => {
                      const lastLog = downloadLogs.find(l => l.product_id === p.id)
                      return (
                        <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          {p.thumbnail_url ? (
                            <img src={p.thumbnail_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-white/70" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{p.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {p.format && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-primary/8 text-primary border-blue-200 border">
                                  {p.format}
                                </Badge>
                              )}
                              {p.file_size && (
                                <span className="text-xs text-muted-foreground">{p.file_size}</span>
                              )}
                              {lastLog && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  최근 {formatDate(lastLog.downloaded_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleProductDownload(p.id, p.title)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            다운로드
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Download history — collapsible */}
              {downloadLogs.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDownloadHistory(prev => !prev)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer text-left"
                  >
                    <h2 className="font-semibold text-sm">최근 다운로드 이력</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{downloadLogs.length}건</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDownloadHistory ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {showDownloadHistory && (
                    <div className="border-t border-border px-6 py-4">
                      <div className="space-y-2">
                        {downloadLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{(Array.isArray(log.products) ? log.products[0]?.title : log.products?.title) || '-'}</p>
                              <p className="text-xs text-muted-foreground">{log.file_name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground shrink-0 ml-3">{formatDate(log.downloaded_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && profile && (
            <div className="space-y-6">
              <div className="border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">내 정보</h2>
                  {!editingProfile ? (
                    <button
                      onClick={() => {
                        setProfileForm({ name: profile.name || '', phone: profile.phone || '', company: profile.company || '' })
                        setEditingProfile(true)
                        setProfileMsg('')
                      }}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> 수정
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditingProfile(false); setProfileMsg('') }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> 취소
                    </button>
                  )}
                </div>
                <Separator className="mb-6" />

                {profileMsg && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${profileMsg.includes('완료') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {profileMsg}
                  </div>
                )}

                {!editingProfile ? (
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
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <User className="w-3.5 h-3.5" /> 이름
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="이름을 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <Mail className="w-3.5 h-3.5" /> 이메일
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        title="이메일 (변경 불가)"
                        placeholder="이메일"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <Phone className="w-3.5 h-3.5" /> 연락처
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="010-1234-5678"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <Building className="w-3.5 h-3.5" /> 회사명
                      </label>
                      <input
                        type="text"
                        value={profileForm.company}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="회사명을 입력하세요"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        setProfileSaving(true)
                        setProfileMsg('')
                        try {
                          const supabase = createClient()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) { setProfileMsg('로그인이 필요합니다.'); return }
                          const { error } = await supabase
                            .from('profiles')
                            .update({
                              name: profileForm.name || null,
                              phone: profileForm.phone || null,
                              company: profileForm.company || null,
                            })
                            .eq('id', user.id)
                          if (error) {
                            setProfileMsg('저장에 실패했습니다: ' + error.message)
                          } else {
                            setProfile(prev => prev ? { ...prev, name: profileForm.name || null, phone: profileForm.phone || null, company: profileForm.company || null } : prev)
                            setEditingProfile(false)
                            setProfileMsg('프로필이 저장 완료되었습니다.')
                          }
                        } catch {
                          setProfileMsg('저장 중 오류가 발생했습니다.')
                        } finally {
                          setProfileSaving(false)
                        }
                      }}
                      disabled={profileSaving}
                      className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {profileSaving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                )}
              </div>

              {/* 비밀번호 변경 */}
              <div className="border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4" /> 비밀번호 변경
                  </h2>
                  {!showPasswordSection && (
                    <button
                      onClick={() => { setShowPasswordSection(true); setPwMsg(''); setNewPassword(''); setConfirmPassword('') }}
                      className="text-sm text-primary hover:underline cursor-pointer"
                    >
                      변경하기
                    </button>
                  )}
                </div>
                <Separator className="mb-6" />

                {pwMsg && (
                  <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${pwMsg.includes('완료') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {pwMsg}
                  </div>
                )}

                {!showPasswordSection ? (
                  <p className="text-sm text-muted-foreground">비밀번호를 변경하려면 &quot;변경하기&quot; 버튼을 클릭하세요.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">새 비밀번호</label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="새 비밀번호 입력"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Password strength gauge */}
                      {newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwCheck.score ? pwCheck.color : 'bg-gray-200'}`}
                              />
                            ))}
                          </div>
                          <p className={`text-xs ${pwCheck.valid ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            강도: {pwCheck.label}
                          </p>
                          {pwCheck.errors.length > 0 && (
                            <ul className="text-xs text-red-500 space-y-0.5">
                              {pwCheck.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">비밀번호 확인</label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="비밀번호 확인 입력"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setPwMsg('')
                          if (!pwCheck.valid) { setPwMsg('비밀번호 정책을 충족하지 않습니다.'); return }
                          if (newPassword !== confirmPassword) { setPwMsg('비밀번호가 일치하지 않습니다.'); return }
                          setPwSaving(true)
                          try {
                            const supabase = createClient()
                            const { error } = await supabase.auth.updateUser({ password: newPassword })
                            if (error) {
                              setPwMsg('비밀번호 변경 실패: ' + error.message)
                            } else {
                              setPwMsg('비밀번호가 변경 완료되었습니다.')
                              setNewPassword('')
                              setConfirmPassword('')
                              setShowPasswordSection(false)
                            }
                          } catch {
                            setPwMsg('비밀번호 변경 중 오류가 발생했습니다.')
                          } finally {
                            setPwSaving(false)
                          }
                        }}
                        disabled={pwSaving || !pwCheck.valid || newPassword !== confirmPassword || !newPassword}
                        className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {pwSaving ? '변경 중...' : '비밀번호 변경'}
                      </button>
                      <button
                        onClick={() => { setShowPasswordSection(false); setNewPassword(''); setConfirmPassword(''); setPwMsg('') }}
                        className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted transition-colors cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 회원 탈퇴 */}
              <div className="border border-red-200 rounded-xl p-6">
                <h2 className="font-semibold text-red-600 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4" /> 회원 탈퇴
                </h2>
                <Separator className="mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  탈퇴하시면 주문 내역과 다운로드 이력이 삭제되며 복구할 수 없습니다.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteAccount(true)}
                  className="h-10 px-5 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer"
                >
                  회원 탈퇴
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 환불 문의 모달 */}
      {refundOrderId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setRefundOrderId(null); setRefundReason('') }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setRefundOrderId(null); setRefundReason('') } }}
        >
          <div
            className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">환불 문의</h3>
              <button
                type="button"
                onClick={() => { setRefundOrderId(null); setRefundReason('') }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              환불 사유를 입력해주세요. 관리자 검토 후 순차적으로 처리됩니다.
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={4}
              placeholder="환불 사유를 상세히 입력해주세요..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setRefundOrderId(null); setRefundReason('') }}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={refundSubmitting || !refundReason.trim()}
                onClick={() => handleRefundRequest(refundOrderId, refundReason.trim())}
                className="flex-1 h-10 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {refundSubmitting ? '접수 중...' : '문의 접수'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {showDeleteAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDeleteAccount(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDeleteAccount(false) }}
        >
          <div
            className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">회원 탈퇴</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              탈퇴하면 주문 내역과 다운로드 이력이 삭제됩니다. 정말 탈퇴하시겠습니까?
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showDeleteAccountPw ? 'text' : 'password'}
                  placeholder="비밀번호 입력"
                  value={deleteAccountPassword}
                  onChange={(e) => setDeleteAccountPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountPw(!showDeleteAccountPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showDeleteAccountPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAccount(false)
                  setDeleteAccountPassword('')
                  setShowDeleteAccountPw(false)
                }}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={deletingAccount || !deleteAccountPassword.trim()}
                onClick={async () => {
                  setDeletingAccount(true)
                  try {
                    const res = await fetch('/api/auth/delete-account', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ password: deleteAccountPassword }),
                    })
                    if (!res.ok) {
                      const data = await res.json()
                      addToast(data.error || '탈퇴 처리 중 오류가 발생했습니다', 'error')
                      return
                    }
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    addToast('회원 탈퇴가 완료되었습니다', 'info')
                    router.push('/')
                    router.refresh()
                  } catch {
                    addToast('탈퇴 처리 중 오류가 발생했습니다', 'error')
                  } finally {
                    setDeletingAccount(false)
                    setShowDeleteAccount(false)
                    setDeleteAccountPassword('')
                    setShowDeleteAccountPw(false)
                  }
                }}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
