'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft } from 'lucide-react'

// 임시 블로그 포스트 데이터
const BLOG_POSTS = [
  {
    id: 1,
    title: '기술제안서 작성, 이것만 알면 됩니다',
    slug: 'technical-proposal-guide',
    excerpt: '나라장터 기술제안서의 핵심 구성요소 5가지를 완벽히 해설합니다.',
    category: '제안서 작성',
    author: '조달 전문가',
    published_at: '2026-04-08',
    tags: ['기술제안서', '제안서', '나라장터'],
    view_count: 234,
  },
  {
    id: 2,
    title: '나라장터 입찰 초보 가이드',
    slug: 'nara-jangter-bidding-guide',
    excerpt: '조달청 나라장터 입찰 절차를 단계별로 완벽히 안내합니다.',
    category: '입찰 절차',
    author: '조달 전문가',
    published_at: '2026-04-07',
    tags: ['나라장터', '입찰', '가이드'],
    view_count: 156,
  },
  {
    id: 3,
    title: '낙찰률을 높이는 가격제안서 전략',
    slug: 'price-proposal-strategy',
    excerpt: '경쟁력 있는 가격 제시로 낙찰률을 높이는 실전 전략을 공개합니다.',
    category: '가격 전략',
    author: '조달 전문가',
    published_at: '2026-04-06',
    tags: ['가격제안서', '전략', '낙찰'],
    view_count: 312,
  },
  {
    id: 4,
    title: '발주청 평가표 완벽 분석법',
    slug: 'evaluation-criteria-analysis',
    excerpt: '평가표를 역산해서 고득점 포인트를 파악하는 방법을 소개합니다.',
    category: '입찰 전략',
    author: '조달 전문가',
    published_at: '2026-04-05',
    tags: ['평가표', '분석', '입찰전략'],
    view_count: 189,
  },
  {
    id: 5,
    title: '발표 PT 슬라이드 구성 전략',
    slug: 'presentation-strategy',
    excerpt: '심사위원의 눈을 사로잡는 발표 자료 구성과 스토리텔링 기법을 다룹니다.',
    category: '발표 PT',
    author: '조달 전문가',
    published_at: '2026-04-04',
    tags: ['발표', 'PT', '슬라이드'],
    view_count: 98,
  },
  {
    id: 6,
    title: '2026년 공공 IT 조달 트렌드',
    slug: 'public-it-procurement-trend',
    excerpt: 'AI·클라우드·디지털전환 중심의 공공 IT 사업 발주 동향을 분석합니다.',
    category: '시장 분석',
    author: '조달 전문가',
    published_at: '2026-04-03',
    tags: ['AI', '클라우드', '조달트렌드'],
    view_count: 267,
  },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '오늘'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '어제'
  } else {
    return date.toLocaleDateString('ko-KR')
  }
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // 검색 필터링
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return BLOG_POSTS
    }
    const query = searchQuery.toLowerCase()
    return BLOG_POSTS.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  }, [searchQuery])

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
                        {/* Meta */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <span className="font-medium">{post.category}</span>
                          <span>·</span>
                          <span>{formatDate(post.published_at)}</span>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h2>

                        {/* Excerpt */}
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                          {post.excerpt}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-xs text-gray-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>

                    {/* Divider */}
                    {index < filteredPosts.length - 1 && (
                      <div className="border-b border-gray-100" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">
                  검색 결과가 없습니다. 다른 키워드를 시도해보세요.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <aside className="w-[230px] hidden lg:block">
            <div className="sticky top-[80px]">
              {/* Latest Posts */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">최신 글</h3>
                <div className="space-y-3">
                  {BLOG_POSTS.slice(0, 30).map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`}>
                      <div className="cursor-pointer hover:text-blue-600 transition-colors group">
                        <p className="text-xs text-gray-900 font-medium group-hover:text-blue-600 line-clamp-2 leading-snug">
                          {post.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(post.published_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
