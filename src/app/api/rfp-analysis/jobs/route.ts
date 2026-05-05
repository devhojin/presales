import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/client-ip'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { requireActiveUser } from '@/lib/require-active-user'
import {
  buildStoragePath,
  getRfpAnalysisServiceClient,
  RFP_ANALYSIS_MAX_TOTAL_SIZE,
  RFP_ANALYSIS_MAX_TOTAL_SIZE_LABEL,
  validatePdfMeta,
  type FileMetaInput,
} from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

interface CreateJobBody {
  rfpFile?: FileMetaInput
  taskFile?: FileMetaInput | null
}

function readFileMeta(value: unknown): FileMetaInput | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<FileMetaInput>
  if (typeof item.name !== 'string' || typeof item.size !== 'number') return null
  return { name: item.name, size: item.size, type: typeof item.type === 'string' ? item.type : null }
}

export async function GET() {
  const auth = await requireActiveUser()
  if (!auth.ok) return auth.response

  const supabase = getRfpAnalysisServiceClient()
  const { data, error } = await supabase
    .from('rfp_analysis_jobs')
    .select('id, status, progress, step, rfp_file_name, task_file_name, project_title, report_html_path, error_message, created_at, completed_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'AI 분석 이력 조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ jobs: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireActiveUser()
  if (!auth.ok) return auth.response

  const headersList = await headers()
  const ip = getClientIp(headersList)
  const [userLimit, ipLimit] = await Promise.all([
    checkRateLimitAsync(`rfp-analysis:user:${auth.user.id}`, 3, 24 * 60 * 60 * 1000),
    checkRateLimitAsync(`rfp-analysis:ip:${ip}`, 10, 60 * 60 * 1000),
  ])

  if (!userLimit.allowed) {
    return NextResponse.json(
      { error: '무료 AI 분석은 회원당 하루 3회까지 이용할 수 있습니다.' },
      { status: 429 },
    )
  }
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: '요청이 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
  }

  let body: CreateJobBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const rfpFile = readFileMeta(body.rfpFile)
  const taskFile = readFileMeta(body.taskFile)
  if (!rfpFile) {
    return NextResponse.json({ error: 'RFP 제안요청서 PDF가 필요합니다.' }, { status: 400 })
  }

  const rfpError = validatePdfMeta(rfpFile, 'RFP 제안요청서')
  if (rfpError) return NextResponse.json({ error: rfpError }, { status: 400 })
  const taskError = taskFile ? validatePdfMeta(taskFile, '과업지시서') : null
  if (taskError) return NextResponse.json({ error: taskError }, { status: 400 })

  const totalSize = rfpFile.size + (taskFile?.size ?? 0)
  if (totalSize > RFP_ANALYSIS_MAX_TOTAL_SIZE) {
    return NextResponse.json(
      { error: `업로드 파일 합계는 ${RFP_ANALYSIS_MAX_TOTAL_SIZE_LABEL} 이하여야 합니다.` },
      { status: 400 },
    )
  }

  const supabase = getRfpAnalysisServiceClient()
  const jobId = crypto.randomUUID()
  const rfpPath = buildStoragePath(auth.user.id, jobId, 'rfp', rfpFile.name)
  const taskPath = taskFile ? buildStoragePath(auth.user.id, jobId, 'task', taskFile.name) : null

  const { data, error } = await supabase
    .from('rfp_analysis_jobs')
    .insert({
      id: jobId,
      user_id: auth.user.id,
      status: 'created',
      progress: 5,
      step: '업로드 대기',
      rfp_file_name: rfpFile.name,
      rfp_file_path: rfpPath,
      rfp_file_size: rfpFile.size,
      task_file_name: taskFile?.name ?? null,
      task_file_path: taskPath,
      task_file_size: taskFile?.size ?? null,
    })
    .select('id, status, progress, step, rfp_file_path, task_file_path')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'AI 분석 작업 생성에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({
    job: data,
    upload: {
      bucket: 'rfp-analysis',
      rfpPath,
      taskPath,
    },
  })
}
