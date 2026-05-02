'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  AI_PROPOSAL_COVER_THEMES,
  AI_PROPOSAL_GUIDE_BASE_PATH,
  AI_PROPOSAL_GUIDE_SETTING_KEY,
  DEFAULT_AI_PROPOSAL_GUIDE_CONTENT,
  createAiProposalGuideCategoryDraft,
  createAiProposalGuideDraft,
  normalizeAiProposalSlug,
  parseAiProposalGuideContent,
  serializeAiProposalGuideContent,
  sortAiProposalCategories,
  sortAiProposalGuides,
  type AiProposalCoverTheme,
  type AiProposalGuideCategory,
  type AiProposalGuideContent,
  type AiProposalGuideStep,
} from '@/lib/ai-proposal-guide'

const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[400px] animate-pulse rounded-xl border border-border bg-muted" /> },
)

type Toast = { message: string; type: 'success' | 'error' }

const themeLabels: Record<AiProposalCoverTheme, string> = {
  ink: '블랙',
  blueprint: '블루',
  copper: '코퍼',
  mint: '민트',
  rose: '로즈',
  sand: '샌드',
  violet: '바이올렛',
  graphite: '그래파이트',
}

function nowIso() {
  return new Date().toISOString()
}

function toDateInputValue(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function fromDateInputValue(value: string) {
  if (!value) return nowIso()
  return new Date(`${value}T09:00:00+09:00`).toISOString()
}

function getUniqueSlugs(items: Array<{ slug: string }>) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const item of items) {
    if (seen.has(item.slug)) duplicates.add(item.slug)
    seen.add(item.slug)
  }
  return duplicates
}

function validateContent(content: AiProposalGuideContent): string | null {
  if (content.categories.length === 0) return '카테고리가 최소 1개 필요합니다.'
  if (content.articles.length === 0) return '글이 최소 1개 필요합니다.'
  if (content.categories.some((category) => !category.slug || !category.title.trim())) {
    return '카테고리의 slug와 제목을 확인해 주세요.'
  }
  if (content.articles.some((article) => !article.slug || !article.title.trim() || !article.description.trim())) {
    return '각 글의 slug, 제목, SEO 요약을 확인해 주세요.'
  }
  const categoryDuplicates = getUniqueSlugs(content.categories)
  if (categoryDuplicates.size > 0) return `중복 카테고리 slug가 있습니다: ${Array.from(categoryDuplicates).join(', ')}`
  const articleDuplicates = getUniqueSlugs(content.articles)
  if (articleDuplicates.size > 0) return `중복 글 slug가 있습니다: ${Array.from(articleDuplicates).join(', ')}`

  const categorySlugs = new Set(content.categories.map((category) => category.slug))
  const missingCategory = content.articles.find((article) => !categorySlugs.has(article.categorySlug))
  if (missingCategory) return `"${missingCategory.title}" 글의 카테고리를 다시 선택해 주세요.`
  return null
}

function normalizeBeforeSave(content: AiProposalGuideContent): AiProposalGuideContent {
  return parseAiProposalGuideContent(serializeAiProposalGuideContent({
    ...content,
    updatedAt: nowIso(),
    categories: sortAiProposalCategories(content.categories),
    articles: sortAiProposalGuides(content.articles.map((article) => ({ ...article, updatedAt: nowIso() }))),
  }))
}

export default function AdminAiProposalGuidePage() {
  const [content, setContent] = useState<AiProposalGuideContent>(DEFAULT_AI_PROPOSAL_GUIDE_CONTENT)
  const [selectedArticleId, setSelectedArticleId] = useState<string>(DEFAULT_AI_PROPOSAL_GUIDE_CONTENT.articles[0]?.id || '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const selectedArticle = useMemo(
    () => content.articles.find((article) => article.id === selectedArticleId) ?? content.articles[0] ?? null,
    [content.articles, selectedArticleId],
  )
  const publishedCount = useMemo(() => content.articles.filter((article) => article.isPublished).length, [content.articles])
  const categoriesBySlug = useMemo(
    () => new Map(content.categories.map((category) => [category.slug, category])),
    [content.categories],
  )

  useEffect(() => {
    async function loadContent() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', AI_PROPOSAL_GUIDE_SETTING_KEY)
          .maybeSingle()
        if (error) throw error
        const parsed = parseAiProposalGuideContent(data?.value)
        setContent(parsed)
        setSelectedArticleId(parsed.articles[0]?.id || '')
      } catch (error) {
        console.error(error)
        setContent(DEFAULT_AI_PROPOSAL_GUIDE_CONTENT)
      } finally {
        setLoading(false)
      }
    }
    void loadContent()
  }, [])

  function showToast(message: string, type: Toast['type']) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3200)
  }

  function updateArticle(id: string, patch: Partial<AiProposalGuideStep>) {
    setContent((current) => ({
      ...current,
      articles: current.articles.map((article) => (
        article.id === id
          ? { ...article, ...patch, updatedAt: nowIso() }
          : article
      )),
    }))
  }

  function updateCategory(id: string, patch: Partial<AiProposalGuideCategory>) {
    setContent((current) => {
      const previous = current.categories.find((category) => category.id === id)
      const categories = current.categories.map((category) => (category.id === id ? { ...category, ...patch } : category))
      const nextSlug = patch.slug
      const articles = previous && nextSlug && previous.slug !== nextSlug
        ? current.articles.map((article) => (
          article.categorySlug === previous.slug ? { ...article, categorySlug: nextSlug, updatedAt: nowIso() } : article
        ))
        : current.articles
      return { ...current, categories, articles }
    })
  }

  function addArticle() {
    const draft = createAiProposalGuideDraft(content)
    setContent((current) => ({ ...current, articles: [...current.articles, draft] }))
    setSelectedArticleId(draft.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function deleteArticle(article: AiProposalGuideStep) {
    if (!window.confirm(`"${article.title}" 글을 삭제할까요?`)) return
    setContent((current) => {
      const nextArticles = current.articles.filter((item) => item.id !== article.id)
      setSelectedArticleId(nextArticles[0]?.id || '')
      return { ...current, articles: nextArticles }
    })
  }

  function addCategory() {
    const draft = createAiProposalGuideCategoryDraft(content)
    setContent((current) => ({ ...current, categories: [...current.categories, draft] }))
  }

  function deleteCategory(category: AiProposalGuideCategory) {
    const hasArticles = content.articles.some((article) => article.categorySlug === category.slug)
    if (hasArticles) {
      showToast('글이 연결된 카테고리는 삭제할 수 없습니다. 먼저 글의 카테고리를 변경해 주세요.', 'error')
      return
    }
    if (!window.confirm(`"${category.title}" 카테고리를 삭제할까요?`)) return
    setContent((current) => ({ ...current, categories: current.categories.filter((item) => item.id !== category.id) }))
  }

  async function saveContent() {
    const normalized = normalizeBeforeSave(content)
    const errorMessage = validateContent(normalized)
    if (errorMessage) {
      showToast(errorMessage, 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          {
            key: AI_PROPOSAL_GUIDE_SETTING_KEY,
            value: serializeAiProposalGuideContent(normalized),
            updated_at: nowIso(),
          },
          { onConflict: 'key' },
        )
      if (error) throw error
      setContent(normalized)
      setSelectedArticleId(selectedArticleId || normalized.articles[0]?.id || '')
      showToast('AI 제안서 작성법 콘텐츠가 저장되었습니다.', 'success')
    } catch (error) {
      console.error(error)
      showToast('저장 중 오류가 발생했습니다. 관리자 권한과 site_settings 정책을 확인해 주세요.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl">
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
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AI 제안서 작성법</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            허브, 상세 페이지, RSS, sitemap에 반영되는 공개 콘텐츠입니다. 위험하거나 부정확한 문구는 여기에서 수정한 뒤 저장하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={AI_PROPOSAL_GUIDE_BASE_PATH}
            target="_blank"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
          >
            공개 페이지 보기
          </Link>
          <button
            type="button"
            onClick={saveContent}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: '전체 글', value: `${content.articles.length}건` },
          { label: '공개 글', value: `${publishedCount}건` },
          { label: '카테고리', value: `${content.categories.length}개` },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-white p-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold text-foreground">글 목록</h2>
              <button
                type="button"
                onClick={addArticle}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                글 추가
              </button>
            </div>
            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {sortAiProposalGuides(content.articles).map((article) => {
                const active = selectedArticle?.id === article.id
                const category = categoriesBySlug.get(article.categorySlug)
                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => setSelectedArticleId(article.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'border-border bg-white hover:bg-muted/50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-700">{String(article.step).padStart(2, '0')}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${article.isPublished ? 'text-green-700' : 'text-slate-500'}`}>
                        {article.isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {article.isPublished ? '공개' : '비공개'}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-bold leading-5 text-foreground">{article.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{category?.title || article.categorySlug}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-bold text-foreground">카테고리</h2>
              <button
                type="button"
                onClick={addCategory}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                추가
              </button>
            </div>
            <div className="space-y-4">
              {sortAiProposalCategories(content.categories).map((category) => (
                <div key={category.id} className="rounded-xl border border-border p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={category.isPublished}
                        onChange={(event) => updateCategory(category.id, { isPublished: event.target.checked })}
                      />
                      공개
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category)}
                      className="text-muted-foreground hover:text-red-600"
                      title="카테고리 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <input
                      value={category.title}
                      onChange={(event) => updateCategory(category.id, { title: event.target.value })}
                      className="h-9 rounded-lg border border-border px-3 text-sm"
                      placeholder="카테고리명"
                    />
                    <input
                      value={category.slug}
                      onChange={(event) => updateCategory(category.id, { slug: normalizeAiProposalSlug(event.target.value) })}
                      className="h-9 rounded-lg border border-border px-3 text-sm"
                      placeholder="category-slug"
                    />
                    <textarea
                      value={category.description}
                      onChange={(event) => updateCategory(category.id, { description: event.target.value })}
                      className="min-h-20 rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="설명"
                    />
                    <input
                      type="number"
                      value={category.sortOrder}
                      onChange={(event) => updateCategory(category.id, { sortOrder: Number(event.target.value) })}
                      className="h-9 rounded-lg border border-border px-3 text-sm"
                      placeholder="정렬"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {selectedArticle ? (
          <section className="rounded-2xl border border-border bg-white p-5">
            <div className="mb-5 flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700">편집 중</p>
                <h2 className="mt-1 break-words text-xl font-bold text-foreground">{selectedArticle.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`${AI_PROPOSAL_GUIDE_BASE_PATH}/${selectedArticle.slug}`}
                  target="_blank"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
                >
                  미리보기
                </Link>
                <button
                  type="button"
                  onClick={() => deleteArticle(selectedArticle)}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="제목">
                <input
                  value={selectedArticle.title}
                  onChange={(event) => updateArticle(selectedArticle.id, {
                    title: event.target.value,
                    coverTitle: selectedArticle.coverTitle === selectedArticle.title ? event.target.value : selectedArticle.coverTitle,
                  })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={selectedArticle.slug}
                  onChange={(event) => updateArticle(selectedArticle.id, { slug: normalizeAiProposalSlug(event.target.value) })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="카테고리">
                <select
                  value={selectedArticle.categorySlug}
                  onChange={(event) => updateArticle(selectedArticle.id, { categorySlug: event.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {sortAiProposalCategories(content.categories).map((category) => (
                    <option key={category.slug} value={category.slug}>{category.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="공개 상태">
                <button
                  type="button"
                  onClick={() => updateArticle(selectedArticle.id, { isPublished: !selectedArticle.isPublished })}
                  className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
                    selectedArticle.isPublished
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {selectedArticle.isPublished ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {selectedArticle.isPublished ? '공개 중' : '비공개'}
                </button>
              </Field>
              <Field label="SEO 요약">
                <textarea
                  value={selectedArticle.description}
                  onChange={(event) => updateArticle(selectedArticle.id, { description: event.target.value })}
                  className="min-h-24 w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </Field>
              <Field label="키워드 쉼표 구분">
                <textarea
                  value={selectedArticle.keywords.join(', ')}
                  onChange={(event) => updateArticle(selectedArticle.id, {
                    keywords: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                  })}
                  className="min-h-24 w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </Field>
              <Field label="대표 키워드">
                <input
                  value={selectedArticle.primaryKeyword}
                  onChange={(event) => updateArticle(selectedArticle.id, { primaryKeyword: event.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="발행일">
                <input
                  type="date"
                  value={toDateInputValue(selectedArticle.publishedAt)}
                  onChange={(event) => updateArticle(selectedArticle.id, { publishedAt: fromDateInputValue(event.target.value) })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="정렬 순서">
                <input
                  type="number"
                  value={selectedArticle.sortOrder}
                  onChange={(event) => updateArticle(selectedArticle.id, {
                    sortOrder: Number(event.target.value),
                    step: Number(event.target.value),
                  })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="읽는 시간(분)">
                <input
                  type="number"
                  value={selectedArticle.readingMinutes}
                  onChange={(event) => updateArticle(selectedArticle.id, { readingMinutes: Number(event.target.value) })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="커버 제목">
                <input
                  value={selectedArticle.coverTitle}
                  onChange={(event) => updateArticle(selectedArticle.id, { coverTitle: event.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="커버 부제">
                <input
                  value={selectedArticle.coverSubtitle}
                  onChange={(event) => updateArticle(selectedArticle.id, { coverSubtitle: event.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                />
              </Field>
              <Field label="커버 테마">
                <select
                  value={selectedArticle.coverTheme}
                  onChange={(event) => updateArticle(selectedArticle.id, { coverTheme: event.target.value as AiProposalCoverTheme })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                >
                  {AI_PROPOSAL_COVER_THEMES.map((theme) => (
                    <option key={theme} value={theme}>{themeLabels[theme]}</option>
                  ))}
                </select>
              </Field>
              <Field label="커버 이미지 URL">
                <input
                  value={selectedArticle.coverImageUrl}
                  onChange={(event) => updateArticle(selectedArticle.id, { coverImageUrl: event.target.value })}
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm"
                  placeholder="/images/... 또는 Supabase 공개 이미지 URL"
                />
              </Field>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">본문 에디터</label>
                <p className="text-xs text-muted-foreground">H2/H3, 목록, 링크, 이미지 삽입 가능</p>
              </div>
              <RichTextEditor
                key={selectedArticle.id}
                content={selectedArticle.bodyHtml}
                onChange={(html) => updateArticle(selectedArticle.id, { bodyHtml: html })}
                placeholder="본문을 입력하세요..."
              />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">
            편집할 글을 추가해 주세요.
          </section>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
