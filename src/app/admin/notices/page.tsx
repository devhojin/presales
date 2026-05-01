'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  formatNoticeDate,
  getNoticeCategoryLabel,
  NOTICE_CATEGORIES,
  parseSiteNotices,
  serializeSiteNotices,
  SITE_NOTICES_SETTING_KEY,
  sortSiteNotices,
  type NoticeCategory,
  type SiteNotice,
} from '@/lib/site-notices'

type NoticeDraft = {
  title: string
  summary: string
  body: string
  category: NoticeCategory
  publishedAt: string
  isPublished: boolean
  isPinned: boolean
}

const EMPTY_DRAFT: NoticeDraft = {
  title: '',
  summary: '',
  body: '',
  category: 'service',
  publishedAt: new Date().toISOString().slice(0, 10),
  isPublished: true,
  isPinned: false,
}

function createNoticeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `notice-${Date.now()}`
}

function toDateInputValue(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function fromDateInputValue(value: string) {
  if (!value) return new Date().toISOString()
  return new Date(`${value}T09:00:00+09:00`).toISOString()
}

function noticeToDraft(notice: SiteNotice): NoticeDraft {
  return {
    title: notice.title,
    summary: notice.summary,
    body: notice.body,
    category: notice.category,
    publishedAt: toDateInputValue(notice.publishedAt),
    isPublished: notice.isPublished,
    isPinned: notice.isPinned,
  }
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<SiteNotice[]>([])
  const [draft, setDraft] = useState<NoticeDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const publishedCount = useMemo(() => notices.filter((notice) => notice.isPublished).length, [notices])
  const pinnedCount = useMemo(() => notices.filter((notice) => notice.isPinned).length, [notices])
  const editingNotice = useMemo(
    () => notices.find((notice) => notice.id === editingId) ?? null,
    [editingId, notices],
  )

  useEffect(() => {
    async function loadNotices() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', SITE_NOTICES_SETTING_KEY)
        .maybeSingle()

      if (!error) setNotices(sortSiteNotices(parseSiteNotices(data?.value)))
      setLoading(false)
    }

    void loadNotices()
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveNotices(nextNotices: SiteNotice[]) {
    setSaving(true)
    try {
      const sortedNotices = sortSiteNotices(nextNotices)
      const supabase = createClient()
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          {
            key: SITE_NOTICES_SETTING_KEY,
            value: serializeSiteNotices(sortedNotices),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' },
        )
      if (error) throw error
      setNotices(sortedNotices)
      showToast('공지사항이 저장되었습니다.', 'success')
    } catch (error) {
      console.error(error)
      showToast('공지사항 저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setDraft({ ...EMPTY_DRAFT, publishedAt: new Date().toISOString().slice(0, 10) })
    setEditingId(null)
  }

  async function handleSubmit() {
    const title = draft.title.trim()
    if (!title) {
      showToast('제목을 입력해 주세요.', 'error')
      return
    }

    const now = new Date().toISOString()
    const nextNotice: SiteNotice = {
      id: editingId || createNoticeId(),
      title,
      summary: draft.summary.trim(),
      body: draft.body.trim(),
      category: draft.category,
      publishedAt: fromDateInputValue(draft.publishedAt),
      isPublished: draft.isPublished,
      isPinned: draft.isPinned,
      updatedAt: now,
    }

    const nextNotices = editingId
      ? notices.map((notice) => (notice.id === editingId ? nextNotice : notice))
      : [nextNotice, ...notices]

    await saveNotices(nextNotices)
    resetForm()
  }

  async function togglePublished(notice: SiteNotice) {
    await saveNotices(
      notices.map((item) =>
        item.id === notice.id
          ? { ...item, isPublished: !item.isPublished, updatedAt: new Date().toISOString() }
          : item,
      ),
    )
  }

  async function togglePinned(notice: SiteNotice) {
    await saveNotices(
      notices.map((item) =>
        item.id === notice.id
          ? { ...item, isPinned: !item.isPinned, updatedAt: new Date().toISOString() }
          : item,
      ),
    )
  }

  async function deleteNotice(notice: SiteNotice) {
    if (!window.confirm(`"${notice.title}" 공지사항을 삭제할까요?`)) return
    await saveNotices(notices.filter((item) => item.id !== notice.id))
    if (editingId === notice.id) resetForm()
  }

  function startEdit(notice: SiteNotice) {
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
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">공지사항 관리</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            사이트 변경, 결제 안내, 문서 업데이트처럼 이용자가 확인해야 할 내용을 푸터의 공지사항 페이지에 게시합니다.
          </p>
        </div>
        <Link
          href="/notices"
          target="_blank"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          공개 페이지 보기
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: '전체', value: `${notices.length}건` },
          { label: '공개', value: `${publishedCount}건` },
          { label: '고정', value: `${pinnedCount}건` },
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
              {editingNotice ? '공지사항 수정' : '새 공지사항'}
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
              <label className="mb-1 block text-sm font-medium text-foreground">제목</label>
              <input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="예: 결제 수단 안내"
                className="h-10 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">분류</label>
                <select
                  value={draft.category}
                  onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value as NoticeCategory }))}
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {NOTICE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">게시일</label>
                <input
                  type="date"
                  value={draft.publishedAt}
                  onChange={(event) => setDraft((prev) => ({ ...prev, publishedAt: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">요약</label>
              <textarea
                value={draft.summary}
                onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
                rows={3}
                placeholder="목록에서 먼저 보일 짧은 설명"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">본문</label>
              <textarea
                value={draft.body}
                onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                rows={8}
                placeholder="상세 공지 내용을 입력하세요"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(event) => setDraft((prev) => ({ ...prev, isPublished: event.target.checked }))}
                />
                공개
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isPinned}
                  onChange={(event) => setDraft((prev) => ({ ...prev, isPinned: event.target.checked }))}
                />
                상단 고정
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingNotice ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingNotice ? '수정 저장' : '공지사항 추가'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">공지사항 목록</h2>
          </div>

          {notices.length === 0 ? (
            <div className="px-5 py-16 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-9 w-9 opacity-30" />
              <p className="text-sm">등록된 공지사항이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notices.map((notice) => (
                <article key={notice.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      {getNoticeCategoryLabel(notice.category)}
                    </span>
                    {notice.isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        <Pin className="h-3 w-3" />
                        고정
                      </span>
                    )}
                    <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                      notice.isPublished ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {notice.isPublished ? '공개' : '비공개'}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatNoticeDate(notice.publishedAt)}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{notice.title}</h3>
                  {notice.summary && <p className="mt-2 text-sm leading-6 text-muted-foreground">{notice.summary}</p>}

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
                      onClick={() => void togglePinned(notice)}
                      disabled={saving}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-60"
                    >
                      {notice.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      {notice.isPinned ? '고정 해제' : '고정'}
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
