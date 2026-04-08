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
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
          className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          title="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isNew ? '새 글 작성' : '글 수정'}</h1>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Title */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="글 제목을 입력하세요"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Slug */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            슬러그 (자동 생성)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-friendly-slug"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <p className="text-xs text-gray-500 mt-2">
            URL: /blog/{slug}
          </p>
        </div>

        {/* Excerpt */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            요약 (2-3줄)
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="글에 대한 짧은 요약을 입력하세요"
            rows={3}
            maxLength={200}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            {excerpt.length}/200자
          </p>
        </div>

        {/* Content Editor */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            본문 내용 <span className="text-red-500">*</span>
          </label>
          <RichTextEditor
            content={contentHtml}
            onChange={setContentHtml}
            placeholder="블로그 글 내용을 작성하세요..."
          />
        </div>

        {/* Thumbnail URL */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            썸네일 이미지 URL
          </label>
          <input
            type="text"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          {thumbnailUrl && (
            <div className="mt-3">
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="w-full max-w-xs h-40 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            카테고리
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Author */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            작성자
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="작성자 이름"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-900">
              태그
            </label>
            <button
              type="button"
              onClick={handleExtractTags}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
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
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    className="text-blue-600 hover:text-blue-800 cursor-pointer"
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
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              maxLength={20}
              disabled={tags.length >= 10}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={tags.length >= 10 || !tagInput.trim()}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {tags.length}/10개 태그
          </p>
        </div>

        {/* Publish Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-900">
              발행 상태 (발행하면 공개됩니다)
            </span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 sticky bottom-4 bg-gray-50 -mx-4 -mb-4 px-4 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim() || !contentHtml.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 transition-colors"
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
