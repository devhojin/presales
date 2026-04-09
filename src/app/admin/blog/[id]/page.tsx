'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { RichTextEditor } from '@/components/RichTextEditor'
import {
  Save,
  Loader2,
  ArrowLeft,
  X,
  Zap,
  Upload,
  ImageIcon,
  Star,
  Trash2,
} from 'lucide-react'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  content_html: string
  thumbnail_url: string | null
  tags: string[]
  category: string
  author: string
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

const CATEGORIES = ['일반', '제안서 작성', '입찰 가이드', '가격 전략', '업계 동향']

function generateSlug(title: string, id?: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  return id ? `${base}-${id}` : base
}

function extractTags(html: string): string[] {
  // Create a DOM context for parsing HTML
  if (typeof document === 'undefined') return []

  const div = document.createElement('div')
  div.innerHTML = html

  // Extract h2, h3 text
  const headings = Array.from(div.querySelectorAll('h2, h3'))
    .map((el) => el.textContent?.trim() || '')
    .filter(Boolean)

  // Extract text content and find frequently occurring words
  const text = div.textContent || ''
  const words = text.match(/[가-힣]{2,5}/g) || []
  const freq = new Map<string, number>()
  words.forEach((w) => {
    freq.set(w, (freq.get(w) || 0) + 1)
  })

  // Filter words with frequency >= 3, sort by frequency
  const topWords = [...freq.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  // Extract meaningful words from headings
  const headingWords = headings.flatMap((h) => h.match(/[가-힣]{2,5}/g) || [])

  // Remove duplicates and limit to 10
  return [...new Set([...headingWords, ...topWords])].slice(0, 10)
}

export default function AdminBlogEditPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Partial<BlogPost> | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [category, setCategory] = useState('일반')
  const [author, setAuthor] = useState('프리세일즈 팀')
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const isNew = postId === 'new'

  const fetchPost = useCallback(async () => {
    if (isNew) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', parseInt(postId))
      .single()

    if (data) {
      setPost(data as BlogPost)
      setTitle(data.title)
      setSlug(data.slug)
      setExcerpt(data.excerpt)
      setContentHtml(data.content_html)
      setThumbnailUrl(data.thumbnail_url || '')
      setTags(data.tags || [])
      setCategory(data.category)
      setAuthor(data.author)
      setIsPublished(data.is_published)
    }
    setLoading(false)
  }, [postId, isNew, supabase])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  // Auto-generate slug when title changes
  useEffect(() => {
    if (!post?.id) {
      // For new posts, don't include ID in slug generation
      setSlug(generateSlug(title))
    }
  }, [title, post?.id])

  const handleExtractTags = () => {
    const extracted = extractTags(contentHtml)
    setTags((prev) => {
      const combined = [...new Set([...prev, ...extracted])]
      return combined.slice(0, 10)
    })
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()].slice(0, 10))
      setTagInput('')
    }
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!title.trim() || !contentHtml.trim()) {
      alert('제목과 본문은 필수입니다.')
      return
    }

    setSaving(true)

    const postData = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      excerpt: excerpt.trim(),
      content_html: contentHtml,
      thumbnail_url: thumbnailUrl || null,
      tags: tags,
      category: category,
      author: author,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    }

    try {
      if (isNew) {
        // Create new post
        const { data, error } = await supabase
          .from('blog_posts')
          .insert([{ ...postData, created_at: new Date().toISOString() }])
          .select()

        if (error) throw error

        router.push('/admin/blog')
      } else {
        // Update existing post
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', parseInt(postId))

        if (error) throw error

        router.push('/admin/blog')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-xl cursor-pointer transition-colors"
          title="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isNew ? '새 글 작성' : '글 수정'}</h1>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Title */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="글 제목을 입력하세요"
            className="w-full px-4 py-3 border border-border rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Slug */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            슬러그 (자동 생성)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-friendly-slug"
            className="w-full px-4 py-2 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground mt-2">
            URL: /blog/{slug}
          </p>
        </div>

        {/* Excerpt */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            요약 (2-3줄)
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="글에 대한 짧은 요약을 입력하세요"
            rows={3}
            maxLength={200}
            className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {excerpt.length}/200자
          </p>
        </div>

        {/* Content Editor */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            본문 내용 <span className="text-red-500">*</span>
          </label>
          <RichTextEditor
            content={contentHtml}
            onChange={setContentHtml}
            placeholder="블로그 글 내용을 작성하세요..."
          />
        </div>

        {/* Thumbnail — 대표이미지 업로드 */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              대표 이미지
            </span>
          </label>
          <p className="text-xs text-muted-foreground mb-4">
            블로그 목록 및 사이드바 미리보기에 표시됩니다. 권장 크기: 600x400px, 최대 5MB
          </p>

          {/* Upload area */}
          {!thumbnailUrl ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-muted-foreground">클릭하여 이미지 업로드</span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP (최대 5MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) {
                    alert('파일 크기는 5MB 이하여야 합니다.')
                    return
                  }
                  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
                  const fileName = `blog/${isNew ? 'temp' : postId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
                  const { error: uploadErr } = await supabase.storage.from('product-thumbnails').upload(fileName, file)
                  if (uploadErr) {
                    alert('업로드 실패: ' + uploadErr.message)
                    return
                  }
                  const { data: urlData } = supabase.storage.from('product-thumbnails').getPublicUrl(fileName)
                  setThumbnailUrl(urlData.publicUrl)
                }}
              />
            </label>
          ) : (
            <div className="relative">
              <div className="relative w-full max-w-sm">
                <img
                  src={thumbnailUrl}
                  alt="대표 이미지 미리보기"
                  className="w-full h-48 object-cover rounded-xl border border-border"
                />
                {/* 대표이미지 표시 뱃지 */}
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-md">
                  <Star className="w-3 h-3" />
                  대표
                </div>
                {/* 삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => setThumbnailUrl('')}
                  className="absolute top-2 right-2 w-7 h-7 bg-foreground/60 hover:bg-foreground/80 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* URL 직접 입력 (폴백) */}
              <div className="mt-3">
                <label className="text-xs text-muted-foreground mb-1 block">또는 URL 직접 입력</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            카테고리
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Author */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="block text-sm font-semibold text-foreground mb-3">
            작성자
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="작성자 이름"
            className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-foreground">
              태그
            </label>
            <button
              type="button"
              onClick={handleExtractTags}
              className="px-3 py-1 text-xs bg-primary/8 text-primary rounded-xl hover:bg-primary/10 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              자동 추출
            </button>
          </div>

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    className="text-primary hover:text-primary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add tag input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="태그 입력 후 Enter"
              className="flex-1 px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              maxLength={20}
              disabled={tags.length >= 10}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={tags.length >= 10 || !tagInput.trim()}
              className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {tags.length}/10개 태그
          </p>
        </div>

        {/* Publish Status */}
        <div className="bg-white rounded-xl border border-border p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">
              발행 상태 (발행하면 공개됩니다)
            </span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 sticky bottom-4 bg-muted -mx-4 -mb-4 px-4 py-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted cursor-pointer transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim() || !contentHtml.trim()}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
