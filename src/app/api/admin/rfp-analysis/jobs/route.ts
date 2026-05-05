import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdminService } from '@/lib/require-admin'
import { getRfpAnalysisUserDeletedAt } from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 50

type EvidenceRecord = {
  value?: unknown
}

type ResultRecord = {
  projectTitle?: EvidenceRecord
  organization?: EvidenceRecord
  period?: EvidenceRecord
  budget?: EvidenceRecord
  evaluationMethod?: EvidenceRecord
  quantitativeScore?: EvidenceRecord
  qualitativeScore?: EvidenceRecord
  priceScore?: EvidenceRecord
  keyRequirements?: unknown
  questions?: unknown
}

type JobRecord = {
  id: string
  user_id: string
  status: string
  progress: number
  step: string | null
  rfp_file_name: string
  task_file_name: string | null
  project_title: string | null
  result_json: unknown
  report_html_path: string | null
  error_message: string | null
  openai_response_id: string | null
  source_page_count: number | null
  created_at: string
  completed_at: string | null
}

type ProfileRecord = {
  id: string
  email: string | null
  name: string | null
  company: string | null
}

function parsePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return max ? Math.min(parsed, max) : parsed
}

function sanitizeSearch(value: string | null) {
  return (value || '')
    .replace(/[%(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function isResultRecord(value: unknown): value is ResultRecord {
  return Boolean(value && typeof value === 'object')
}

function evidenceText(result: unknown, key: keyof ResultRecord) {
  if (!isResultRecord(result)) return null
  const evidence = result[key]
  if (!evidence || typeof evidence !== 'object') return null
  const value = (evidence as EvidenceRecord).value
  return typeof value === 'string' && value.trim() ? value : null
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

function readMetadataName(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return null
  const record = metadata as Record<string, unknown>
  return typeof record.name === 'string' ? record.name : null
}

function buildSummary(result: unknown) {
  return {
    projectTitle: evidenceText(result, 'projectTitle'),
    organization: evidenceText(result, 'organization'),
    period: evidenceText(result, 'period'),
    budget: evidenceText(result, 'budget'),
    evaluationMethod: evidenceText(result, 'evaluationMethod'),
    quantitativeScore: evidenceText(result, 'quantitativeScore'),
    qualitativeScore: evidenceText(result, 'qualitativeScore'),
    priceScore: evidenceText(result, 'priceScore'),
    keyRequirementsCount: isResultRecord(result) ? arrayLength(result.keyRequirements) : 0,
    questionsCount: isResultRecord(result) ? arrayLength(result.questions) : 0,
  }
}

async function getProfileIdsForSearch(
  service: SupabaseClient,
  search: string,
) {
  if (!search) return []
  const { data } = await service
    .from('profiles')
    .select('id')
    .or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    .limit(100)

  return (data || []).map((profile: { id: string }) => profile.id)
}

function buildSearchFilter(search: string, profileIds: string[]) {
  if (!search) return ''
  const parts = [
    `project_title.ilike.%${search}%`,
    `rfp_file_name.ilike.%${search}%`,
    `task_file_name.ilike.%${search}%`,
  ]
  if (profileIds.length > 0) {
    parts.push(`user_id.in.(${profileIds.join(',')})`)
  }
  return parts.join(',')
}

export async function GET(request: Request) {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  const url = new URL(request.url)
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX)
  const status = url.searchParams.get('status') || 'all'
  const search = sanitizeSearch(url.searchParams.get('q'))
  const dateFrom = url.searchParams.get('dateFrom') || ''
  const dateTo = url.searchParams.get('dateTo') || ''
  const profileIds = await getProfileIdsForSearch(admin.service, search)

  const searchFilter = buildSearchFilter(search, profileIds)
  let countQuery = admin.service.from('rfp_analysis_jobs').select('id', { count: 'exact', head: true })
  if (status && status !== 'all') countQuery = countQuery.eq('status', status)
  if (dateFrom) countQuery = countQuery.gte('created_at', dateFrom)
  if (dateTo) countQuery = countQuery.lte('created_at', `${dateTo}T23:59:59`)
  if (searchFilter) countQuery = countQuery.or(searchFilter)

  const { count, error: countError } = await countQuery
  if (countError) {
    return NextResponse.json({ error: 'AI 분석 건수 조회에 실패했습니다' }, { status: 500 })
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  let dataQuery = admin.service
    .from('rfp_analysis_jobs')
    .select('id, user_id, status, progress, step, rfp_file_name, task_file_name, project_title, result_json, report_html_path, error_message, openai_response_id, source_page_count, created_at, completed_at')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (status && status !== 'all') dataQuery = dataQuery.eq('status', status)
  if (dateFrom) dataQuery = dataQuery.gte('created_at', dateFrom)
  if (dateTo) dataQuery = dataQuery.lte('created_at', `${dateTo}T23:59:59`)
  if (searchFilter) dataQuery = dataQuery.or(searchFilter)

  const { data, error } = await dataQuery
  if (error) {
    return NextResponse.json({ error: 'AI 분석 목록 조회에 실패했습니다' }, { status: 500 })
  }

  const jobs = (data || []) as JobRecord[]
  const userIds = Array.from(new Set(jobs.map((job) => job.user_id).filter(Boolean)))
  const jobIds = jobs.map((job) => job.id)

  const [profilesRes, downloadsRes] = await Promise.all([
    userIds.length > 0
      ? admin.service.from('profiles').select('id, email, name, company').in('id', userIds)
      : Promise.resolve({ data: [] as ProfileRecord[], error: null }),
    jobIds.length > 0
      ? admin.service.from('rfp_analysis_report_downloads').select('job_id').in('job_id', jobIds)
      : Promise.resolve({ data: [] as Array<{ job_id: string }>, error: null }),
  ])

  if (profilesRes.error) {
    return NextResponse.json({ error: '회원 정보 조회에 실패했습니다' }, { status: 500 })
  }
  if (downloadsRes.error) {
    return NextResponse.json({ error: '리포트 다운로드 이력 조회에 실패했습니다' }, { status: 500 })
  }

  const profiles = new Map<string, ProfileRecord>()
  for (const profile of (profilesRes.data || []) as ProfileRecord[]) {
    profiles.set(profile.id, profile)
  }

  const missingProfileUserIds = userIds.filter((userId) => !profiles.has(userId))
  if (missingProfileUserIds.length > 0) {
    const authUsers = await Promise.all(
      missingProfileUserIds.map((userId) => admin.service.auth.admin.getUserById(userId)),
    )
    authUsers.forEach((authUser, index) => {
      const userId = missingProfileUserIds[index]
      if (!authUser.data.user) return
      profiles.set(userId, {
        id: userId,
        email: authUser.data.user.email ?? null,
        name: readMetadataName(authUser.data.user.user_metadata),
        company: null,
      })
    })
  }

  const downloadCounts = new Map<string, number>()
  for (const download of (downloadsRes.data || []) as Array<{ job_id: string }>) {
    downloadCounts.set(download.job_id, (downloadCounts.get(download.job_id) || 0) + 1)
  }

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      userId: job.user_id,
      user: profiles.get(job.user_id) || null,
      status: job.status,
      progress: job.progress,
      step: job.step,
      rfpFileName: job.rfp_file_name,
      taskFileName: job.task_file_name,
      projectTitle: job.project_title,
      reportHtmlPath: job.report_html_path,
      errorMessage: job.error_message,
      openaiResponseId: job.openai_response_id,
      sourcePageCount: job.source_page_count,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      downloadCount: downloadCounts.get(job.id) || 0,
      userDeletedAt: getRfpAnalysisUserDeletedAt(job.result_json),
      summary: buildSummary(job.result_json),
    })),
    pagination: {
      page,
      pageSize,
      totalCount: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  })
}
