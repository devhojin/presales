import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Building2, Calendar, ExternalLink, FileText, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  calcDDay,
  formatPeriod,
  getStatusBadgeClass,
  getStatusLabel,
} from '@/lib/announcements'

type AnnouncementDetail = {
  id: string
  title: string
  organization: string | null
  type: string | null
  budget: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  source: string | null
  is_published: boolean | null
  application_method: string | null
  target: string | null
  description: string | null
  eligibility: string | null
  department: string | null
  contact: string | null
  source_url: string | null
  field: string | null
  governing_body: string | null
  support_areas: string[] | null
  regions: string[] | null
  target_types: string[] | null
  business_years: string[] | null
  updated_at: string | null
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getAnnouncement(id: string): Promise<AnnouncementDetail | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) return null
  return data as AnnouncementDetail
}

function DayBadge({ dday }: { dday: number | null }) {
  if (dday === null) return null
  const isUrgent = dday <= 3 && dday >= 0
  return (
    <span className={`text-sm font-mono font-bold ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
      {dday < 0 ? '마감' : `D-${dday}`}
    </span>
  )
}

function InfoItem({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 text-sm text-foreground">
        {icon}
        <span>{children}</span>
      </div>
    </div>
  )
}

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ann = await getAnnouncement(id)
  if (!ann) notFound()

  const status = ann.status || 'active'
  const dday = calcDDay(ann.end_date)
  const statusLabel = getStatusLabel(status, ann.end_date)
  const statusBadgeClass = getStatusBadgeClass(status, ann.end_date)
  const supportAreas = ann.support_areas ?? []
  const regions = ann.regions ?? []
  const targetTypes = ann.target_types ?? []
  const businessYears = ann.business_years ?? []

  return (
    <main className="max-w-[1040px] mx-auto px-4 md:px-8 pb-16">
      <Link
        href="/announcements"
        className="inline-flex items-center gap-2 py-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        공고 목록으로 돌아가기
      </Link>

      <article className="py-8">
        <div className="mb-6 flex items-center gap-3">
          <Badge className={`text-xs font-semibold border ${statusBadgeClass}`}>
            {statusLabel}
          </Badge>
          <DayBadge dday={dday} />
        </div>

        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground leading-tight md:text-5xl">
          {ann.title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border/50 pb-6">
          {ann.organization && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{ann.organization}</span>
            </div>
          )}
          {ann.source && <Badge variant="outline" className="text-xs">{ann.source}</Badge>}
          {ann.governing_body && <Badge variant="outline" className="text-xs">{ann.governing_body}</Badge>}
        </div>

        <section className="mb-10 grid grid-cols-1 gap-6 border-y border-border/50 py-8 md:grid-cols-2">
          <InfoItem label="접수기간" icon={<Calendar className="w-4 h-4 text-primary" />}>
            {formatPeriod(ann.start_date, ann.end_date)}
          </InfoItem>
          {ann.application_method && <InfoItem label="접수방법">{ann.application_method}</InfoItem>}
          {ann.target && <InfoItem label="지원대상">{ann.target}</InfoItem>}
          {ann.budget && <InfoItem label="사업규모">{ann.budget}</InfoItem>}
          {ann.field && <InfoItem label="분야">{ann.field}</InfoItem>}
          {regions.length > 0 && <InfoItem label="지역">{regions.join(', ')}</InfoItem>}
        </section>

        <section className="mb-10 rounded-xl border border-border/50 bg-muted/30 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            프리세일즈 활용 메모
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            이 공고는 제안서 준비, 지원 자격 확인, 마감 일정 관리에 바로 활용할 수 있도록 수집한 공공조달·지원사업 정보입니다.
          </p>
        </section>

        {supportAreas.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">지원 분야</h2>
            <div className="flex flex-wrap gap-2">
              {supportAreas.map((area) => (
                <span key={area} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {area}
                </span>
              ))}
            </div>
          </section>
        )}

        {(targetTypes.length > 0 || businessYears.length > 0) && (
          <section className="mb-10 grid gap-6 md:grid-cols-2">
            {targetTypes.length > 0 && (
              <InfoItem label="대상 유형">{targetTypes.join(', ')}</InfoItem>
            )}
            {businessYears.length > 0 && (
              <InfoItem label="업력 조건">{businessYears.join(', ')}</InfoItem>
            )}
          </section>
        )}

        {ann.description && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">사업 설명</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{ann.description}</p>
          </section>
        )}

        {ann.eligibility && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">지원 자격</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{ann.eligibility}</p>
          </section>
        )}

        {(ann.department || ann.contact) && (
          <section className="mb-10 rounded-xl border border-border/50 bg-muted/30 p-5">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">문의</h2>
            <div className="space-y-2">
              {ann.department && <p className="text-sm text-foreground">담당: {ann.department}</p>}
              {ann.contact && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{ann.contact}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {ann.source_url && (
          <div className="border-t border-border/50 pt-6">
            <a
              href={ann.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              원문 보기
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </article>
    </main>
  )
}
