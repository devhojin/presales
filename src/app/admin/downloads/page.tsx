'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'

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
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('download_logs')
      .select('*')
      .order('downloaded_at', { ascending: false })
    const logList = (data || []) as DownloadLog[]
    setLogs(logList)

    // Fetch profiles
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
    }

    // Fetch product names
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
    }

    setLoading(false)
  }

  const filtered = useMemo(() => {
    let list = logs
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (l) =>
          l.file_name.toLowerCase().includes(q) ||
          (productMap[l.product_id] || '').toLowerCase().includes(q) ||
          (profileMap[l.user_id]?.name || '').toLowerCase().includes(q) ||
          (profileMap[l.user_id]?.email || '').toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      list = list.filter((l) => l.downloaded_at >= dateFrom)
    }
    if (dateTo) {
      const toEnd = dateTo + 'T23:59:59'
      list = list.filter((l) => l.downloaded_at <= toEnd)
    }
    return list
  }, [logs, search, dateFrom, dateTo, productMap, profileMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">다운로드 관리</h1>
          <p className="text-sm text-gray-500">총 {logs.length}건의 다운로드 기록</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="사용자, 상품명, 파일명 검색..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
          />
          <span className="text-gray-400 text-sm">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  다운로드 일시
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  사용자
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  상품
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  파일명
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    로딩 중...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    {search || dateFrom || dateTo
                      ? '검색 결과가 없습니다'
                      : '다운로드 기록이 없습니다'}
                  </td>
                </tr>
              ) : (
                paginated.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(log.downloaded_at)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">
                        {profileMap[log.user_id]?.name || '-'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {profileMap[log.user_id]?.email || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {productMap[log.product_id] || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.file_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            총 {filtered.length}건 중{' '}
            {filtered.length === 0
              ? '0'
              : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)}`}
            건
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {getPageRange().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
