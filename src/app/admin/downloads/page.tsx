'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, ChevronLeft, ChevronRight, Download, X } from 'lucide-react'

interface DownloadLog {
  id: number
  user_id: string
  product_id: number
  file_name: string
  downloaded_at: string
}

interface ProfileMap {
  [userId: string]: { name: string; email: string }
}

interface ProductMap {
  [productId: number]: string
}

const PAGE_SIZE = 20

export default function AdminDownloads() {
  const [logs, setLogs] = useState<DownloadLog[]>([])
  const [profileMap, setProfileMap] = useState<ProfileMap>({})
  const [productMap, setProductMap] = useState<ProductMap>({})
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Filters (committed on search)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Build user_id / product_id arrays from search first if needed
    // For text search we resolve ids then filter
    let userIdsForSearch: string[] | null = null
    let productIdsForSearch: number[] | null = null

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      // Search profiles
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      if (matchedProfiles) userIdsForSearch = matchedProfiles.map((p) => p.id)

      // Search products
      const { data: matchedProducts } = await supabase
        .from('products')
        .select('id')
        .ilike('title', `%${q}%`)
      if (matchedProducts) productIdsForSearch = matchedProducts.map((p) => p.id)
    }

    // Build count query
    let countBase = supabase
      .from('download_logs')
      .select('*', { count: 'exact', head: true })

    if (dateFrom) countBase = countBase.gte('downloaded_at', dateFrom)
    if (dateTo) countBase = countBase.lte('downloaded_at', dateTo + 'T23:59:59')

    if (search.trim()) {
      const fileFilter = `file_name.ilike.%${search.trim()}%`
      const orParts: string[] = [fileFilter]
      if (userIdsForSearch && userIdsForSearch.length > 0) {
        orParts.push(`user_id.in.(${userIdsForSearch.join(',')})`)
      }
      if (productIdsForSearch && productIdsForSearch.length > 0) {
        orParts.push(`product_id.in.(${productIdsForSearch.join(',')})`)
      }
      countBase = countBase.or(orParts.join(','))
    }

    const { count } = await countBase
    setTotalCount(count || 0)

    // Build data query
    let dataQuery = supabase
      .from('download_logs')
      .select('*')
      .order('downloaded_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (dateFrom) dataQuery = dataQuery.gte('downloaded_at', dateFrom)
    if (dateTo) dataQuery = dataQuery.lte('downloaded_at', dateTo + 'T23:59:59')

    if (search.trim()) {
      const fileFilter = `file_name.ilike.%${search.trim()}%`
      const orParts: string[] = [fileFilter]
      if (userIdsForSearch && userIdsForSearch.length > 0) {
        orParts.push(`user_id.in.(${userIdsForSearch.join(',')})`)
      }
      if (productIdsForSearch && productIdsForSearch.length > 0) {
        orParts.push(`product_id.in.(${productIdsForSearch.join(',')})`)
      }
      dataQuery = dataQuery.or(orParts.join(','))
    }

    const { data } = await dataQuery
    const logList = (data || []) as DownloadLog[]
    setLogs(logList)

    // Fetch profiles for this page
    const userIds = [...new Set(logList.map((l) => l.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      const map: ProfileMap = {}
      if (profiles) {
        for (const p of profiles) {
          map[p.id] = { name: p.name || '-', email: p.email || '-' }
        }
      }
      setProfileMap(map)
    } else {
      setProfileMap({})
    }

    // Fetch product names for this page
    const productIds = [...new Set(logList.map((l) => l.product_id).filter(Boolean))]
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .in('id', productIds)
      const map: ProductMap = {}
      if (products) {
        for (const p of products) {
          map[p.id] = p.title
        }
      }
      setProductMap(map)
    } else {
      setProductMap({})
    }

    setLoading(false)
  }, [page, search, dateFrom, dateTo])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, dateFrom, dateTo])

  async function handleCSVExport() {
    // Fetch all matching records for CSV
    const supabase = createClient()

    let query = supabase
      .from('download_logs')
      .select('*')
      .order('downloaded_at', { ascending: false })

    if (dateFrom) query = query.gte('downloaded_at', dateFrom)
    if (dateTo) query = query.lte('downloaded_at', dateTo + 'T23:59:59')

    const { data } = await query
    const allLogs = (data || []) as DownloadLog[]

    // Fetch all profiles and products needed
    const userIds = [...new Set(allLogs.map((l) => l.user_id).filter(Boolean))]
    const productIds = [...new Set(allLogs.map((l) => l.product_id).filter(Boolean))]

    const [profilesRes, productsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from('profiles').select('id, name, email').in('id', userIds)
        : Promise.resolve({ data: [] }),
      productIds.length > 0
        ? supabase.from('products').select('id, title').in('id', productIds)
        : Promise.resolve({ data: [] }),
    ])

    const pMap: ProfileMap = {}
    for (const p of profilesRes.data || []) {
      pMap[p.id] = { name: p.name || '-', email: p.email || '-' }
    }
    const prMap: ProductMap = {}
    for (const p of productsRes.data || []) {
      prMap[p.id] = p.title
    }

    const header = '다운로드일시,사용자명,이메일,상품명,파일명'
    const rows = allLogs.map((l) => {
      return [
        new Date(l.downloaded_at).toLocaleString('ko-KR'),
        pMap[l.user_id]?.name || '-',
        pMap[l.user_id]?.email || '-',
        `"${prMap[l.product_id] || '-'}"`,
        `"${l.file_name}"`,
      ].join(',')
    })

    const csv = '\uFEFF' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `downloads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getPageRange = () => {
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">다운로드 관리</h1>
            <p className="text-sm text-muted-foreground">총 {totalCount}건의 다운로드 기록</p>
          </div>
        </div>
        <button
          onClick={handleCSVExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-white border border-border rounded-xl hover:bg-muted transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          CSV 내보내기
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="사용자, 상품명, 파일명 검색..."
            className="w-full pl-9 pr-9 py-2.5 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2.5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
          />
          <span className="text-muted-foreground text-sm">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2.5 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                  다운로드 일시
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                  사용자
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                  상품
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">
                  파일명
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    로딩 중...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    {search || dateFrom || dateTo
                      ? '검색 결과가 없습니다'
                      : '다운로드 기록이 없습니다'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted">
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(log.downloaded_at)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">
                        {profileMap[log.user_id]?.name || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profileMap[log.user_id]?.email || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {productMap[log.product_id] || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{log.file_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            총 {totalCount}건 중{' '}
            {totalCount === 0
              ? '0'
              : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalCount)}`}
            건
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              {getPageRange().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    p === page
                      ? 'bg-gray-900 text-white'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
