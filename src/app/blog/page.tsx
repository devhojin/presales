'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Loader2, ImageOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface BlogPost {
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
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '오늘'
  if (date.toDateString() === yesterday.toDateString()) return '어제'
  return date.toLocaleDateString('ko-KR')
}

function SidebarItem({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="flex gap-3 group">
      {/* Thumbnail — 75x75 square */}
      <div className="w-[75px] h-[75px] rounded-lg overflow-hidden bg-muted shrink-0">
        {post.thumbnail_url ? (
          <Image
            src={post.thumbnail_url}
            alt={post.title}
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
        <p className="text-[14px] font-normal text-foreground leading-[22px] line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {post.title}
        </p>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          {post.category}
        </p>
      </div>
    </Link>
  )
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, thumbnail_url, category, author, published_at, tags, view_count')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
      setPosts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const query = searchQuery.toLowerCase()
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        (post.excerpt || '').toLowerCase().includes(query) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  }, [searchQuery, posts])

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">BLOG</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            블로그
          </h1>
          <p className="text-lg text-muted-foreground">
            공공조달 전문가의 인사이트와 실무 경험을 공유합니다
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="flex gap-8 md:gap-12">
          {/* Left Column: Posts */}
          <div className="flex-1">
            {/* Search */}
            <div className="mb-10 md:mb-12">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="제목, 태그, 카테고리로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-muted border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 ring-offset-background transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Posts List */}
            {filteredPosts.length > 0 ? (
              <div className="space-y-0">
                {filteredPosts.map((post, index) => (
                  <div key={post.id}>
                    <Link href={`/blog/${post.slug}`}>
                      <div className="py-6 md:py-7 px-4 md:px-6 cursor-pointer hover:bg-muted/50 rounded-xl transition-all duration-500 group -mx-4 md:-mx-6">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">{post.category}</span>
                          <span className="opacity-40">·</span>
                          <span>{formatDate(post.published_at)}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300 tracking-tight">
                          {post.title}
                        </h2>
                        <p className="text-muted-foreground text-sm md:text-base leading-relaxed line-clamp-2 mb-4">
                          {post.excerpt}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {post.tags?.map((tag) => (
                            <span key={tag} className="text-xs text-primary font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                    {index < filteredPosts.length - 1 && <div className="border-b border-border/50 mx-4 md:mx-6" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-base">
                  {posts.length === 0 ? '아직 게시된 글이 없습니다.' : '검색 결과가 없습니다. 다른 키워드를 시도해보세요.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar — kakaowork reference */}
          <aside className="w-[280px] hidden lg:block shrink-0">
            <div className="sticky top-[100px]">
              <h3 className="text-[16px] font-bold text-foreground mb-4">최신글</h3>
              <div className="space-y-4">
                {posts.slice(0, 8).map((post) => (
                  <SidebarItem key={post.id} post={post} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
