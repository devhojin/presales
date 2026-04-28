'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ExternalLink,
  Calendar,
  Building2,
  FileText,
  Phone,
  Loader2,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import {
  type Announcement,
  calcDDay,
  isExpired,
  formatAnnouncementDate,
  formatPeriod,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/lib/announcements'

function DayBadge({ dday }: { dday: number | null }) {
  if (dday === null) return null
  const isUrgent = dday <= 3 && dday >= 0
  return (
    <span className={`text-sm font-mono font-bold ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
      {dday < 0 ? '마감' : `D-${dday}`}
    </span>
  )
}

export default function AnnouncementDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setAnnouncement(data)
      }

      setLoading(false)
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !announcement) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-24">
        <Link
          href="/announcements"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          공고 목록으로 돌아가기
        </Link>

        <div className="text-center py-24">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">공고를 찾을 수 없습니다</p>
          <p className="text-sm text-muted-foreground mb-8">
            요청하신 공고가 삭제되었거나 공개되지 않았습니다.
          </p>
          <Link
            href="/announcements"
            className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-all duration-300 active:scale-[0.98]"
          >
            공고 목록 보기
          </Link>
        </div>
      </div>
    )
  }

  const dday = calcDDay(announcement.end_date)
  const expired = isExpired(announcement)
  const statusLabel = getStatusLabel(announcement.status, announcement.end_date)
  const statusBadgeClass = getStatusBadgeClass(announcement.status, announcement.end_date)

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Back Link */}
      <Link
        href="/announcements"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 py-6"
      >
        <ChevronLeft className="w-4 h-4" />
        공고 목록으로 돌아가기
      </Link>

      {/* Main Content */}
      <div className="py-12">
        {/* Status & D-Day */}
        <div className="flex items-center gap-3 mb-6">
          <Badge className={`text-xs font-semibold uppercase tracking-widest border ${statusBadgeClass}`}>
            {statusLabel}
          </Badge>
          <DayBadge dday={dday} />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          {announcement.title}
        </h1>

        {/* Organization & Source */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-border/50">
          {announcement.organization && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground font-medium">{announcement.organization}</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            {announcement.source}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 py-8 border-y border-border/50">
          {/* 접수기간 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              접수기간
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-sm text-foreground">
                {formatPeriod(announcement.start_date, announcement.end_date)}
              </p>
            </div>
          </div>

          {/* 접수방법 */}
          {announcement.application_method && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                접수방법
              </p>
              <p className="text-sm text-foreground">{announcement.application_method}</p>
            </div>
          )}

          {/* 지원대상 */}
          {announcement.target && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                지원대상
              </p>
              <p className="text-sm text-foreground">{announcement.target}</p>
            </div>
          )}

          {/* 사업규모 */}
          {announcement.budget && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                사업규모
              </p>
              <p className="text-sm text-foreground">{announcement.budget}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {announcement.description && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">사업 설명</h2>
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
              <p className="whitespace-pre-wrap">{announcement.description}</p>
            </div>
          </div>
        )}

        {/* Eligibility */}
        {announcement.eligibility && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-6">지원 자격</h2>
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
              <p className="whitespace-pre-wrap">{announcement.eligibility}</p>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {(announcement.department || announcement.contact) && (
          <div className="bg-muted/30 rounded-2xl p-6 md:p-8 mb-12 border border-border/50">
            <h2 className="text-lg font-semibold tracking-tight text-foreground mb-4">문의</h2>
            <div className="space-y-3">
              {announcement.department && (
                <p className="text-sm text-foreground">
                  <span className="font-medium">담당 부서:</span> {announcement.department}
                </p>
              )}
              {announcement.contact && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{announcement.contact}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Source URL Button */}
        {announcement.source_url && (
          <div className="mb-12">
            <a
              href={announcement.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-all duration-300 active:scale-[0.98]"
            >
              원문 보기
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
