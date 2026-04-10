'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Download, User, Loader2, Mail, Phone, Building, Pencil, Save, X,
  Lock, Eye, EyeOff, ChevronDown, ShoppingBag, AlertTriangle, Clock, Bookmark,
  ExternalLink, Megaphone, Rss, Package, ArrowRight, Store, BookOpen,
  ArrowLeft, BookmarkCheck, MessageCircle, CreditCard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { validatePassword } from '@/lib/password-policy'
import { useToastStore } from '@/stores/toast-store'

// ===========================
// Types
// ===========================

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

interface ActivityItem {
  type: 'order' | 'download' | 'bookmark'
  text: string
  time: string
  raw: Date
}

interface ChatPaymentRequest {
  id: string; title: string; amount: number; status: string; created_at: string; description: string | null
}

interface BookmarkAnn { id: string; title: string; organization: string | null; status: string; end_date: string | null; source_url: string | null }
interface BookmarkFeed { id: string; title: string; category: string; external_url: string | null }

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '대기', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  paid: { label: '결제완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: '완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소', class: 'bg-red-50 text-red-700 border-red-200' },
  refunded: { label: '환불', class: 'bg-muted text-muted-foreground border-border' },
  pending_refund: { label: '환불문의', class: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price) + '원'
const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return formatDate(date.toISOString())
}

// ===========================
// Main Component
// ===========================

export default function MyConsolePage() {
  const router = useRouter()
  const { addToast } = useToastStore()

  // Data state
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([])
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([])
  const [annBookmarks, setAnnBookmarks] = useState<BookmarkAnn[]>([])
  const [feedBookmarks, setFeedBookmarks] = useState<BookmarkFeed[]>([])
  const [chatPaymentRequests, setChatPaymentRequests] = useState<ChatPaymentRequest[]>([])

  // KPI counts
  const [kpi, setKpi] = useState({ orders: 0, bookmarks: 0, activeAnns: 0, downloads: 0 })

  // UI state
  const [overlay, setOverlay] = useState<'profile' | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [showDownloadHistory, setShowDownloadHistory] = useState(false)

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', company: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Password
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const pwCheck = validatePassword(newPassword)

  // Delete account
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  const [showDeleteAccountPw, setShowDeleteAccountPw] = useState(false)

  // Refund
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)

  // ===========================
  // Data Loading
  // ===========================

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const [
        { data: profileData },
        { data: ordersData },
        { data: logsData },
        { data: annBmData },
        { data: feedBmData },
        { count: activeAnnCount },
      ] = await Promise.all([
        supabase.from('profiles').select('name, email, phone, company, role, created_at').eq('id', user.id).single(),
        supabase.from('orders').select('id, order_number, total_amount, status, created_at, paid_at, refund_reason, order_items(id, quantity, unit_price, products(id, title, price))').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('download_logs').select('id, product_id, file_name, downloaded_at, products(title)').eq('user_id', user.id).order('downloaded_at', { ascending: false }).limit(50),
        supabase.from('announcement_bookmarks').select('announcement_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('feed_bookmarks').select('post_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('is_published', true).eq('status', 'active'),
      ])

      // Purchased products
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
            if (prod) productsMap.set(prod.id, prod as PurchasedProduct)
          }
        }
      }
      setPurchasedProducts(Array.from(productsMap.values()))

      // Announcement bookmarks details
      if (annBmData && annBmData.length > 0) {
        const ids = annBmData.map(b => b.announcement_id)
        const { data: anns } = await supabase.from('announcements').select('id, title, organization, status, end_date, source_url').in('id', ids)
        if (anns) setAnnBookmarks(ids.map(id => anns.find(a => a.id === id)).filter(Boolean) as BookmarkAnn[])
      }

      // Feed bookmarks details
      if (feedBmData && feedBmData.length > 0) {
        const ids = feedBmData.map(b => b.post_id)
        const { data: posts } = await supabase.from('community_posts').select('id, title, category, external_url').in('id', ids)
        if (posts) setFeedBookmarks(ids.map(id => posts.find(p => p.id === id)).filter(Boolean) as BookmarkFeed[])
      }

      setProfile(profileData || { name: null, email: user.email || '', phone: null, company: null, role: 'user', created_at: user.created_at || '' })
      setOrders(ordersData || [])
      setDownloadLogs((logsData || []) as DownloadLog[])
      setKpi({
        orders: ordersData?.length || 0,
        bookmarks: (annBmData?.length || 0) + (feedBmData?.length || 0),
        activeAnns: activeAnnCount || 0,
        downloads: logsData?.length || 0,
      })
      setLoading(false)

      // 채팅 결제요청 내역 로드
      try {
        const prRes = await fetch('/api/chat/payment-request')
        const prData = await prRes.json()
        if (prData.paymentRequests) setChatPaymentRequests(prData.paymentRequests)
      } catch { /* ignore */ }
    }
    load()
  }, [router])

  // ===========================
  // Handlers
  // ===========================

  async function handleProductDownload(productId: number, _title: string) {
    try {
      const res = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
      if (!res.ok) { const d = await res.json(); addToast(d.error || '다운로드 실패', 'error'); return }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch { addToast('다운로드 중 오류가 발생했습니다', 'error'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newLogs } = await supabase.from('download_logs').select('id, product_id, file_name, downloaded_at, products(title)').eq('user_id', user.id).order('downloaded_at', { ascending: false }).limit(50)
    setDownloadLogs((newLogs || []) as DownloadLog[])
    setTimeout(() => addToast('상품 페이지에서 리뷰를 작성해주세요!', 'info'), 1500)
  }

  async function handleRefundRequest(orderId: number, reason: string) {
    setRefundSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('orders').update({ refund_reason: reason }).eq('id', orderId)
      if (error) { addToast('환불 문의 접수 실패: ' + error.message, 'error') }
      else { setOrders(prev => prev.map(o => o.id === orderId ? { ...o, refund_reason: reason } : o)); setRefundOrderId(null); setRefundReason(''); addToast('환불 문의가 접수되었습니다', 'success') }
    } catch { addToast('환불 문의 접수 중 오류', 'error') }
    finally { setRefundSubmitting(false) }
  }

  function printReceipt(order: Order) {
    const printWindow = window.open('', '_blank', 'width=600,height=800')
    if (!printWindow) return
    const receiptDate = order.paid_at ? new Date(order.paid_at).toLocaleDateString('ko-KR') : new Date(order.created_at).toLocaleDateString('ko-KR')
    const itemsHtml = (order.order_items || []).map(item => {
      const prod = Array.isArray(item.products) ? item.products[0] : item.products
      return `<tr><td>${prod?.title || '상품'}${item.quantity > 1 ? ' x' + item.quantity : ''}</td><td style="text-align:right">${(item.unit_price * item.quantity).toLocaleString()}원</td></tr>`
    }).join('')
    printWindow.document.write(`<html><head><meta charset="UTF-8"/><title>거래 영수증</title><style>body{font-family:'Malgun Gothic',sans-serif;padding:40px;max-width:500px;margin:0 auto;color:#333}h1{text-align:center;font-size:24px;border-bottom:2px solid #333;padding-bottom:16px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}th{background:#f5f5f5;font-weight:600}.total{font-weight:bold;font-size:18px;text-align:right;padding-top:16px;border-top:2px solid #333}.footer{margin-top:40px;text-align:center;color:#666;font-size:12px}.info dt{color:#999;font-size:12px;margin:8px 0 4px}.info dd{margin:0 0 12px;font-weight:500;font-size:14px}.company-info{margin-top:32px;padding:16px;background:#fafafa;border-radius:4px;font-size:13px}@media print{body{padding:0}}</style></head><body><h1>거래 영수증</h1><dl class="info"><dt>주문번호</dt><dd>${order.order_number || order.id}</dd><dt>발행일</dt><dd>${receiptDate}</dd></dl><table><thead><tr><th>상품명</th><th style="text-align:right">금액</th></tr></thead><tbody>${itemsHtml}</tbody></table><p class="total">합계: ${order.total_amount?.toLocaleString()}원</p><hr/><div class="company-info"><dl class="info"><dt>공급자</dt><dd>주식회사 아마란스</dd><dt>대표</dt><dd>채호진</dd><dt>이메일</dt><dd>hojin@amarans.co.kr</dd></dl></div><div class="footer"><p>이 영수증은 전자상거래 거래증빙용입니다.</p><button onclick="window.print()" style="margin-top:16px;padding:8px 24px;cursor:pointer;border:1px solid #999;background:#fff;border-radius:4px">인쇄</button></div></body></html>`)
    printWindow.document.close()
  }

  // Recent activities
  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []
    orders.slice(0, 5).forEach(o => items.push({ type: 'order', text: `${statusMap[o.status]?.label || o.status} — ${formatPrice(o.total_amount)}`, time: relativeTime(new Date(o.created_at)), raw: new Date(o.created_at) }))
    downloadLogs.slice(0, 5).forEach(l => {
      const title = Array.isArray(l.products) ? l.products[0]?.title : l.products?.title
      items.push({ type: 'download', text: `다운로드 — ${title || l.file_name}`, time: relativeTime(new Date(l.downloaded_at)), raw: new Date(l.downloaded_at) })
    })
    return items.sort((a, b) => b.raw.getTime() - a.raw.getTime()).slice(0, 8)
  }, [orders, downloadLogs])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    if (orderFilter === 'pending') return orders.filter(o => o.status === 'pending')
    if (orderFilter === 'completed') return orders.filter(o => o.status === 'paid' || o.status === 'completed')
    return orders.filter(o => ['cancelled', 'refunded', 'pending_refund'].includes(o.status))
  }, [orders, orderFilter])

  const catLabel = (c: string) => ({ news: '뉴스', policy: '정책', bid: '입찰', task: '과제', event: '행사' }[c] || c)
  const catColor = (c: string) => ({ news: 'bg-blue-100 text-blue-700', policy: 'bg-emerald-100 text-emerald-700', bid: 'bg-orange-100 text-orange-700', task: 'bg-purple-100 text-purple-700', event: 'bg-pink-100 text-pink-700' }[c] || 'bg-muted text-muted-foreground')

  // ===========================
  // Loading
  // ===========================

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  // ===========================
  // Profile Overlay
  // ===========================

  if (overlay === 'profile' && profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => { setOverlay(null); setEditingProfile(false); setShowPasswordSection(false) }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> 나의콘솔로 돌아가기
        </button>

        <h1 className="text-2xl font-bold mb-8">내 정보</h1>

        {/* Profile Info */}
        <div className="border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">기본 정보</h2>
            {!editingProfile ? (
              <button onClick={() => { setProfileForm({ name: profile.name || '', phone: profile.phone || '', company: profile.company || '' }); setEditingProfile(true); setProfileMsg('') }} className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"><Pencil className="w-3.5 h-3.5" /> 수정</button>
            ) : (
              <button onClick={() => { setEditingProfile(false); setProfileMsg('') }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3.5 h-3.5" /> 취소</button>
            )}
          </div>
          <Separator className="mb-6" />
          {profileMsg && <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${profileMsg.includes('완료') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{profileMsg}</div>}

          {!editingProfile ? (
            <div className="space-y-4">
              {[{ icon: User, label: '이름', value: profile.name }, { icon: Mail, label: '이메일', value: profile.email }, { icon: Phone, label: '연락처', value: profile.phone }, { icon: Building, label: '회사명', value: profile.company }].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3"><Icon className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || '-'}</p></div></div>
              ))}
              <Separator />
              <p className="text-xs text-muted-foreground">가입일: {formatDate(profile.created_at)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[{ icon: User, label: '이름', key: 'name' as const, type: 'text', ph: '이름을 입력하세요' }, { icon: Phone, label: '연락처', key: 'phone' as const, type: 'tel', ph: '010-1234-5678' }, { icon: Building, label: '회사명', key: 'company' as const, type: 'text', ph: '회사명을 입력하세요' }].map(f => (
                <div key={f.key}><label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5"><f.icon className="w-3.5 h-3.5" />{f.label}</label><input type={f.type} value={profileForm[f.key]} onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder={f.ph} /></div>
              ))}
              <div><label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5"><Mail className="w-3.5 h-3.5" />이메일</label><input type="email" value={profile.email} disabled className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted text-muted-foreground" /></div>
              <button onClick={async () => {
                setProfileSaving(true); setProfileMsg('')
                try {
                  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()
                  if (!user) { setProfileMsg('로그인 필요'); return }
                  const { error } = await supabase.from('profiles').update({ name: profileForm.name || null, phone: profileForm.phone || null, company: profileForm.company || null }).eq('id', user.id)
                  if (error) setProfileMsg('저장 실패: ' + error.message)
                  else { setProfile(p => p ? { ...p, name: profileForm.name || null, phone: profileForm.phone || null, company: profileForm.company || null } : p); setEditingProfile(false); setProfileMsg('프로필이 저장 완료되었습니다.') }
                } catch { setProfileMsg('저장 중 오류') } finally { setProfileSaving(false) }
              }} disabled={profileSaving} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"><Save className="w-4 h-4" />{profileSaving ? '저장 중...' : '저장'}</button>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> 비밀번호 변경</h2>
            {!showPasswordSection && <button onClick={() => { setShowPasswordSection(true); setPwMsg(''); setNewPassword(''); setConfirmPassword('') }} className="text-sm text-primary hover:underline cursor-pointer">변경하기</button>}
          </div>
          <Separator className="mb-6" />
          {pwMsg && <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${pwMsg.includes('완료') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{pwMsg}</div>}
          {!showPasswordSection ? <p className="text-sm text-muted-foreground">&quot;변경하기&quot; 버튼을 클릭하세요.</p> : (
            <div className="space-y-4">
              <div><label className="block text-xs text-muted-foreground mb-1.5">새 비밀번호</label><div className="relative"><input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="새 비밀번호" /><button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">{showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                {newPassword && <div className="mt-2 space-y-1"><div className="flex gap-1">{[0,1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwCheck.score ? pwCheck.color : 'bg-gray-200'}`} />)}</div><p className={`text-xs ${pwCheck.valid ? 'text-emerald-600' : 'text-muted-foreground'}`}>강도: {pwCheck.label}</p>{pwCheck.errors.length > 0 && <ul className="text-xs text-red-500 space-y-0.5">{pwCheck.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}</div>}
              </div>
              <div><label className="block text-xs text-muted-foreground mb-1.5">비밀번호 확인</label><div className="relative"><input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="비밀번호 확인" /><button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">{showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>}</div>
              <div className="flex gap-2">
                <button onClick={async () => { setPwMsg(''); if (!pwCheck.valid) { setPwMsg('비밀번호 정책 미충족'); return } if (newPassword !== confirmPassword) { setPwMsg('비밀번호 불일치'); return } setPwSaving(true); try { const supabase = createClient(); const { error } = await supabase.auth.updateUser({ password: newPassword }); if (error) setPwMsg('변경 실패: ' + error.message); else { setPwMsg('비밀번호가 변경 완료되었습니다.'); setNewPassword(''); setConfirmPassword(''); setShowPasswordSection(false) } } catch { setPwMsg('변경 중 오류') } finally { setPwSaving(false) } }} disabled={pwSaving || !pwCheck.valid || newPassword !== confirmPassword || !newPassword} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer">{pwSaving ? '변경 중...' : '비밀번호 변경'}</button>
                <button onClick={() => { setShowPasswordSection(false); setNewPassword(''); setConfirmPassword(''); setPwMsg('') }} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer">취소</button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="border border-red-200 rounded-2xl p-6">
          <h2 className="font-semibold text-red-600 flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4" /> 회원 탈퇴</h2>
          <Separator className="mb-4" />
          <p className="text-sm text-muted-foreground mb-4">탈퇴하시면 주문 내역과 다운로드 이력이 삭제되며 복구할 수 없습니다.</p>
          <button type="button" onClick={() => setShowDeleteAccount(true)} className="h-10 px-5 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 cursor-pointer">회원 탈퇴</button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteAccount(false)}>
            <div className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-red-500" /><h3 className="text-lg font-semibold">회원 탈퇴</h3></div>
              <p className="text-sm text-muted-foreground mb-4">탈퇴하면 모든 데이터가 삭제됩니다. 정말 탈퇴하시겠습니까?</p>
              <div className="mb-4"><label className="text-sm font-medium mb-2 block">비밀번호 확인</label><div className="relative"><input type={showDeleteAccountPw ? 'text' : 'password'} placeholder="비밀번호 입력" value={deleteAccountPassword} onChange={e => setDeleteAccountPassword(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary" /><button type="button" onClick={() => setShowDeleteAccountPw(!showDeleteAccountPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">{showDeleteAccountPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowDeleteAccount(false); setDeleteAccountPassword(''); setShowDeleteAccountPw(false) }} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted cursor-pointer">취소</button>
                <button type="button" disabled={deletingAccount || !deleteAccountPassword.trim()} onClick={async () => { setDeletingAccount(true); try { const res = await fetch('/api/auth/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: deleteAccountPassword }) }); if (!res.ok) { const d = await res.json(); addToast(d.error || '탈퇴 오류', 'error'); return } const supabase = createClient(); await supabase.auth.signOut(); addToast('회원 탈퇴 완료', 'info'); router.push('/'); router.refresh() } catch { addToast('탈퇴 오류', 'error') } finally { setDeletingAccount(false); setShowDeleteAccount(false); setDeleteAccountPassword(''); setShowDeleteAccountPw(false) } }} className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer disabled:opacity-50">{deletingAccount ? '처리 중...' : '탈퇴하기'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===========================
  // Main Dashboard
  // ===========================

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
      {/* Row 1: Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 to-emerald-900 text-white p-6 md:p-8 mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-300 text-sm font-medium mb-1">나의콘솔</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              안녕하세요, {profile?.name || '회원'}님
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              {profile?.company && <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" />{profile.company}</span>}
              <span>가입일: {profile ? formatDate(profile.created_at) : '-'}</span>
            </div>
          </div>
          <button onClick={() => setOverlay('profile')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors cursor-pointer">
            <User className="w-4 h-4" /> 내 정보
          </button>
        </div>
      </div>

      {/* Row 2: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: '구매 상품', value: kpi.orders, icon: Package, color: 'text-primary bg-primary/10', href: '#orders' },
          { label: '즐겨찾기', value: kpi.bookmarks, icon: BookmarkCheck, color: 'text-emerald-600 bg-emerald-50', href: '#bookmarks' },
          { label: '모집중 공고', value: kpi.activeAnns, icon: Megaphone, color: 'text-blue-600 bg-blue-50', href: '/announcements' },
          { label: '다운로드', value: kpi.downloads, icon: Download, color: 'text-orange-600 bg-orange-50', href: '#downloads' },
        ].map(card => (
          <Link key={card.label} href={card.href}
            className="group bg-card border border-border/50 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer">
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">{card.label} <ArrowRight className="w-3 h-3" /></p>
          </Link>
        ))}
      </div>

      {/* Mobile: Profile button */}
      <div className="md:hidden mb-6">
        <button onClick={() => setOverlay('profile')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted cursor-pointer">
          <User className="w-4 h-4" /> 내 정보 관리
        </button>
      </div>

      {/* Row 3: Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Activity */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">최근 활동</h2>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">아직 활동 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.type === 'order' ? 'bg-primary/10 text-primary' : a.type === 'download' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {a.type === 'order' ? <Package className="w-4 h-4" /> : a.type === 'download' ? <Download className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </div>
                    <p className="text-sm text-foreground flex-1 truncate">{a.text}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Orders Section */}
          <div id="orders" className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">내 주문</h2>
                <span className="text-xs text-muted-foreground">{orders.length}건</span>
              </div>
            </div>

            {/* Order Filter Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border/50">
              {[{ key: 'all', label: '전체' }, { key: 'pending', label: '대기' }, { key: 'completed', label: '완료' }, { key: 'other', label: '기타' }].map(t => (
                <button key={t.key} onClick={() => setOrderFilter(t.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${orderFilter === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">주문 내역이 없습니다</p>
                <Link href="/store" className="inline-block mt-3 text-xs text-primary hover:underline">스토어 바로가기</Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id
                  const items = (order.order_items || []) as OrderItem[]
                  const statusInfo = statusMap[order.status] || { label: order.status, class: 'bg-muted text-muted-foreground border-border' }
                  return (
                    <div key={order.id} className="rounded-xl border border-border/50 overflow-hidden">
                      <button type="button" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer text-left">
                        <div><p className="text-xs font-mono text-muted-foreground">{order.order_number}</p><p className="text-sm font-semibold mt-0.5">{formatPrice(order.total_amount)}</p></div>
                        <div className="flex items-center gap-3"><div className="text-right"><Badge className={`text-xs border ${statusInfo.class}`}>{statusInfo.label}</Badge><p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p></div><ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
                          {items.map(item => {
                            const prod = Array.isArray(item.products) ? item.products[0] : item.products
                            return (
                              <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border/50">
                                <div className="min-w-0"><p className="text-sm font-medium truncate">{prod?.title || '-'}</p>{item.quantity > 1 && <p className="text-xs text-muted-foreground">x{item.quantity}</p>}</div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <p className="text-sm font-medium">{formatPrice(item.unit_price)}</p>
                                  {(order.status === 'paid' || order.status === 'completed') && prod && (
                                    <button type="button" onClick={e => { e.stopPropagation(); handleProductDownload(prod.id, prod.title) }} className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"><Download className="w-3 h-3" />다운로드</button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              {(order.status === 'paid' || order.status === 'completed') && <button type="button" onClick={e => { e.stopPropagation(); printReceipt(order) }} className="px-3 py-1.5 rounded-lg border border-blue-300 text-primary text-xs font-medium hover:bg-primary/8 cursor-pointer">영수증</button>}
                              {order.status === 'paid' && !order.refund_reason && <button type="button" onClick={e => { e.stopPropagation(); setRefundOrderId(order.id); setRefundReason('') }} className="px-3 py-1.5 rounded-lg border border-orange-300 text-orange-600 text-xs font-medium hover:bg-orange-50 cursor-pointer">환불 문의</button>}
                              {order.refund_reason && <p className="text-xs text-orange-600">환불 문의 접수됨</p>}
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

          {/* Chat Section */}
          <div id="chat" className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-teal-600" /><h2 className="font-semibold">나의 채팅</h2></div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">우측 하단의 채팅 버튼을 통해 상담을 시작할 수 있습니다.</p>
            <button type="button" onClick={() => {
              const event = new CustomEvent('open-chat-widget')
              window.dispatchEvent(event)
            }} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 cursor-pointer">
              <MessageCircle className="w-4 h-4" /> 채팅 시작하기
            </button>
          </div>

          {/* Payment Requests Section */}
          <div id="payment-requests" className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-600" /><h2 className="font-semibold">결제 요청 내역</h2><span className="text-xs text-muted-foreground">{chatPaymentRequests.length}건</span></div>
            </div>
            {chatPaymentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">결제 요청 내역이 없습니다</p>
                <p className="text-xs mt-1">채팅 상담 중 관리자가 커스텀 상품을 제안하면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatPaymentRequests.map(pr => (
                  <div key={pr.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/50">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      pr.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : pr.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{pr.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(pr.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatPrice(pr.amount)}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        pr.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : pr.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {pr.status === 'pending' ? '결제 대기' : pr.status === 'paid' ? '결제 완료' : '취소됨'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Downloads Section */}
          <div id="downloads" className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><Download className="w-4 h-4 text-orange-600" /><h2 className="font-semibold">내 다운로드</h2><span className="text-xs text-muted-foreground">{purchasedProducts.length}개 상품</span></div>
            </div>
            {purchasedProducts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Download className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">구매한 상품이 없습니다</p>
                <Link href="/store" className="inline-block mt-3 text-xs text-primary hover:underline">스토어 바로가기</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {purchasedProducts.map(p => {
                  const lastLog = downloadLogs.find(l => l.product_id === p.id)
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                      {p.thumbnail_url ? <img src={p.thumbnail_url} alt={p.title} className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-white/70" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {p.format && <Badge className="text-[10px] px-1.5 py-0 bg-primary/8 text-primary border-blue-200 border">{p.format}</Badge>}
                          {lastLog && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />최근 {formatDate(lastLog.downloaded_at)}</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleProductDownload(p.id, p.title)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 flex items-center gap-1 shrink-0 cursor-pointer"><Download className="w-3.5 h-3.5" />다운로드</button>
                    </div>
                  )
                })}
              </div>
            )}
            {downloadLogs.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3">
                <button type="button" onClick={() => setShowDownloadHistory(p => !p)} className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                  <span>최근 다운로드 이력 ({downloadLogs.length}건)</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDownloadHistory ? 'rotate-180' : ''}`} />
                </button>
                {showDownloadHistory && (
                  <div className="mt-3 space-y-1">
                    {downloadLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 text-xs">
                        <span className="truncate text-foreground">{(Array.isArray(log.products) ? log.products[0]?.title : log.products?.title) || log.file_name}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{formatDate(log.downloaded_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT Column (1/3) - Sticky */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">

          {/* Quick Links */}
          <div className="bg-card border border-border/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3">빠른 링크</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '스토어', href: '/store', icon: Store, color: 'from-primary to-emerald-600' },
                { label: '나의 채팅', href: '#chat', icon: MessageCircle, color: 'from-teal-500 to-teal-600' },
                { label: '공고사업', href: '/announcements', icon: Megaphone, color: 'from-blue-500 to-blue-600' },
                { label: 'IT피드', href: '/feeds', icon: Rss, color: 'from-orange-400 to-orange-500' },
                { label: '블로그', href: '/blog', icon: BookOpen, color: 'from-violet-500 to-violet-600' },
                { label: '결제요청', href: '#payment-requests', icon: CreditCard, color: 'from-emerald-500 to-emerald-600' },
              ].map(link => (
                <Link key={link.label} href={link.href} className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <link.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Bookmarks Widget */}
          <div id="bookmarks" className="bg-card border border-border/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">즐겨찾기</h3>
                <span className="text-xs text-muted-foreground">{annBookmarks.length + feedBookmarks.length}건</span>
              </div>
            </div>

            {annBookmarks.length === 0 && feedBookmarks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">즐겨찾기한 항목이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {/* Announcement bookmarks */}
                {annBookmarks.map(ann => {
                  const expired = ann.end_date ? new Date(ann.end_date) < new Date() : false
                  return (
                    <Link key={`a-${ann.id}`} href={`/announcements?selected=${ann.id}`} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${expired || ann.status === 'closed' ? 'bg-zinc-100 text-zinc-500' : 'bg-emerald-50 text-emerald-700'}`}>
                        {expired || ann.status === 'closed' ? '마감' : '공고'}
                      </span>
                      <span className="text-xs text-foreground truncate flex-1 group-hover:text-primary transition-colors">{ann.title}</span>
                    </Link>
                  )
                })}
                {/* Feed bookmarks */}
                {feedBookmarks.map(feed => (
                  <Link key={`f-${feed.id}`} href={`/feeds?selected=${feed.id}`} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${catColor(feed.category)}`}>{catLabel(feed.category)}</span>
                    <span className="text-xs text-foreground truncate flex-1 group-hover:text-primary transition-colors">{feed.title}</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
              <Link href="/announcements?tab=bookmarks" className="text-xs text-primary hover:underline flex-1">공고 전체보기</Link>
              <Link href="/feeds?tab=bookmarks" className="text-xs text-primary hover:underline flex-1 text-right">피드 전체보기</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refundOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setRefundOrderId(null); setRefundReason('') }}>
          <div className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">환불 문의</h3><button type="button" onClick={() => { setRefundOrderId(null); setRefundReason('') }} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button></div>
            <p className="text-sm text-muted-foreground mb-4">환불 사유를 입력해주세요.</p>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={4} placeholder="환불 사유를 상세히 입력해주세요..." className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-4" />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRefundOrderId(null); setRefundReason('') }} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted cursor-pointer">취소</button>
              <button type="button" disabled={refundSubmitting || !refundReason.trim()} onClick={() => handleRefundRequest(refundOrderId, refundReason.trim())} className="flex-1 h-10 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer disabled:opacity-50">{refundSubmitting ? '접수 중...' : '문의 접수'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
