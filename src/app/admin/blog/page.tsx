'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Search,
  X,
  Save,
  FileText,
  Calendar,
  Eye as EyeIcon,
  ExternalLink,
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

function DeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 cursor-pointer"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null)

  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setPosts(data as BlogPost[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const togglePublished = async (post: BlogPost) => {
    const newStatus = !post.is_published
    const publishedAt = newStatus ? new Date().toISOString() : null

    await supabase
      .from('blog_posts')
      .update({ is_published: newStatus, published_at: publishedAt })
      .eq('id', post.id)
    fetchPosts()
  }

  const deletePost = async () => {
    if (!deletingPost) return
    await supabase.from('blog_posts').delete().eq('id', deletingPost.id)
    setDeletingPost(null)
    fetchPosts()
  }

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const publishedCount = posts.filter((p) => p.is_published).length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">블로그 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            총 {posts.length}개, 발행됨 {publishedCount}개
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          새 글 작성
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="제목 또는 내용으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Blog Posts Table */}
      {filteredPosts.length === 0 ? (
        <div className="border border-border rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? '검색 결과가 없습니다' : '블로그 글이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">제목</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">카테고리</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">태그</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-foreground">작성일</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-foreground">조회</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-foreground">상태</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-foreground">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {post.excerpt}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-muted-foreground">
                      {post.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                      {post.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{post.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {post.view_count}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => togglePublished(post)}
                      className={`px-2.5 py-1 text-xs rounded-full cursor-pointer ${
                        post.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {post.is_published ? '발행' : '초안'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                        title="프론트 보기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeletingPost(post)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 cursor-pointer transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal */}
      {deletingPost && (
        <DeleteModal
          title="블로그 글 삭제"
          message={`"${deletingPost.title}" 글을 삭제하시겠습니까?`}
          onConfirm={deletePost}
          onCancel={() => setDeletingPost(null)}
        />
      )}
    </div>
  )
}
