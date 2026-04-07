'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, MessageSquare, User, Settings, Loader2, Mail, Phone, Building, Pencil, Save, X, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { validatePassword } from '@/lib/password-policy'

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
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', company: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const pwCheck = validatePassword(newPassword)

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

  async function handleProductDownload(productId: number, _productTitle: string) {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '다운로드 실패')
        return
      }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch {
      alert('다운로드 중 오류가 발생했습니다')
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
                                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwCheck.score - 1 ? pwCheck.color : 'bg-gray-200'}`}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
