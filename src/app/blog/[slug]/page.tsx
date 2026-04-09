'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Loader2, ImageOff } from 'lucide-react'
import DOMPurify from 'dompurify'
import { createClient } from '@/lib/supabase'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  content_html: string
  thumbnail_url: string | null
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
  thumbnail_url: string | null
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
        .select('id, title, slug, excerpt, thumbnail_url, category, author, published_at, tags, view_count')
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-8 group text-sm font-medium transition-colors duration-300">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            블로그로 돌아가기
          </Link>
          <div className="text-center py-16">
            <p className="text-muted-foreground text-base">포스트를 찾을 수 없습니다.</p>
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
    <div className="min-h-screen bg-background">
      {/* Header — Editorial Style */}
      <div className="bg-background border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
          <Link href="/blog" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-8 group text-sm font-medium transition-colors duration-300">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            블로그로 돌아가기
          </Link>

          {/* Category Pill */}
          <div className="inline-flex items-center px-3 py-1.5 bg-emerald-50 rounded-full mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              {post.category}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b border-border/50">
            <span className="font-medium text-foreground">{post.author}</span>
            <span className="opacity-40">·</span>
            <span>{formatDate(post.published_at)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {post.tags?.map((tag) => (
              <span key={tag} className="text-xs text-emerald-600 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="flex gap-8 md:gap-12">
          {/* Main Content */}
          <div className="flex-1">
            {/* Content */}
            <article className="prose prose-sm max-w-none
              prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
              prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-5 prose-h2:leading-tight
              prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:leading-tight
              prose-h4:text-base prose-h4:mt-6 prose-h4:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base
              prose-strong:text-foreground prose-strong:font-semibold
              prose-em:text-muted-foreground
              prose-a:text-emerald-600 prose-a:underline hover:prose-a:text-emerald-700 prose-a:transition-colors
              prose-ul:my-6 prose-ul:pl-6 prose-li:text-muted-foreground prose-li:my-2 prose-li:leading-relaxed
              prose-ol:my-6 prose-ol:pl-6 prose-li:text-muted-foreground
              prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto
              prose-pre:text-foreground
              prose-blockquote:border-l-4 prose-blockquote:border-emerald-200 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-6
              prose-img:rounded-xl prose-img:border prose-img:border-border/50 prose-img:my-8
              prose-table:border-collapse prose-table:w-full prose-table:my-6
              prose-th:bg-muted prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:border prose-th:border-border
              prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-border prose-td:text-muted-foreground
              prose-hr:border-border/50 prose-hr:my-8
            ">
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            </article>

            <div className="border-t border-border/50 my-12 md:my-16" />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <section className="mt-12 md:mt-16">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 tracking-tight">관련 글</h2>
                <div className="grid grid-cols-1 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                      <div className="bg-card border border-border/50 rounded-2xl p-6 hover:border-emerald-200/50 hover:bg-muted/50 transition-all duration-500 group cursor-pointer">
                        <div className="inline-flex items-center px-3 py-1 bg-emerald-50 rounded-full mb-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                            {relatedPost.category}
                          </p>
                        </div>
                        <h3 className="font-bold text-lg text-foreground group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2 mb-3">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar — kakaowork reference style */}
          <aside className="w-[280px] hidden lg:block shrink-0">
            <div className="sticky top-[100px]">
              <h3 className="text-[16px] font-bold text-foreground mb-4">최신글</h3>
              <div className="space-y-4">
                {allPosts.slice(0, 8).map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="flex gap-3 group">
                    {/* Thumbnail 75x75 */}
                    <div className="w-[75px] h-[75px] rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.thumbnail_url ? (
                        <Image
                          src={item.thumbnail_url}
                          alt={item.title}
                          width={75}
                          height={75}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className={`text-[14px] font-normal leading-[22px] line-clamp-2 transition-colors duration-300 ${
                        item.id === post.id ? 'text-primary font-medium' : 'text-foreground group-hover:text-primary'
                      }`}>
                        {item.title}
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-1.5">
                        {item.category}
                      </p>
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
