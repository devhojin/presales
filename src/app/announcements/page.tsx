'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Search, Megaphone, Calendar, MapPin, ArrowRight, Clock, Loader2 } from 'lucide-react'
import {
  type Announcement,
  calcDDay,
  isExpired,
  formatAnnouncementDate,
  formatPeriod,
  getTypeLabel,
  getTypeBadgeClass,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/lib/announcements'

type FilterStatus = 'all' | 'active' | 'closed'

function DayBadge({ dday }: { dday: number | null }) {
  if (dday === null) return null
  const isUrgent = dday <= 3 && dday >= 0
  return (
    <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
      {dday < 0 ? '마감' : `D-${dday}`}
    </span>
  )
}

function AnnouncementCard({ announcement, searchQuery }: { announcement: Announcement; searchQuery?: string }) {
  const dday = calcDDay(announcement.end_date)
  const expired = isExpired(announcement)
  const statusLabel = getStatusLabel(announcement.status, announcement.end_date)
  const statusBadgeClass = getStatusBadgeClass(announcement.status, announcement.end_date)

  return (
    <Link href={`/announcements/${announcement.id}`}>
      <div className="group border border-border/50 rounded-2xl bg-card p-6 hover:border-border hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 h-full flex flex-col">
        {/* Header: Status + D-Day */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <Badge className={`text-xs font-semibold uppercase tracking-widest border ${statusBadgeClass}`}>
            {statusLabel}
          </Badge>
          <DayBadge dday={dday} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {announcement.title}
        </h3>

        {/* Organization */}
        {announcement.organization && (
          <p className="text-sm text-muted-foreground mb-4">{announcement.organization}</p>
        )}

        {/* Period */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatPeriod(announcement.start_date, announcement.end_date)}</span>
        </div>

        {/* Support Areas */}
        {announcement.support_areas && announcement.support_areas.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {announcement.support_areas.slice(0, 3).map((area, idx) => (
              <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {area}
              </span>
            ))}
            {announcement.support_areas.length > 3 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                +{announcement.support_areas.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Source Badge */}
        <div className="flex items-center gap-2 pt-4 border-t border-border/50 mt-auto">
          <Badge variant="outline" className="text-xs">
            {announcement.source}
          </Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300 ml-auto" />
        </div>
      </div>
    </Link>
  )
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('status', { ascending: true }) // 'active' comes before 'closed'
        .order('end_date', { ascending: true }) // soonest deadline first

      if (error) {
        console.error('[Announcements] load error:', error.message)
      }

      setAnnouncements(data || [])
      setLoading(false)
    }

    load()
  }, [])

  // Sort: active first, then by end_date ASC
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      // Active first
      const aExpired = isExpired(a)
      const bExpired = isExpired(b)
      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1
      }
      // Then by end_date
      const aDate = a.end_date ? new Date(a.end_date).getTime() : Number.MAX_VALUE
      const bDate = b.end_date ? new Date(b.end_date).getTime() : Number.MAX_VALUE
      return aDate - bDate
    })
  }, [announcements])

  // Filter by search & status
  const filteredAnnouncements = useMemo(() => {
    return sortedAnnouncements.filter((ann) => {
      // Status filter
      if (filterStatus === 'active' && isExpired(ann)) return false
      if (filterStatus === 'closed' && !isExpired(ann)) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          ann.title.toLowerCase().includes(q) ||
          (ann.organization || '').toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [sortedAnnouncements, searchQuery, filterStatus])

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Hero Section */}
      <div className="py-24 md:py-32">
        <div className="flex items-center gap-3 mb-6">
          <Megaphone className="w-8 h-8 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">공고 사업</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          정부 지원사업 공고 정보를 확인하세요. 나라장터·K-Startup 공고를 매일 업데이트합니다.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="공고명, 담당 기관으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-6 py-3 border border-border/50 rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-3 mb-12">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
            filterStatus === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border/50 hover:border-border hover:bg-muted'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
            filterStatus === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'border-border/50 hover:border-border hover:bg-muted'
          }`}
        >
          모집중
        </button>
        <button
          onClick={() => setFilterStatus('closed')}
          className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
            filterStatus === 'closed'
              ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
              : 'border-border/50 hover:border-border hover:bg-muted'
          }`}
        >
          마감
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-24">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">공고가 없습니다</p>
          <p className="text-sm text-muted-foreground mb-8">
            {searchQuery
              ? '다른 키워드로 검색해보세요'
              : '등록된 공고가 아직 없습니다. 곧 업데이트될 예정입니다.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-all duration-300 active:scale-[0.98]"
            >
              검색 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="py-12">
          <p className="text-sm text-muted-foreground mb-6">{filteredAnnouncements.length}개 공고</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
