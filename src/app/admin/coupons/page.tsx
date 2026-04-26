/*
 * SQL to create the coupons table (run in Supabase SQL editor):
 *
 * CREATE TABLE coupons (
 *   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   code            TEXT NOT NULL UNIQUE,
 *   discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
 *   discount_value  NUMERIC NOT NULL,
 *   min_order_amount NUMERIC DEFAULT 0,
 *   valid_from      TIMESTAMPTZ,
 *   valid_until     TIMESTAMPTZ,
 *   usage_count     INTEGER NOT NULL DEFAULT 0,
 *   max_usage       INTEGER,
 *   is_active       BOOLEAN NOT NULL DEFAULT true,
 *   created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 *
 * ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Admin full access" ON coupons FOR ALL USING (
 *   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
 * );
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useDraggableModal } from '@/hooks/useDraggableModal'
import { Tag, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, X, Info, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Coupon {
  id: string
  code: string
  name: string | null
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  valid_from: string | null
  valid_until: string | null
  usage_count: number
  max_usage: number | null
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  valid_from: '',
  valid_until: '',
  max_usage: '',
}

interface CouponUse {
  id: number
  coupon_id: string
  user_id: string | null
  order_id: number | null
  applied_amount: number
  created_at: string
  profile?: { name: string | null; email: string } | null
  order_number?: string | null
}

export default function CouponsPage() {
  const dragCreate = useDraggableModal()
  const dragDetail = useDraggableModal()
  const dragDelete = useDraggableModal()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [detailCoupon, setDetailCoupon] = useState<Coupon | null>(null)
  const [detailUses, setDetailUses] = useState<CouponUse[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ESC to close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowModal(false); setDeleteTarget(null); setDetailCoupon(null) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function openDetail(coupon: Coupon) {
    setDetailCoupon(coupon)
    setDetailLoading(true)
    setDetailUses([])
    try {
      const supabase = createClient()
      const { data: uses } = await supabase
        .from('coupon_uses')
        .select('id, coupon_id, user_id, order_id, applied_amount, created_at')
        .eq('coupon_id', coupon.id)
        .order('created_at', { ascending: false })

      if (uses && uses.length > 0) {
        const userIds = Array.from(new Set(uses.map(u => u.user_id).filter((v): v is string => !!v)))
        const orderIds = Array.from(new Set(uses.map(u => u.order_id).filter((v): v is number => !!v)))

        const [{ data: profiles }, { data: orders }] = await Promise.all([
          userIds.length > 0
            ? supabase.from('profiles').select('id, name, email').in('id', userIds)
            : Promise.resolve({ data: [] as { id: string; name: string | null; email: string }[] }),
          orderIds.length > 0
            ? supabase.from('orders').select('id, order_number').in('id', orderIds)
            : Promise.resolve({ data: [] as { id: number; order_number: string }[] }),
        ])

        const profileMap = new Map((profiles || []).map(p => [p.id, p]))
        const orderMap = new Map((orders || []).map(o => [o.id, o.order_number]))

        setDetailUses(uses.map(u => ({
          ...u,
          profile: u.user_id ? (profileMap.get(u.user_id) || null) : null,
          order_number: u.order_id ? (orderMap.get(u.order_id) || null) : null,
        })))
      }
    } catch (err) {
      console.error('Failed to load coupon uses:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.code.trim()) { showToast('쿠폰 코드를 입력하세요.', 'error'); return }
    if (!form.name.trim()) { showToast('쿠폰 이름을 입력하세요.', 'error'); return }
    if (!form.discount_value) { showToast('할인 값을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('coupons').insert({
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount) || 0,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        max_usage: form.max_usage ? Number(form.max_usage) : null,
        is_active: true,
      })
      if (error) throw error
      showToast('쿠폰이 생성되었습니다.', 'success')
      setShowModal(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      console.error(err)
      showToast('쿠폰 생성 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
    if (error) { alert(`쿠폰 활성 변경 실패: ${error.message}`); return }
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c))
    )
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) { showToast('삭제 중 오류가 발생했습니다.', 'error'); return }
    setCoupons((prev) => prev.filter((c) => c.id !== id))
    setDeleteTarget(null)
    showToast('쿠폰이 삭제되었습니다.', 'success')
  }

  const formatDiscount = (c: Coupon) =>
    c.discount_type === 'percentage'
      ? `${c.discount_value}%`
      : `${c.discount_value.toLocaleString()}원`

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ko-KR') : '-'

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">쿠폰 관리</h1>
            <p className="text-sm text-muted-foreground mt-0.5">할인 쿠폰을 생성하고 관리합니다</p>
          </div>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 쿠폰 생성
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-16 text-center text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 쿠폰이 없습니다</p>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
            className="mt-4 text-primary text-sm hover:underline cursor-pointer"
          >
            첫 쿠폰 만들기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">코드</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">할인</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">최소주문</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">유효기간</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">사용</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="hover:bg-muted transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name || <span className="text-muted-foreground italic">이름 없음</span>}</p>
                      {c.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs border ${
                          c.discount_type === 'percentage'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-primary/8 text-primary border-primary/20'
                        }`}
                      >
                        {formatDiscount(c)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.min_order_amount > 0 ? `${c.min_order_amount.toLocaleString()}원+` : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.valid_from || c.valid_until
                        ? `${formatDate(c.valid_from)} ~ ${formatDate(c.valid_until)}`
                        : '제한없음'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.usage_count}{c.max_usage ? ` / ${c.max_usage}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(c.id, c.is_active) }}
                        className="flex items-center gap-1.5 cursor-pointer"
                        title={c.is_active ? '비활성화' : '활성화'}
                      >
                        {c.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className={`text-xs font-medium ${c.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {c.is_active ? '활성' : '비활성'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(c.id) }}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl"
            style={dragCreate.modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 cursor-move" onMouseDown={dragCreate.handleMouseDown}>
              <h2 className="text-lg font-semibold">쿠폰 생성</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-muted-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">쿠폰 이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="예: 여름 시즌 10% 할인"
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground mt-1">고객에게 보여지는 쿠폰 이름입니다.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">쿠폰 코드 *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="예: SUMMER2026"
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">설명 (선택)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="쿠폰 사용 조건, 프로모션 내용 등을 적어주세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">할인 유형 *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="percentage">퍼센트 (%)</option>
                    <option value="fixed">고정금액 (원)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    할인 값 * {form.discount_type === 'percentage' ? '(%)' : '(원)'}
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percentage' ? '10' : '5000'}
                    min="0"
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">최소 주문금액 (원)</label>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">최대 사용 횟수</label>
                  <input
                    type="number"
                    value={form.max_usage}
                    onChange={(e) => setForm((f) => ({ ...f, max_usage: e.target.value }))}
                    placeholder="무제한"
                    min="1"
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">유효 시작일</label>
                  <input
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">유효 종료일</label>
                  <input
                    type="datetime-local"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? '생성 중...' : '쿠폰 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal — 쿠폰 정보 + 사용 내역 */}
      {detailCoupon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDetailCoupon(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-xl flex flex-col"
            style={dragDetail.modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0 cursor-move" onMouseDown={dragDetail.handleMouseDown}>
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold font-mono">{detailCoupon.code}</h3>
                  <p className="text-xs text-muted-foreground">쿠폰 상세 정보</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailCoupon(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 정보 섹션 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">쿠폰 정보</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">할인</p>
                    <p className="font-medium mt-0.5">{formatDiscount(detailCoupon)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">할인 유형</p>
                    <p className="font-medium mt-0.5">
                      {detailCoupon.discount_type === 'percentage' ? '퍼센트 할인' : '금액 할인'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">최소 주문금액</p>
                    <p className="font-medium mt-0.5">
                      {detailCoupon.min_order_amount > 0 ? `${detailCoupon.min_order_amount.toLocaleString()}원` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">사용 현황</p>
                    <p className="font-medium mt-0.5">
                      {detailCoupon.usage_count} {detailCoupon.max_usage ? `/ ${detailCoupon.max_usage}` : '(무제한)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">유효 시작일</p>
                    <p className="font-medium mt-0.5">{formatDate(detailCoupon.valid_from)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">유효 종료일</p>
                    <p className="font-medium mt-0.5">{formatDate(detailCoupon.valid_until)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">상태</p>
                    <Badge className={`text-xs mt-0.5 ${detailCoupon.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground'}`}>
                      {detailCoupon.is_active ? '활성' : '비활성'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">생성일</p>
                    <p className="font-medium mt-0.5">{formatDate(detailCoupon.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* 사용 내역 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">사용 내역 <span className="text-muted-foreground font-normal">({detailUses.length}건)</span></h4>
                </div>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailUses.length === 0 ? (
                  <div className="bg-muted/30 rounded-lg py-10 text-center text-sm text-muted-foreground">
                    아직 사용된 적이 없습니다
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailUses.map((use) => (
                      <div key={use.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {use.profile?.name || use.profile?.email || '알 수 없음'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {use.order_number ? `주문 ${use.order_number}` : '-'} · {new Date(use.created_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-blue-700 shrink-0 ml-3">
                          -{use.applied_amount.toLocaleString()}원
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => setDetailCoupon(null)}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            style={dragDelete.modalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 cursor-move" onMouseDown={dragDelete.handleMouseDown}>쿠폰 삭제</h3>
            <p className="text-sm text-muted-foreground mb-6">이 쿠폰을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
