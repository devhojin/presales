'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'
import { useDraggableModal } from '@/hooks/useDraggableModal'
import { Badge } from '@/components/ui/badge'
import { validatePassword } from '@/lib/password-policy'
import { PasswordRequirementList } from '@/components/auth/PasswordRequirementList'
import {
  getVisibleMemberMemos,
  isMemberAdminUnread,
  markMemberMemoRead,
  stringifyMemberMemosForSave,
  type MemberMemoEntry,
} from '@/lib/admin-read-state'
import {
  Search,
  X,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  ShoppingCart,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  Package,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Users,
  FileDown,
  Star,
  AlertTriangle,
  Coins,
  PlusCircle,
  CheckCircle,
  KeyRound,
} from 'lucide-react'

// ===========================
// Types
// ===========================

type MemoEntry = MemberMemoEntry

interface Profile {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  role: string
  admin_memo: string | null
  reward_balance?: number | null
  created_at: string
  deleted_at?: string | null
  deletion_reason?: string | null
}

function parseMemberMemos(raw: string | null): MemoEntry[] {
  return getVisibleMemberMemos(raw)
}

function stringifyMemberMemos(memos: MemoEntry[]): string {
  return JSON.stringify(memos)
}

interface MemberStats {
  user_id: string
  order_count: number
  total_spent: number
  review_count: number
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  price: number
  products: { title: string } | null
}

interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  total_amount: number
  created_at: string
  order_items: OrderItem[]
}

interface DownloadLog {
  id: string
  user_id: string
  product_id: string
  downloaded_at: string
  products: { title: string } | null
}

interface ConsultingRequest {
  id: string
  user_id: string
  package_type: string
  message: string
  status: string
  created_at: string
}

interface RewardLedgerItem {
  id: number
  amount: number
  balance_after: number
  type: string
  status: string
  memo: string | null
  created_at: string
}

// ===========================
// Helpers
// ===========================

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return '방금전'
  if (minutes < 60) return `${minutes}분전`
  if (hours < 24) return `${hours}시간전`
  if (days < 30) return `${days}일전`
  if (months < 12) return `${months}달전`
  return `${years}년전`
}

function exportCSV(members: Profile[], statsMap: Map<string, MemberStats>) {
  const header = '이름,이메일,회원유형,가입일,주문횟수,누적구매액,리뷰수\n'
  const rows = members.map((m) => {
    const stats = statsMap.get(m.id)
    return [
      m.name || '',
      m.email,
      m.role === 'admin' ? '관리자' : '일반',
      formatDate(m.created_at),
      stats?.order_count ?? 0,
      stats?.total_spent ?? 0,
      stats?.review_count ?? 0,
    ].join(',')
  })
  const csv = header + rows.join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `회원목록_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ===========================
// Sub-components
// ===========================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border border-green-200',
    paid: 'bg-primary/8 text-primary border border-primary/20',
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
    answered: 'bg-green-50 text-green-700 border border-green-200',
  }
  const label: Record<string, string> = {
    completed: '완료',
    paid: '결제완료',
    pending: '대기중',
    cancelled: '취소',
    answered: '답변완료',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || 'bg-muted text-muted-foreground border border-border'}`}
    >
      {label[status] || status}
    </span>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value || '-'}</p>
      </div>
    </div>
  )
}

// ===========================
// Confirm Modal (generic)
// ===========================

function ConfirmModal({
  icon,
  iconBg,
  title,
  subtitle,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
  message: React.ReactNode
  confirmLabel: string
  confirmClass: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" style={modalStyle}>
        <div className="flex items-center gap-3 mb-4 cursor-move" onMouseDown={handleMouseDown}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="text-sm text-foreground mb-6">{message}</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Admin Memo Modal (threaded)
// ===========================

function MemoModal({
  memberName,
  initialMemoRaw,
  onSave,
  onCancel,
}: {
  memberName: string
  initialMemoRaw: string | null
  onSave: (memoJson: string) => Promise<void>
  onCancel: () => void
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  const [memos, setMemos] = useState<MemoEntry[]>(() => parseMemberMemos(initialMemoRaw))
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    try {
      const entry: MemoEntry = {
        content: newContent.trim(),
        created_at: new Date().toISOString(),
        admin_name: '관리자',
      }
      const updated = [...memos, entry]
      await onSave(stringifyMemberMemos(updated))
      setMemos(updated)
      setNewContent('')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (idx: number) => {
    const updated = memos.filter((_, i) => i !== idx)
    setSaving(true)
    try {
      await onSave(stringifyMemberMemos(updated))
      setMemos(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col" style={modalStyle}>
        <div className="flex items-center justify-between mb-4 shrink-0 cursor-move" onMouseDown={handleMouseDown}>
          <h3 className="text-sm font-semibold text-foreground">
            관리자 메모 - {memberName || '(이름 없음)'}
          </h3>
          <button
            onClick={onCancel}
            className="cursor-pointer w-7 h-7 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Memo history */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {memos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">메모가 없습니다</p>
          ) : (
            memos.map((m, idx) => (
              <div key={idx} className="bg-muted border border-border rounded-xl px-3 py-2.5 group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{m.admin_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(idx)}
                    disabled={saving}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                    title="삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
        </div>
        {/* New memo input */}
        <div className="shrink-0">
          <div className="flex gap-2">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="새 메모를 입력하세요... (Ctrl+Enter로 등록)"
              rows={2}
              className="flex-1 text-sm text-foreground bg-muted border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newContent.trim()}
              className="cursor-pointer self-end px-3 py-2 text-xs font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Row Actions Dropdown
// ===========================

function RowActionsMenu({
  member,
  onRoleChange,
  onDelete,
}: {
  member: Profile
  onRoleChange: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const menuWidth = 144
    const menuHeight = 88
    const gutter = 8
    const left = Math.min(
      window.innerWidth - menuWidth - gutter,
      Math.max(gutter, rect.right - menuWidth),
    )
    const shouldOpenUp = rect.bottom + menuHeight + gutter > window.innerHeight
    const top = shouldOpenUp
      ? Math.max(gutter, rect.top - menuHeight - 6)
      : rect.bottom + 6
    setPosition({ top, left })
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInsideRoot = ref.current?.contains(target) ?? false
      const clickedInsideMenu = menuRef.current?.contains(target) ?? false
      if (
        !clickedInsideRoot &&
        !clickedInsideMenu
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((p) => !p)
        }}
        className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && position && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-xl shadow-lg border border-border py-1 w-36 z-[100]"
          style={{ top: position.top, left: position.left }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onRoleChange()
            }}
            className="cursor-pointer w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
          >
            <Shield className="w-3.5 h-3.5" />
            권한변경
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onDelete()
            }}
            className="cursor-pointer w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

// ===========================
// Member Detail Modal
// ===========================

type ModalTab = 'info' | 'orders' | 'downloads' | 'consulting' | 'reviews'

function MemberInfoEdit({ member, onUpdated }: { member: Profile; onUpdated?: (updated: Profile) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: member.name || '', email: member.email, phone: member.phone || '', company: member.company || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [passwordForm, setPasswordForm] = useState({ password: '', passwordConfirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '수정 실패'); return }
      setEditing(false)
      onUpdated?.(data.data as Profile)
    } catch { setError('네트워크 오류') }
    finally { setSaving(false) }
  }

  const handlePasswordSave = async () => {
    setPasswordSaving(true)
    setPasswordMessage(null)

    const result = validatePassword(passwordForm.password, form.email || member.email)
    if (!result.valid) {
      setPasswordMessage({ type: 'error', text: result.errors[0] || '비밀번호가 보안 기준을 충족하지 않습니다' })
      setPasswordSaving(false)
      return
    }
    if (passwordForm.password !== passwordForm.passwordConfirm) {
      setPasswordMessage({ type: 'error', text: '비밀번호 확인이 일치하지 않습니다' })
      setPasswordSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordMessage({ type: 'error', text: data.error || '비밀번호 변경 실패' })
        return
      }
      setPasswordForm({ password: '', passwordConfirm: '' })
      setPasswordMessage({ type: 'success', text: '비밀번호를 변경했습니다' })
      onUpdated?.(data.data as Profile)
    } catch {
      setPasswordMessage({ type: 'error', text: '네트워크 오류' })
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">회원 기본정보</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="cursor-pointer text-xs text-primary hover:underline">수정</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">취소</button>
            <button onClick={handleSave} disabled={saving} className="cursor-pointer text-xs text-white bg-primary px-3 py-1 rounded-lg disabled:opacity-50">{saving ? '저장중...' : '저장'}</button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="bg-muted rounded-xl p-4 space-y-0 divide-y divide-gray-200/60">
        {editing ? (
          <>
            <div className="flex items-center gap-3 py-3">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16 shrink-0">이름</span>
              <input value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} className="flex-1 text-sm bg-white border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary" />
            </div>
            <div className="flex items-center gap-3 py-3">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16 shrink-0">이메일</span>
              <input value={form.email} onChange={(e) => setForm(f => ({...f, email: e.target.value}))} className="flex-1 text-sm bg-white border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary" />
            </div>
            <div className="flex items-center gap-3 py-3">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16 shrink-0">연락처</span>
              <input value={form.phone} onChange={(e) => setForm(f => ({...f, phone: e.target.value}))} className="flex-1 text-sm bg-white border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary" placeholder="010-0000-0000" />
            </div>
            <div className="flex items-center gap-3 py-3">
              <Building className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16 shrink-0">회사</span>
              <input value={form.company} onChange={(e) => setForm(f => ({...f, company: e.target.value}))} className="flex-1 text-sm bg-white border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary" />
            </div>
          </>
        ) : (
          <>
            <InfoRow icon={<User className="w-4 h-4" />} label="이름" value={member.name || '-'} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="이메일" value={member.email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="연락처" value={member.phone || '-'} />
            <InfoRow icon={<Building className="w-4 h-4" />} label="회사" value={member.company || '-'} />
          </>
        )}
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="가입일" value={formatDateTime(member.created_at)} />
      </div>
      <div className="mt-4 rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">비밀번호 변경</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="password"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="새 비밀번호"
            autoComplete="new-password"
            className="text-sm bg-white border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            value={passwordForm.passwordConfirm}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordConfirm: e.target.value }))}
            placeholder="새 비밀번호 확인"
            autoComplete="new-password"
            className="text-sm bg-white border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
          />
        </div>
        {passwordForm.password && (
          <PasswordRequirementList password={passwordForm.password} email={form.email || member.email} />
        )}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            10자 이상, 영문 대/소문자·숫자·특수문자 포함, 흔한 단어는 제한됩니다.
          </p>
          <button
            type="button"
            onClick={handlePasswordSave}
            disabled={passwordSaving || !passwordForm.password || !passwordForm.passwordConfirm}
            className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {passwordSaving ? '변경중...' : '비밀번호 변경'}
          </button>
        </div>
        {passwordMessage && (
          <p className={`mt-2 text-xs ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {passwordMessage.text}
          </p>
        )}
      </div>
    </div>
  )
}

function rewardLedgerLabel(type: string, memo: string | null) {
  if (type === 'admin_adjust') return memo || '관리자 지급 적립금'
  return memo || ({
    signup: '회원가입',
    review: '후기 작성',
    purchase: '구매 적립',
    use: '주문 사용',
    refund: '환불 복원',
    cancel: '취소',
  }[type] || type)
}

function MemberRewardPanel({ member, onUpdated }: { member: Profile; onUpdated?: (updated: Profile) => void }) {
  const [balance, setBalance] = useState(Math.max(0, Number(member.reward_balance ?? 0)))
  const [ledger, setLedger] = useState<RewardLedgerItem[]>([])
  const [grantMemos, setGrantMemos] = useState<MemoEntry[]>([])
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const applySnapshot = useCallback((data: {
    balance?: number
    ledger?: RewardLedgerItem[]
    grantMemos?: MemoEntry[]
    adminMemo?: string | null
  }, notifyParent = false) => {
    if (typeof data.balance === 'number') {
      setBalance(Math.max(0, data.balance))
      if (notifyParent) {
        onUpdated?.({
          ...member,
          reward_balance: Math.max(0, data.balance),
          admin_memo: data.adminMemo ?? member.admin_memo,
        })
      }
    }
    if (Array.isArray(data.ledger)) setLedger(data.ledger)
    if (Array.isArray(data.grantMemos)) setGrantMemos(data.grantMemos)
  }, [member, onUpdated])

  useEffect(() => {
    let active = true
    setBalance(Math.max(0, Number(member.reward_balance ?? 0)))
    setLoading(true)
    setMessage(null)
    fetch(`/api/admin/members/${member.id}/rewards`, { cache: 'no-store', credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || '적립금 정보를 불러오지 못했습니다')
        return data as {
          balance: number
          ledger: RewardLedgerItem[]
          grantMemos: MemoEntry[]
          adminMemo?: string | null
        }
      })
      .then((data) => {
        if (active) applySnapshot(data)
      })
      .catch((err: unknown) => {
        if (active) {
          setMessage({ type: 'error', text: err instanceof Error ? err.message : '적립금 정보를 불러오지 못했습니다' })
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [member.id, member.reward_balance, applySnapshot])

  const handleGrant = async () => {
    const cleanAmount = Math.floor(Number(amount))
    const cleanMemo = memo.trim()
    setMessage(null)

    if (!Number.isSafeInteger(cleanAmount) || cleanAmount <= 0) {
      setMessage({ type: 'error', text: '지급액은 1원 이상의 정수로 입력해주세요.' })
      return
    }
    if (cleanMemo.length < 2) {
      setMessage({ type: 'error', text: '관리자 메모를 2자 이상 입력해주세요.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${member.id}/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ amount: cleanAmount, memo: cleanMemo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || '적립금 지급에 실패했습니다')
      applySnapshot({
        ...(data as {
        balance: number
        ledger: RewardLedgerItem[]
        grantMemos: MemoEntry[]
        adminMemo?: string | null
        }),
      }, true)
      setAmount('')
      setMemo('')
      setMessage({
        type: data?.warning ? 'error' : 'success',
        text: data?.warning || `${formatWon(cleanAmount)} 적립금을 지급했습니다.`,
      })
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '적립금 지급에 실패했습니다' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        적립금 관리
      </h3>
      <div className="rounded-xl bg-muted p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center">
              <Coins className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">현재 보유 적립금</p>
              <p className="text-lg font-bold text-primary">{formatWon(balance)}</p>
            </div>
          </div>
          {loading && <span className="text-xs text-muted-foreground">내역 확인 중...</span>}
        </div>

        <div className="rounded-xl border border-border bg-white p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">지급액</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border px-3 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="예: 3000"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">원</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">관리자 전용 메모</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="지급 사유를 입력하세요. 고객에게는 노출되지 않습니다."
                className="w-full rounded-xl border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">사유 메모는 이 회원의 관리자 메모에 지급 이력으로 보관됩니다.</p>
            <button
              type="button"
              onClick={handleGrant}
              disabled={saving || !amount || !memo.trim()}
              className="cursor-pointer inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {saving ? '지급 중...' : '적립금 지급'}
            </button>
          </div>
          {message && (
            <p className={`text-xs ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-3">
            <p className="text-xs font-semibold text-foreground mb-2">최근 적립금 원장</p>
            {ledger.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">적립금 내역이 없습니다</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ledger.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{rewardLedgerLabel(item.type, item.memo)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(item.created_at)} · 잔액 {formatWon(item.balance_after)}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${item.amount > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {item.amount > 0 ? '+' : '-'}{formatWon(Math.abs(item.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-3">
            <p className="text-xs font-semibold text-foreground mb-2">관리자 지급 사유</p>
            {grantMemos.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">관리자 지급 메모가 없습니다</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {grantMemos.slice(0, 5).map((entry, idx) => (
                  <div key={`${entry.created_at}-${idx}`} className="rounded-lg bg-blue-50 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-blue-900">{entry.admin_name}</span>
                      <span className="text-[10px] text-blue-700">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-blue-900 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MemberDetailModal({
  member,
  onClose,
  onRoleChange,
  onMemoSave,
  defaultTab = 'info',
  onMemberUpdated,
}: {
  member: Profile
  onClose: () => void
  onRoleChange: (id: string, newRole: string) => Promise<void>
  onMemoSave: (id: string, memo: string) => Promise<void>
  defaultTab?: ModalTab
  onMemberUpdated?: (updated: Profile) => void
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  const [activeTab, setActiveTab] = useState<ModalTab>(defaultTab)
  const [orders, setOrders] = useState<Order[]>([])
  const [downloads, setDownloads] = useState<DownloadLog[]>([])
  const [consulting, setConsulting] = useState<ConsultingRequest[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingDownloads, setLoadingDownloads] = useState(false)
  const [loadingConsulting, setLoadingConsulting] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [downloadsLoaded, setDownloadsLoaded] = useState(false)
  const [consultingLoaded, setConsultingLoaded] = useState(false)
  const [memberReviews, setMemberReviews] = useState<Array<{ id: number; product_id: number; rating: number; title: string; content: string; created_at: string; products?: { title: string } | null }>>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [currentRole, setCurrentRole] = useState(member.role)
  const [memos, setMemos] = useState<MemoEntry[]>(() => parseMemberMemos(member.admin_memo))
  const [newMemoContent, setNewMemoContent] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showRoleConfirm) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose, showRoleConfirm])

  useEffect(() => {
    if (activeTab === 'orders' && !ordersLoaded && !loadingOrders) {
      setLoadingOrders(true)
      const supabase = createClient()
      supabase
        .from('orders')
        .select(
          `id, order_number, user_id, status, total_amount, created_at,
           order_items ( id, order_id, product_id, price, products ( title ) )`
        )
        .eq('user_id', member.id)
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          setOrders((data as unknown as Order[]) || [])
          setLoadingOrders(false)
          setOrdersLoaded(true)
        })
    }
  }, [activeTab, member.id, ordersLoaded, loadingOrders])

  useEffect(() => {
    if (activeTab === 'downloads' && !downloadsLoaded && !loadingDownloads) {
      setLoadingDownloads(true)
      const supabase = createClient()
      supabase
        .from('download_logs')
        .select('id, user_id, product_id, downloaded_at, products ( title )')
        .eq('user_id', member.id)
        .order('downloaded_at', { ascending: false })
        .limit(500)
        .then(({ data }) => {
          setDownloads((data as unknown as DownloadLog[]) || [])
          setLoadingDownloads(false)
          setDownloadsLoaded(true)
        })
    }
  }, [activeTab, member.id, downloadsLoaded, loadingDownloads])

  useEffect(() => {
    if (activeTab === 'consulting' && !consultingLoaded && !loadingConsulting) {
      setLoadingConsulting(true)
      const supabase = createClient()
      supabase
        .from('consulting_requests')
        .select('id, user_id, package_type, message, status, created_at')
        .eq('user_id', member.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setConsulting((data as ConsultingRequest[]) || [])
          setLoadingConsulting(false)
          setConsultingLoaded(true)
        })
    }
  }, [activeTab, member.id, consultingLoaded, loadingConsulting])

  useEffect(() => {
    if (activeTab === 'reviews' && !reviewsLoaded && !loadingReviews) {
      setLoadingReviews(true)
      const supabase = createClient()
      supabase
        .from('reviews')
        .select('id, product_id, rating, title, content, created_at, products(title)')
        .eq('user_id', member.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setMemberReviews((data as unknown as typeof memberReviews) || [])
          setLoadingReviews(false)
          setReviewsLoaded(true)
        })
    }
  }, [activeTab, member.id, reviewsLoaded, loadingReviews])

  const handleRoleToggle = async () => {
    setRoleLoading(true)
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      await onRoleChange(member.id, newRole)
      setCurrentRole(newRole)
    } finally {
      setRoleLoading(false)
      setShowRoleConfirm(false)
    }
  }

  const handleMemoAdd = async () => {
    if (!newMemoContent.trim()) return
    setMemoSaving(true)
    try {
      const entry: MemoEntry = {
        content: newMemoContent.trim(),
        created_at: new Date().toISOString(),
        admin_name: '관리자',
      }
      const updated = [...memos, entry]
      await onMemoSave(member.id, stringifyMemberMemos(updated))
      setMemos(updated)
      setNewMemoContent('')
    } finally {
      setMemoSaving(false)
    }
  }

  const handleMemoDelete = async (idx: number) => {
    const updated = memos.filter((_, i) => i !== idx)
    setMemoSaving(true)
    try {
      await onMemoSave(member.id, stringifyMemberMemos(updated))
      setMemos(updated)
    } finally {
      setMemoSaving(false)
    }
  }

  const tabs: { key: ModalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: '회원정보', icon: <User className="w-3.5 h-3.5" /> },
    { key: 'orders', label: '주문내역', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: 'reviews', label: '리뷰내역', icon: <Star className="w-3.5 h-3.5" /> },
    { key: 'downloads', label: '다운로드내역', icon: <Download className="w-3.5 h-3.5" /> },
    { key: 'consulting', label: '문의내역', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-[5vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 cursor-move" onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {(member.name || '?')[0]}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{member.name || '(이름 없음)'}</h2>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 회원정보 탭 */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <MemberInfoEdit member={member} onUpdated={(updated) => onMemberUpdated?.(updated)} />

              <MemberRewardPanel
                member={member}
                onUpdated={(updated) => {
                  if (updated.admin_memo !== undefined) {
                    setMemos(parseMemberMemos(updated.admin_memo))
                  }
                  onMemberUpdated?.(updated)
                }}
              />

              {/* 권한 변경 */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  권한 관리
                </h3>
                <div className="bg-muted rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">현재 권한</p>
                      <Badge
                        className={
                          currentRole === 'admin'
                            ? 'bg-red-50 text-red-700 border border-red-200 mt-1'
                            : 'bg-muted text-muted-foreground border border-border mt-1'
                        }
                      >
                        {currentRole === 'admin' ? '관리자' : '일반'}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRoleConfirm(true)}
                    className={`cursor-pointer px-4 py-2 text-xs font-medium rounded-xl transition-colors ${
                      currentRole === 'admin'
                        ? 'bg-muted text-foreground hover:bg-gray-300'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {currentRole === 'admin' ? '일반으로 변경' : '관리자로 변경'}
                  </button>
                </div>
              </div>

              {/* 관리자 메모 (threaded) */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  관리자 메모
                </h3>
                <div className="bg-muted rounded-xl p-4 space-y-3">
                  {/* History */}
                  {memos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">메모가 없습니다</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {memos.map((m, idx) => (
                        <div key={idx} className="bg-white border border-border rounded-xl px-3 py-2.5 group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">{m.admin_name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(m.created_at).toLocaleString('ko-KR', {
                                  year: 'numeric', month: '2-digit', day: '2-digit',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <button
                              onClick={() => handleMemoDelete(idx)}
                              disabled={memoSaving}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* New memo */}
                  <div className="flex gap-2">
                    <textarea
                      value={newMemoContent}
                      onChange={(e) => setNewMemoContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          handleMemoAdd()
                        }
                      }}
                      placeholder="새 메모 입력... (Ctrl+Enter 등록)"
                      rows={2}
                      className="flex-1 text-sm text-foreground bg-white border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleMemoAdd}
                      disabled={memoSaving || !newMemoContent.trim()}
                      className="cursor-pointer self-end px-3 py-2 text-xs font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {memoSaving ? '...' : '등록'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 주문내역 탭 */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                주문 내역
              </h3>
              {loadingOrders ? (
                <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">주문 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-muted rounded-xl p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-foreground">{item.products?.title || '상품명 없음'}</span>
                              <span className="text-muted-foreground font-medium">{formatWon(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-end pt-2 border-t border-border/60">
                        <span className="text-sm font-semibold text-foreground">
                          합계 {formatWon(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 다운로드내역 탭 */}
          {activeTab === 'downloads' && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                다운로드 내역
              </h3>
              {loadingDownloads ? (
                <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
              ) : downloads.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">다운로드 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {downloads.map((dl) => (
                    <div key={dl.id} className="bg-muted rounded-xl p-4 border border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileDown className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {dl.products?.title || '상품명 없음'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(dl.downloaded_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 리뷰내역 탭 */}
          {activeTab === 'reviews' && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                리뷰 내역
              </h3>
              {loadingReviews ? (
                <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
              ) : memberReviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">작성한 리뷰가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memberReviews.map((rv) => {
                    const prodTitle = Array.isArray(rv.products) ? (rv.products as Array<{title: string}>)[0]?.title : rv.products?.title
                    return (
                      <div key={rv.id} className="bg-muted rounded-xl p-4 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <Star
                                key={si}
                                className={`w-3.5 h-3.5 ${si < rv.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(rv.created_at)}</span>
                        </div>
                        <p className="text-xs text-primary font-medium mb-1">{prodTitle || '상품'}</p>
                        {rv.title && <p className="text-sm font-semibold text-foreground mb-1">{rv.title}</p>}
                        <p className="text-sm text-muted-foreground leading-relaxed">{rv.content}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 문의내역 탭 */}
          {activeTab === 'consulting' && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                문의 내역
              </h3>
              {loadingConsulting ? (
                <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
              ) : consulting.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">문의 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consulting.map((req) => (
                    <div key={req.id} className="bg-muted rounded-xl p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-primary/8 text-primary border border-primary/20">
                          {req.package_type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={req.status} />
                          <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                        {req.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role Confirm Modal */}
      {showRoleConfirm && (
        <ConfirmModal
          icon={<Shield className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-50"
          title="권한 변경 확인"
          subtitle="이 작업은 즉시 적용됩니다"
          message={
            <p>
              <span className="font-medium">{member.name || '(이름 없음)'}</span> 님의 권한을{' '}
              <span className="font-semibold text-primary">
                {currentRole === 'admin' ? '일반' : '관리자'}
              </span>
              (으)로 변경하시겠습니까?
            </p>
          }
          confirmLabel="변경"
          confirmClass="text-white bg-primary hover:bg-primary/90"
          onConfirm={handleRoleToggle}
          onCancel={() => setShowRoleConfirm(false)}
          loading={roleLoading}
        />
      )}
    </div>
  )
}

// ===========================
// Main Page
// ===========================

type FilterTab = 'all' | 'new' | 'user' | 'admin' | 'deleted'

export default function AdminMembers() {
  const [members, setMembers] = useState<Profile[]>([])
  const [statsMap, setStatsMap] = useState<Map<string, MemberStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [pageSize, setPageSize] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [selectedMemberTab, setSelectedMemberTab] = useState<ModalTab>('info')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [memoModal, setMemoModal] = useState<Profile | null>(null)
  const [roleConfirm, setRoleConfirm] = useState<Profile | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    try {
      // Service-role API endpoint — RLS 우회하여 모든 회원 로드
      const res = await fetch('/api/admin/members', { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = `API ${res.status}: ${body?.error || '알 수 없는 오류'}`
        console.error('[members] API error', res.status, body)
        setLoadError(msg)
        setMembers([])
        setLoading(false)
        return
      }
      const { members: memberList, stats } = await res.json() as {
        members: Profile[]
        stats: Record<string, { order_count: number; total_spent: number; review_count: number }>
      }

      setLoadError(null)
      setMembers(memberList || [])

      const newStats = new Map<string, MemberStats>()
      for (const [uid, s] of Object.entries(stats || {})) {
        newStats.set(uid, { user_id: uid, ...s })
      }
      setStatsMap(newStats)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류'
      console.error('[members] load error', err)
      setLoadError(`네트워크 오류: ${msg}`)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(id: string, newRole: string) {
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    if (error) {
      alert(`권한 변경 실패: ${error.message}`)
      return
    }
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)))
  }

  async function handleMemoSave(id: string, memo: string) {
    const currentMemo = members.find((member) => member.id === id)?.admin_memo ?? null
    const nextMemo = stringifyMemberMemosForSave(parseMemberMemos(memo), currentMemo)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ admin_memo: nextMemo }).eq('id', id)
    if (error) {
      alert(`메모 저장 실패: ${error.message}`)
      return
    }
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, admin_memo: nextMemo } : m)))
    setSelectedMember((prev) => (prev && prev.id === id ? { ...prev, admin_memo: nextMemo } : prev))
  }

  async function handleMarkMembersRead(ids: string[], options?: { silent?: boolean }) {
    if (ids.length === 0) return
    const res = await fetch('/api/admin/members/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: ids }),
    })
    const payload = (await res.json().catch(() => null)) as
      | { success?: boolean; readAt?: string; memberIds?: string[]; error?: string }
      | null

    if (!res.ok || !payload?.success || !payload.readAt) {
      alert(`읽음 처리 실패: ${payload?.error ?? '알 수 없는 오류'}`)
      return
    }

    const updatedIds = new Set(payload.memberIds || ids)
    setMembers((prev) =>
      prev.map((member) =>
        updatedIds.has(member.id)
          ? { ...member, admin_memo: markMemberMemoRead(member.admin_memo, payload.readAt!) }
          : member,
      ),
    )
    setSelectedMember((prev) =>
      prev && updatedIds.has(prev.id)
        ? { ...prev, admin_memo: markMemberMemoRead(prev.admin_memo, payload.readAt!) }
        : prev,
    )
    if (!options?.silent) setSelectedIds(new Set())
    window.dispatchEvent(new Event('admin-badges-refresh'))
  }

  function openMember(member: Profile, tab: ModalTab = 'info') {
    setSelectedMemberTab(tab)
    setSelectedMember(member)
    if (isMemberAdminUnread(member)) {
      void handleMarkMembersRead([member.id], { silent: true })
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) {
        const isFkViolation = error.code === '23503' || /foreign key|violates/i.test(error.message || '')
        alert(
          isFkViolation
            ? '이 회원은 주문/리뷰 등 이력이 있어 완전 삭제할 수 없습니다.'
            : `삭제 실패: ${error.message}`
        )
        return
      }
      setMembers((prev) => prev.filter((m) => m.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } finally {
      setActionLoading(false)
      setDeleteConfirm(null)
    }
  }

  // Filter + Search
  const filtered = useMemo(() => {
    // 기본적으로 탈퇴(soft-deleted) 회원은 제외, deleted 탭에서만 노출
    const isDeleted = (m: Profile) => Boolean(m.deleted_at)
    let result = filterTab === 'deleted'
      ? members.filter(isDeleted)
      : members.filter((m) => !isDeleted(m))
    if (filterTab === 'new') result = result.filter(isMemberAdminUnread)
    if (filterTab === 'user') result = result.filter((m) => m.role !== 'admin')
    if (filterTab === 'admin') result = result.filter((m) => m.role === 'admin')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (m) =>
          (m.name || '').toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.company || '').toLowerCase().includes(q)
      )
    }
    return result
  }, [members, filterTab, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterTab, pageSize])

  // Stats (탈퇴 회원 제외한 활성 기준)
  const activeMembers = members.filter((m) => !m.deleted_at)
  const totalCount = activeMembers.length
  const adminCount = activeMembers.filter((m) => m.role === 'admin').length
  const userCount = totalCount - adminCount
  const newCount = activeMembers.filter(isMemberAdminUnread).length
  const deletedCount = members.length - activeMembers.length

  // Selection
  const allPageSelected = paged.length > 0 && paged.every((m) => selectedIds.has(m.id))
  const somePageSelected = paged.some((m) => selectedIds.has(m.id))

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paged.forEach((m) => next.delete(m.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        paged.forEach((m) => next.add(m.id))
        return next
      })
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sidebarGroups: { key: FilterTab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'all', label: '전체 사용자', count: totalCount, icon: <Users className="w-4 h-4" /> },
    { key: 'new', label: '신규회원', count: newCount, icon: <PlusCircle className="w-4 h-4" /> },
    { key: 'user', label: '일반회원', count: userCount, icon: <User className="w-4 h-4" /> },
    { key: 'admin', label: '관리자', count: adminCount, icon: <Shield className="w-4 h-4" /> },
    { key: 'deleted', label: '탈퇴 회원', count: deletedCount, icon: <AlertTriangle className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex max-w-[1400px] mx-auto">
        {/* Left Sidebar */}
        <div className="w-[200px] flex-shrink-0 p-4 pt-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            회원 그룹
          </h2>
          <nav className="space-y-1">
            {sidebarGroups.map((g) => (
              <button
                key={g.key}
                onClick={() => setFilterTab(g.key)}
                className={`cursor-pointer w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  filterTab === g.key
                    ? 'bg-primary/8 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="flex items-center gap-2">
                  {g.icon}
                  {g.label}
                </span>
                <span
                  className={`text-xs font-normal ${
                    filterTab === g.key ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {g.count}
                </span>
              </button>
            ))}
          </nav>
          <div className="mt-4 px-3">
            <button
              disabled
              className="w-full text-left text-xs text-muted-foreground py-2 flex items-center gap-1.5 opacity-60"
              title="준비 중"
            >
              <span className="text-base leading-none">+</span> 새 그룹 만들기
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 py-8 pr-4 sm:pr-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">회원 관리</h1>
              <p className="text-sm text-muted-foreground mt-1">
                전체 {totalCount}명의 회원을 관리합니다
              </p>
            </div>
          </div>

          {/* Search & Controls */}
          <div className="bg-white rounded-xl border border-border p-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="이름, 이메일, 회사 검색"
                  className="w-full pl-9 pr-8 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('')
                      searchRef.current?.focus()
                    }}
                    className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {[20, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPageSize(n)}
                      className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        pageSize === n
                          ? 'bg-primary text-white'
                          : 'bg-white text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {n}개
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => exportCSV(filtered, statsMap)}
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  내보내기
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                선택 {selectedIds.size}명
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkMembersRead(Array.from(selectedIds))}
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-white border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  읽음 처리
                </button>
                <button
                  onClick={() => {
                    const selectedMembers = members.filter((m) => selectedIds.has(m.id))
                    exportCSV(selectedMembers, statsMap)
                  }}
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-blue-200 transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  내보내기 (CSV)
                </button>
              </div>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageSelected && !allPageSelected
                        }}
                        onChange={toggleSelectAll}
                        className="cursor-pointer w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      이름
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      회원유형
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      가입일
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      주문/구매액
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      리뷰
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      메모
                    </th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-border border-t-blue-600 rounded-full animate-spin" />
                          <p className="text-sm text-muted-foreground">회원 목록을 불러오는 중...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {loadError
                            ? `회원 로드 실패: ${loadError}`
                            : search
                              ? '검색 결과가 없습니다'
                              : '가입된 회원이 없습니다'}
                        </p>
                        {loadError && (
                          <button
                            type="button"
                            onClick={() => { setLoading(true); setLoadError(null); loadMembers() }}
                            className="mt-3 px-4 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 cursor-pointer"
                          >
                            다시 시도
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paged.map((m) => {
                      const stats = statsMap.get(m.id)
                      const unread = isMemberAdminUnread(m)
                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-primary/8/40 transition-colors group ${unread ? 'bg-blue-50/70' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(m.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleSelect(m.id)
                              }}
                              className="cursor-pointer w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            />
                          </td>
                          {/* 이름 */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openMember(m)}
                              className="cursor-pointer flex items-center gap-2.5 text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-muted-foreground text-xs font-semibold flex-shrink-0">
                                {(m.name || '?')[0]}
                              </div>
                              <span>
                                <span className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                                  {m.name || '-'}
                                </span>
                                {unread && (
                                  <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                    신규
                                  </span>
                                )}
                              </span>
                            </button>
                          </td>
                          {/* 이메일 */}
                          <td className="px-4 py-3 text-sm text-muted-foreground">{m.email}</td>
                          {/* 회원유형 */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                className={
                                  m.role === 'admin'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-muted text-muted-foreground border border-border'
                                }
                              >
                                {m.role === 'admin' ? '관리자' : '일반'}
                              </Badge>
                              {m.deleted_at && (
                                <Badge
                                  className="bg-gray-900 text-white border border-gray-900"
                                  title={m.deletion_reason ? `사유: ${m.deletion_reason}` : '탈퇴'}
                                >
                                  탈퇴 {formatDate(m.deleted_at)}
                                </Badge>
                              )}
                            </div>
                          </td>
                          {/* 가입일 (relative) */}
                          <td
                            className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell"
                            title={formatDateTime(m.created_at)}
                          >
                            {relativeTime(m.created_at)}
                          </td>
                          {/* 주문/구매액 */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            {(stats?.order_count ?? 0) > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); openMember(m, 'orders') }}
                                className="cursor-pointer text-sm hover:text-primary transition-colors text-left"
                              >
                                <span className="text-foreground font-medium">{stats?.order_count ?? 0}회</span>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span className="text-muted-foreground">{formatWon(stats?.total_spent ?? 0)}</span>
                              </button>
                            ) : (
                              <span className="text-sm text-muted-foreground">0회 / 0원</span>
                            )}
                          </td>
                          {/* 리뷰 */}
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">
                            {(stats?.review_count ?? 0) > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); openMember(m, 'reviews') }}
                                className="cursor-pointer text-primary font-medium hover:underline"
                              >
                                {stats?.review_count ?? 0}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          {/* 메모 */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMemoModal(m)
                              }}
                              className="cursor-pointer relative w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                              title={parseMemberMemos(m.admin_memo).map(e => e.content).join(' / ') || '메모 없음'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              {parseMemberMemos(m.admin_memo).length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-white text-[9px] font-bold px-1">
                                  {parseMemberMemos(m.admin_memo).length}
                                </span>
                              )}
                            </button>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <RowActionsMenu
                              member={m}
                              onRoleChange={() => setRoleConfirm(m)}
                              onDelete={() => setDeleteConfirm(m)}
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  총 {filtered.length}명 중 {(safePage - 1) * pageSize + 1}-
                  {Math.min(safePage * pageSize, filtered.length)}명
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (p === 1 || p === totalPages) return true
                      if (Math.abs(p - safePage) <= 2) return true
                      return false
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push('ellipsis')
                      }
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`e-${idx}`}
                          className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                            safePage === item
                              ? 'bg-gray-900 text-white'
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => { setSelectedMember(null); setSelectedMemberTab('info') }}
          onRoleChange={handleRoleChange}
          onMemoSave={handleMemoSave}
          defaultTab={selectedMemberTab}
          onMemberUpdated={(updated) => {
            setMembers((prev) => prev.map((m) => (m.id === selectedMember.id || m.id === updated.id) ? updated : m))
            setSelectedMember(updated)
          }}
        />
      )}

      {/* Memo Modal (from table pencil icon) */}
      {memoModal && (
        <MemoModal
          memberName={memoModal.name || '(이름 없음)'}
          initialMemoRaw={memoModal.admin_memo}
          onSave={async (memoJson) => {
            await handleMemoSave(memoModal.id, memoJson)
            setMembers((prev) => prev.map((m) => m.id === memoModal.id ? { ...m, admin_memo: memoJson } : m))
          }}
          onCancel={() => setMemoModal(null)}
        />
      )}

      {/* Role Confirm Modal (from row action) */}
      {roleConfirm && (
        <ConfirmModal
          icon={<Shield className="w-5 h-5 text-yellow-600" />}
          iconBg="bg-yellow-50"
          title="권한 변경 확인"
          subtitle="이 작업은 즉시 적용됩니다"
          message={
            <p>
              <span className="font-medium">{roleConfirm.name || '(이름 없음)'}</span> 님의 권한을{' '}
              <span className="font-semibold text-primary">
                {roleConfirm.role === 'admin' ? '일반' : '관리자'}
              </span>
              (으)로 변경하시겠습니까?
            </p>
          }
          confirmLabel="변경"
          confirmClass="text-white bg-primary hover:bg-primary/90"
          onConfirm={async () => {
            setActionLoading(true)
            try {
              const newRole = roleConfirm.role === 'admin' ? 'user' : 'admin'
              await handleRoleChange(roleConfirm.id, newRole)
            } finally {
              setActionLoading(false)
              setRoleConfirm(null)
            }
          }}
          onCancel={() => setRoleConfirm(null)}
          loading={actionLoading}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <ConfirmModal
          icon={<Trash2 className="w-5 h-5 text-red-600" />}
          iconBg="bg-red-50"
          title="회원 삭제"
          subtitle="삭제된 회원은 복구할 수 없습니다"
          message={
            <p>
              <span className="font-medium">{deleteConfirm.name || '(이름 없음)'}</span> (
              {deleteConfirm.email}) 님을 정말 삭제하시겠습니까?
            </p>
          }
          confirmLabel="삭제"
          confirmClass="text-white bg-red-600 hover:bg-red-700"
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
