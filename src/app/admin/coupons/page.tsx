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
import { Tag, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Coupon {
  id: string
  code: string
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
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  valid_from: '',
  valid_until: '',
  max_usage: '',
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
      if (e.key === 'Escape') { setShowModal(false); setDeleteTarget(null) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function handleCreate() {
    if (!form.code.trim()) { showToast('쿠폰 코드를 입력하세요.', 'error'); return }
    if (!form.discount_value) { showToast('할인 값을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('coupons').insert({
        code: form.code.toUpperCase().trim(),
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
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
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
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">쿠폰 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">할인 쿠폰을 생성하고 관리합니다</p>
          </div>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 쿠폰 생성
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 쿠폰이 없습니다</p>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
            className="mt-4 text-blue-600 text-sm hover:underline cursor-pointer"
          >
            첫 쿠폰 만들기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">코드</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">할인</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">최소주문</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">유효기간</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">사용</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">상태</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{c.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs border ${
                          c.discount_type === 'percentage'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {formatDiscount(c)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.min_order_amount > 0 ? `${c.min_order_amount.toLocaleString()}원+` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {c.valid_from || c.valid_until
                        ? `${formatDate(c.valid_from)} ~ ${formatDate(c.valid_until)}`
                        : '제한없음'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.usage_count}{c.max_usage ? ` / ${c.max_usage}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(c.id, c.is_active)}
                        className="flex items-center gap-1.5 cursor-pointer"
                        title={c.is_active ? '비활성화' : '활성화'}
                      >
                        {c.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-xs font-medium ${c.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {c.is_active ? '활성' : '비활성'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">쿠폰 생성</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">쿠폰 코드 *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="예: SUMMER2026"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">할인 유형 *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">퍼센트 (%)</option>
                    <option value="fixed">고정금액 (원)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    할인 값 * {form.discount_type === 'percentage' ? '(%)' : '(원)'}
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percentage' ? '10' : '5000'}
                    min="0"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">최소 주문금액 (원)</label>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">최대 사용 횟수</label>
                  <input
                    type="number"
                    value={form.max_usage}
                    onChange={(e) => setForm((f) => ({ ...f, max_usage: e.target.value }))}
                    placeholder="무제한"
                    min="1"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">유효 시작일</label>
                  <input
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">유효 종료일</label>
                  <input
                    type="datetime-local"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? '생성 중...' : '쿠폰 생성'}
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
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">쿠폰 삭제</h3>
            <p className="text-sm text-gray-500 mb-6">이 쿠폰을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
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
