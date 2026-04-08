'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface BlogPost {
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
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '오늘'
  if (date.toDateString() === yesterday.toDateString()) return '어제'
  return date.toLocaleDateString('ko-KR')
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
        .select('id, title, slug, excerpt, category, author, published_at, tags, view_count')
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">블로그</h1>
          <p className="text-lg text-gray-600">공공조달 전문가의 인사이트</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="flex gap-8">
          {/* Left Column: Posts */}
          <div className="flex-1">
            {/* Search */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="제목 또는 태그로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
              </div>
            </div>

            {/* Posts List */}
            {filteredPosts.length > 0 ? (
              <div className="space-y-0">
                {filteredPosts.map((post, index) => (
                  <div key={post.id}>
                    <Link href={`/blog/${post.slug}`}>
                      <div className="py-6 cursor-pointer hover:bg-gray-50 transition-colors px-0 group">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="font-medium">{post.category}</span>
                          <span>·</span>
                          <span>{formatDate(post.published_at)}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h2>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                          {post.excerpt}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {post.tags?.map((tag) => (
                            <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    </Link>
                    {index < filteredPosts.length - 1 && <div className="border-b border-gray-100" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">
                  {posts.length === 0 ? '아직 게시된 글이 없습니다.' : '검색 결과가 없습니다. 다른 키워드를 시도해보세요.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <aside className="w-[230px] hidden lg:block">
            <div className="sticky top-[80px]">
              <h3 className="text-sm font-bold text-gray-900 mb-4">최신 글</h3>
              <div className="space-y-3">
                {posts.slice(0, 30).map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <div className="cursor-pointer hover:text-blue-600 transition-colors group">
                      <p className="text-xs text-gray-900 font-medium group-hover:text-blue-600 line-clamp-2 leading-snug">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(post.published_at)}</p>
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
