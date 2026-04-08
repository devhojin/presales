'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import { createClient } from '@/lib/supabase'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  content_html: string
  category: string
  author: string
  published_at: string
  tags: string[]
  view_count: number
}

interface BlogPostSummary {
  id: number
  title: string
  slug: string
  excerpt: string | null
  category: string
  author: string
  published_at: string
  tags: string[]
  view_count: number
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = use(params)
  const slug = decodeURIComponent(rawSlug)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [allPosts, setAllPosts] = useState<BlogPostSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // 현재 포스트 로드
      const { data: postData } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      // 전체 포스트 (사이드바용)
      const { data: allData } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, category, author, published_at, tags, view_count')
        .eq('is_published', true)
        .order('published_at', { ascending: false })

      setPost(postData)
      setAllPosts(allData || [])
      setLoading(false)

      // 조회수 증가
      if (postData) {
        await supabase
          .from('blog_posts')
          .update({ view_count: (postData.view_count || 0) + 1 })
          .eq('id', postData.id)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
            <ChevronLeft className="w-4 h-4" />
            블로그로 돌아가기
          </Link>
          <div className="text-center py-12">
            <p className="text-gray-500">포스트를 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  const relatedPosts = allPosts.filter(
    (p) => p.category === post.category && p.id !== post.id
  ).slice(0, 5)

  const sanitizedHtml = DOMPurify.sanitize(post.content_html)

  return (
    <div className="min-h-screen bg-white">
      {/* Header — 리스트 페이지와 동일 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 group text-sm">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            블로그로 돌아가기
          </Link>
          <div className="text-sm text-gray-500 font-medium mb-2">{post.category}</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span>{post.author}</span>
            <span>·</span>
            <span>{formatDate(post.published_at)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.tags?.map((tag) => (
              <span key={tag} className="text-xs text-gray-500">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">

            {/* Content */}
            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-ul:my-4 prose-li:my-1 prose-table:border-collapse prose-th:bg-gray-50 prose-th:p-3 prose-th:text-left prose-th:border prose-th:border-gray-200 prose-td:p-3 prose-td:border prose-td:border-gray-200">
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            </div>

            <div className="border-t border-gray-100 my-8" />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">관련 글</h2>
                <div className="grid grid-cols-1 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                      <div className="border border-gray-100 rounded-lg p-4 hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer">
                        <p className="text-xs text-gray-500 mb-2">{relatedPost.category}</p>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{relatedPost.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-[230px] hidden lg:block">
            <div className="sticky top-[80px]">
              <h3 className="text-sm font-bold text-gray-900 mb-4">최신 글</h3>
              <div className="space-y-3">
                {allPosts.slice(0, 30).map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`}>
                    <div className={`cursor-pointer transition-colors group ${item.id === post.id ? 'bg-gray-100 rounded px-2 py-1' : ''}`}>
                      <p className={`text-xs font-medium group-hover:text-blue-600 line-clamp-2 leading-snug ${item.id === post.id ? 'text-blue-600' : 'text-gray-900'}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(item.published_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
