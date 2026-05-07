'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type { TickerNotice } from '@/lib/ticker-notices'

type TickerDraft = {
  message: string
  href: string
  isPublished: boolean
}

const EMPTY_DRAFT: TickerDraft = {
  message: '',
  href: '',
  isPublished: true,
}

function createTickerId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ticker-${Date.now()}`
}

function noticeToDraft(notice: TickerNotice): TickerDraft {
  return {
    message: notice.message,
    href: notice.href,
    isPublished: notice.isPublished,
  }
}

function isAllowedHref(href: string) {
  if (!href) return true
  const lowerHref = href.toLowerCase()
  const isInternalPath = href.startsWith('/') && !href.startsWith('//')
  return (
    isInternalPath ||
    lowerHref.startsWith('https://') ||
    lowerHref.startsWith('http://') ||
    lowerHref.startsWith('mailto:') ||
    lowerHref.startsWith('tel:')
  )
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AdminTickerNoticesPage() {
  const [notices, setNotices] = useState<TickerNotice[]>([])
  const [draft, setDraft] = useState<TickerDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const publishedCount = useMemo(() => notices.filter((notice) => notice.isPublished).length, [notices])
  const linkedCount = useMemo(() => notices.filter((notice) => notice.href).length, [notices])
  const editingNotice = useMemo(
    () => notices.find((notice) => notice.id === editingId) ?? null,
    [editingId, notices],
  )

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    async function loadNotices() {
      try {
        const response = await fetch('/api/admin/ticker-notices', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const data = await response.json() as { notices?: TickerNotice[]; error?: string }
        if (!response.ok) throw new Error(data.error || '티커 공지를 불러오지 못했습니다.')
        setNotices(Array.isArray(data.notices) ? data.notices : [])
      } catch (error) {
        console.error(error)
        showToast('티커 공지를 불러오지 못했습니다.', 'error')
      } finally {
        setLoading(false)
      }
    }

    void loadNotices()
  }, [showToast])

  async function saveNotices(nextNotices: TickerNotice[]) {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/ticker-notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ notices: nextNotices }),
      })
      const data = await response.json() as { notices?: TickerNotice[]; error?: string }
      if (!response.ok) throw new Error(data.error || '티커 공지를 저장하지 못했습니다.')

      setNotices(Array.isArray(data.notices) ? data.notices : nextNotices)
      showToast('티커 공지가 저장되었습니다.', 'success')
    } catch (error) {
      console.error(error)
      showToast('티커 공지 저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
  }

  async function handleSubmit() {
    const message = draft.message.trim()
    const href = draft.href.trim()

    if (!message) {
      showToast('티커 문구를 입력해 주세요.', 'error')
      return
    }

    if (!isAllowedHref(href)) {
      showToast('링크는 /, http(s), mailto, tel 형식만 사용할 수 있습니다.', 'error')
      return
    }

    const now = new Date().toISOString()
    const nextNotice: TickerNotice = {
      id: editingId || createTickerId(),
      message,
      href,
      isPublished: draft.isPublished,
      updatedAt: now,
    }

    const nextNotices = editingId
      ? notices.map((notice) => (notice.id === editingId ? nextNotice : notice))
      : [nextNotice, ...notices]

    await saveNotices(nextNotices)
    resetForm()
  }

  async function togglePublished(notice: TickerNotice) {
    await saveNotices(
      notices.map((item) =>
        item.id === notice.id
          ? { ...item, isPublished: !item.isPublished, updatedAt: new Date().toISOString() }
          : item,
      ),
    )
  }

  async function deleteNotice(notice: TickerNotice) {
    if (!window.confirm(`"${notice.message}" 티커 공지를 삭제할까요?`)) return
    await saveNotices(notices.filter((item) => item.id !== notice.id))
    if (editingId === notice.id) resetForm()
  }

  function startEdit(notice: TickerNotice) {
    setEditingId(notice.id)
    setDraft(noticeToDraft(notice))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">티커 공지 관리</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            메인페이지 상단에 흐르는 티커 문구를 등록, 수정, 삭제합니다.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          메인페이지 보기
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: '전체', value: `${notices.length}건` },
          { label: '공개', value: `${publishedCount}건` },
          { label: '링크 포함', value: `${linkedCount}건` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-white p-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-border bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {editingNotice ? '티커 공지 수정' : '새 티커 공지'}
            </h2>
            {editingNotice && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
                취소
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-foreground">티커 문구</label>
                <span className="text-xs text-muted-foreground">{draft.message.length}/180</span>
              </div>
              <textarea
                value={draft.message}
                onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))}
                rows={4}
                maxLength={180}
                placeholder="예: PG 연동문제로 무통장입금과 무료다운로드만 가능합니다."
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">링크</label>
              <input
                value={draft.href}
                onChange={(event) => setDraft((prev) => ({ ...prev, href: event.target.value }))}
                maxLength={300}
                placeholder="/store 또는 https://..."
                className="h-10 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(event) => setDraft((prev) => ({ ...prev, isPublished: event.target.checked }))}
              />
              공개
            </label>

            {draft.message.trim() && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {draft.message.trim()}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingNotice ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingNotice ? '수정 저장' : '티커 공지 추가'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">티커 공지 목록</h2>
          </div>

          {notices.length === 0 ? (
            <div className="px-5 py-16 text-center text-muted-foreground">
              <Megaphone className="mx-auto mb-3 h-9 w-9 opacity-30" />
              <p className="text-sm">등록된 티커 공지가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notices.map((notice) => (
                <article key={notice.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                      notice.isPublished ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {notice.isPublished ? '공개' : '비공개'}
                    </span>
                    {notice.href && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        <Link2 className="h-3 w-3" />
                        링크
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatUpdatedAt(notice.updatedAt)}</span>
                  </div>

                  <p className="break-keep text-base font-semibold leading-7 text-foreground">{notice.message}</p>
                  {notice.href && <p className="mt-2 break-all text-xs text-muted-foreground">{notice.href}</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(notice)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePublished(notice)}
                      disabled={saving}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-60"
                    >
                      {notice.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {notice.isPublished ? '비공개' : '공개'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteNotice(notice)}
                      disabled={saving}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      삭제
                    </button>
                    {editingId === notice.id && (
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-medium text-blue-700">
                        <Check className="h-3.5 w-3.5" />
                        편집 중
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
