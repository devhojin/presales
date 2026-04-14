'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import {
  Mail, Users, Calendar, Trash2, Plus, X, Loader2, Send,
  UserPlus, UserMinus, Clock, Hash, ToggleLeft, ToggleRight,
} from 'lucide-react'

interface Subscriber {
  id: number
  email: string
  name: string | null
  status: string
  source: string | null
  token: string
  subscribed_at: string
  unsubscribed_at: string | null
  last_sent_at: string | null
  send_count: number
}

interface Brief {
  id: number
  brief_date: string
  slug: string
  subject: string
  total_news: number
  total_announcements: number
  sent_count: number
  is_published: boolean
  created_at: string
  sent_at: string | null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminBriefPage() {
  const [tab, setTab] = useState<'subscribers' | 'briefs'>('subscribers')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/members', { cache: 'no-store' })
      // Use service client for brief tables
      const supabase = createClient()
      const [subsRes, briefsRes] = await Promise.all([
        supabase
          .from('brief_subscribers')
          .select('*')
          .order('subscribed_at', { ascending: false }),
        supabase
          .from('daily_briefs')
          .select('id, brief_date, slug, subject, total_news, total_announcements, sent_count, is_published, created_at, sent_at')
          .order('brief_date', { ascending: false }),
      ])
      setSubscribers((subsRes.data || []) as Subscriber[])
      setBriefs((briefsRes.data || []) as Brief[])
    } catch (e) {
      console.error('load error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDeleteTarget(null); setShowAddForm(false) }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  const handleAdd = async () => {
    const email = addEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('올바른 이메일을 입력하세요', 'error')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/brief/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: addName.trim() || undefined }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(data.already ? '이미 구독 중입니다' : '구독자 추가 완료', 'success')
        setAddEmail('')
        setAddName('')
        setShowAddForm(false)
        loadData()
      } else {
        showToast(data.error || '추가 실패', 'error')
      }
    } catch {
      showToast('요청 오류', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const supabase = createClient()
    const { error } = await supabase
      .from('brief_subscribers')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) {
      showToast('삭제 실패: ' + error.message, 'error')
    } else {
      showToast('구독자 삭제 완료', 'success')
      setDeleteTarget(null)
      loadData()
    }
  }

  const handleToggleStatus = async (sub: Subscriber) => {
    const supabase = createClient()
    const newStatus = sub.status === 'active' ? 'unsubscribed' : 'active'
    const { error } = await supabase
      .from('brief_subscribers')
      .update({
        status: newStatus,
        ...(newStatus === 'unsubscribed'
          ? { unsubscribed_at: new Date().toISOString() }
          : { unsubscribed_at: null, subscribed_at: new Date().toISOString() }),
      })
      .eq('id', sub.id)
    if (error) {
      showToast('상태 변경 실패', 'error')
    } else {
      setSubscribers((prev) =>
        prev.map((s) => s.id === sub.id ? { ...s, status: newStatus } : s),
      )
    }
  }

  const activeCount = subscribers.filter((s) => s.status === 'active').length
  const unsubCount = subscribers.filter((s) => s.status === 'unsubscribed').length

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">모닝 브리프</h1>
            <p className="text-sm text-muted-foreground mt-0.5">구독자 관리 및 발송 이력</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> 구독자 추가
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">전체 구독자</p>
          <p className="text-2xl font-bold text-foreground mt-1">{subscribers.length}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">활성 구독</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">수신 거부</p>
          <p className="text-2xl font-bold text-muted-foreground mt-1">{unsubCount}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">발송된 브리프</p>
          <p className="text-2xl font-bold text-foreground mt-1">{briefs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 mb-6">
        {(['subscribers', 'briefs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition cursor-pointer ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'subscribers' ? (
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> 구독자 ({subscribers.length})</span>
            ) : (
              <span className="flex items-center gap-1.5"><Send className="w-4 h-4" /> 발송 이력 ({briefs.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : tab === 'subscribers' ? (
        /* Subscribers Table */
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">가입 경로</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">가입일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">발송</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      구독자가 없습니다
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{sub.email}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(sub)}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          {sub.status === 'active' ? (
                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          )}
                          <Badge className={`text-xs ${
                            sub.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {sub.status === 'active' ? '활성' : sub.status === 'unsubscribed' ? '수신거부' : sub.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{sub.source || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(sub.subscribed_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{sub.send_count}회</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(sub)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Briefs Table */
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">날짜</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">제목</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">뉴스</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">공고</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">발송</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">발송 시각</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {briefs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      발송된 브리프가 없습니다
                    </td>
                  </tr>
                ) : (
                  briefs.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{formatDate(b.brief_date)}</td>
                      <td className="px-4 py-3 text-foreground truncate max-w-[280px]">{b.subject}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{b.total_news}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{b.total_announcements}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{b.sent_count}명</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{b.sent_at ? formatDateTime(b.sent_at) : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-xs ${
                          b.is_published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {b.is_published ? '공개' : '비공개'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Subscriber Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">구독자 추가</h2>
              <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">이메일 *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">이름 (선택)</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddForm(false)} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted cursor-pointer">취소</button>
              <button onClick={handleAdd} disabled={adding} className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {adding ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">구독자 삭제</h3>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>{deleteTarget.email}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">이 구독자를 완전히 삭제하시겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted cursor-pointer">취소</button>
              <button onClick={handleDelete} className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
