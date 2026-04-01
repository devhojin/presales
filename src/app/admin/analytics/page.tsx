'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

// ── helpers ──────────────────────────────────────────────────────────
function fmt(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface DayStat {
  date: string
  pageViews: number
  visitors: number
  orders: number
  revenue: number
  signups: number
  consulting: number
  reviews: number
}

// ── component ────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [dailyStats, setDailyStats] = useState<DayStat[]>([])
  const [monthlyData, setMonthlyData] = useState<Record<string, Record<number, { pv: number; uv: number }>>>({})
  const [viewMode, setViewMode] = useState<'visitors' | 'pageviews'>('visitors')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const supabase = createClient()
    const today = startOfDay(new Date())
    const sevenAgo = addDays(today, -6)
    const rangeStart = isoDate(sevenAgo)
    const rangeEnd = isoDate(addDays(today, 1))

    // Fetch page_views for the last 7 days
    const { data: pvRows } = await supabase
      .from('page_views')
      .select('created_at, session_id')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // Fetch orders
    const { data: orderRows } = await supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // Fetch profiles (signups)
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // Fetch consulting_requests
    const { data: consultingRows } = await supabase
      .from('consulting_requests')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // Fetch reviews
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // Build daily stats
    const stats: DayStat[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(sevenAgo, i)
      const dateStr = isoDate(d)
      const dayPvs = (pvRows || []).filter(r => r.created_at?.startsWith(dateStr))
      const daySessions = new Set(dayPvs.map(r => r.session_id))
      const dayOrders = (orderRows || []).filter(r => r.created_at?.startsWith(dateStr) && r.status === 'paid')
      const daySignups = (profileRows || []).filter(r => r.created_at?.startsWith(dateStr))
      const dayConsulting = (consultingRows || []).filter(r => r.created_at?.startsWith(dateStr))
      const dayReviews = (reviewRows || []).filter(r => r.created_at?.startsWith(dateStr))

      stats.push({
        date: dateStr,
        pageViews: dayPvs.length,
        visitors: daySessions.size,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
        signups: daySignups.length,
        consulting: dayConsulting.length,
        reviews: dayReviews.length,
      })
    }
    setDailyStats(stats)

    // Fetch ALL page_views for monthly/yearly
    const { data: allPv } = await supabase
      .from('page_views')
      .select('created_at, session_id')
      .order('created_at', { ascending: true })

    const monthly: Record<string, Record<number, { pv: number; uv: number }>> = {}
    for (const row of allPv || []) {
      const d = new Date(row.created_at)
      const y = String(d.getFullYear())
      const m = d.getMonth() + 1
      if (!monthly[y]) monthly[y] = {}
      if (!monthly[y][m]) monthly[y][m] = { pv: 0, uv: 0 }
      monthly[y][m].pv += 1
    }
    // Count unique sessions per month
    const sessionsByMonth: Record<string, Record<number, Set<string>>> = {}
    for (const row of allPv || []) {
      const d = new Date(row.created_at)
      const y = String(d.getFullYear())
      const m = d.getMonth() + 1
      if (!sessionsByMonth[y]) sessionsByMonth[y] = {}
      if (!sessionsByMonth[y][m]) sessionsByMonth[y][m] = new Set()
      sessionsByMonth[y][m].add(row.session_id)
    }
    for (const y of Object.keys(sessionsByMonth)) {
      for (const m of Object.keys(sessionsByMonth[y])) {
        if (!monthly[y]) monthly[y] = {}
        if (!monthly[y][+m]) monthly[y][+m] = { pv: 0, uv: 0 }
        monthly[y][+m].uv = sessionsByMonth[y][+m].size
      }
    }
    setMonthlyData(monthly)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        데이터를 불러오는 중...
      </div>
    )
  }

  const maxPv = Math.max(...dailyStats.map(s => s.pageViews), 1)
  const maxUv = Math.max(...dailyStats.map(s => s.visitors), 1)
  const chartMax = Math.max(maxPv, maxUv, 1)

  // Chart dimensions
  const W = 700
  const H = 200
  const PAD = 40
  const plotW = W - PAD * 2
  const plotH = H - 40

  function toX(i: number) {
    return PAD + (i / 6) * plotW
  }
  function toY(v: number) {
    return H - 20 - (v / chartMax) * plotH
  }

  const pvPoints = dailyStats.map((s, i) => `${toX(i)},${toY(s.pageViews)}`).join(' ')
  const uvPoints = dailyStats.map((s, i) => `${toX(i)},${toY(s.visitors)}`).join(' ')
  const areaPoints = `${toX(0)},${H - 20} ${pvPoints} ${toX(6)},${H - 20}`

  // Monthly/Yearly table
  const years = Object.keys(monthlyData).sort()
  if (years.length === 0) {
    const curYear = String(new Date().getFullYear())
    if (!years.includes(curYear)) years.push(curYear)
  }

  // Weekly calendar (last 4 weeks)
  const todayDate = startOfDay(new Date())
  // Find last Sunday
  const todayDow = todayDate.getDay()
  const lastSunday = addDays(todayDate, -todayDow)
  const weeks: { start: Date; days: (DayStat | null)[] }[] = []
  for (let w = 3; w >= 0; w--) {
    const weekStart = addDays(lastSunday, -w * 7)
    const days: (DayStat | null)[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)
      const ds = isoDate(date)
      const match = dailyStats.find(s => s.date === ds)
      days.push(match || null)
    }
    weeks.push({ start: weekStart, days })
  }

  // Daily average per month
  function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">통계 분석</h1>

      {/* ── 방문자 차트 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">방문자 추이 (최근 7일)</h2>
        <div className="flex items-center gap-6 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(147,197,253,0.5)' }} />
            페이지뷰
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600" />
            방문자
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" style={{ height: 220 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(r => {
            const y = H - 20 - r * plotH
            return (
              <g key={r}>
                <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x={PAD - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                  {Math.round(chartMax * r)}
                </text>
              </g>
            )
          })}
          {/* Area fill for page views */}
          <polygon points={areaPoints} fill="rgba(147,197,253,0.3)" />
          {/* PV line */}
          <polyline points={pvPoints} fill="none" stroke="rgba(147,197,253,0.8)" strokeWidth="2" />
          {/* UV line */}
          <polyline points={uvPoints} fill="none" stroke="#2563eb" strokeWidth="2.5" />
          {/* Dots + labels */}
          {dailyStats.map((s, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(s.pageViews)} r="3" fill="rgba(147,197,253,0.8)" />
              <circle cx={toX(i)} cy={toY(s.visitors)} r="3.5" fill="#2563eb" />
              <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#6b7280">
                {fmt(new Date(s.date))}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* ── 기간별 분석 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">기간별 분석 (최근 7일)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs">
                <th className="text-left py-2 pr-4 font-medium">일자</th>
                <th className="text-right py-2 px-3 font-medium">주문수</th>
                <th className="text-right py-2 px-3 font-medium">매출액</th>
                <th className="text-right py-2 px-3 font-medium">방문자</th>
                <th className="text-right py-2 px-3 font-medium">가입</th>
                <th className="text-right py-2 px-3 font-medium">문의</th>
                <th className="text-right py-2 px-3 font-medium">후기</th>
              </tr>
            </thead>
            <tbody>
              {[...dailyStats].reverse().map((s, i) => (
                <tr key={s.date} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="py-2 pr-4 text-gray-700">{s.date}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{s.orders}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{s.revenue.toLocaleString()}원</td>
                  <td className="py-2 px-3 text-right text-blue-600 font-medium">{s.visitors}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{s.signups}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{s.consulting}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{s.reviews}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-medium text-gray-800 bg-gray-50">
                <td className="py-2 pr-4">합계</td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.orders, 0)}</td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.revenue, 0).toLocaleString()}원</td>
                <td className="py-2 px-3 text-right text-blue-600">{dailyStats.reduce((a, s) => a + s.visitors, 0)}</td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.signups, 0)}</td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.consulting, 0)}</td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.reviews, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── 월간 및 연간 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">월간 및 연간</h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button
              onClick={() => setViewMode('visitors')}
              className={`px-3 py-1.5 ${viewMode === 'visitors' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              방문자
            </button>
            <button
              onClick={() => setViewMode('pageviews')}
              className={`px-3 py-1.5 ${viewMode === 'pageviews' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              페이지뷰
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs">
                <th className="text-left py-2 pr-4 font-medium">연도</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="text-right py-2 px-2 font-medium">{i + 1}월</th>
                ))}
                <th className="text-right py-2 pl-3 font-medium">합계</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y, yi) => {
                let total = 0
                return (
                  <tr key={y} className={yi % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="py-2 pr-4 font-medium text-gray-700">{y}</td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1
                      const val = monthlyData[y]?.[m]
                        ? viewMode === 'visitors' ? monthlyData[y][m].uv : monthlyData[y][m].pv
                        : 0
                      total += val
                      return (
                        <td key={m} className="py-2 px-2 text-right text-gray-600">
                          {val > 0 ? val.toLocaleString() : '-'}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-3 text-right font-medium text-blue-600">{total > 0 ? total.toLocaleString() : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 일간 평균 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">일간 평균 (방문자)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs">
                <th className="text-left py-2 pr-4 font-medium">연도</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="text-right py-2 px-2 font-medium">{i + 1}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((y, yi) => (
                <tr key={y} className={yi % 2 === 1 ? 'bg-gray-50' : ''}>
                  <td className="py-2 pr-4 font-medium text-gray-700">{y}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1
                    const uv = monthlyData[y]?.[m]?.uv || 0
                    const days = daysInMonth(+y, m)
                    const avg = uv > 0 ? (uv / days).toFixed(1) : '-'
                    return (
                      <td key={m} className="py-2 px-2 text-right text-gray-600">{avg}</td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 최근 주별 현황 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">최근 주별 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs">
                <th className="text-left py-2 pr-4 font-medium">주</th>
                {DAY_LABELS.map(d => (
                  <th key={d} className="text-center py-2 px-3 font-medium">{d}</th>
                ))}
                <th className="text-right py-2 pl-3 font-medium">합계</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => {
                const weekTotal = week.days.reduce((a, d) => a + (d?.visitors || 0), 0)
                return (
                  <tr key={wi} className={wi % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                      {fmt(week.start)}~{fmt(addDays(week.start, 6))}
                    </td>
                    {week.days.map((d, di) => {
                      const dateObj = addDays(week.start, di)
                      const isFuture = dateObj > todayDate
                      return (
                        <td key={di} className={`py-2 px-3 text-center ${isFuture ? 'text-gray-300' : d ? 'text-gray-700' : 'text-gray-400'}`}>
                          {isFuture ? '' : d ? d.visitors : 0}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-3 text-right font-medium text-blue-600">{weekTotal}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
