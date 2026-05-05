import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/client-ip'
import { checkGlobalFreeGuestLimit, checkGlobalFreeUserLimit } from '@/lib/free-user-limit'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { requireActiveUser } from '@/lib/require-active-user'
import { getRfpAnalysisActor } from '@/lib/rfp-analysis-access'
import {
  buildStoragePath,
  getRfpAnalysisServiceClient,
  getRfpAnalysisUserDeletedAt,
  RFP_ANALYSIS_MAX_TOTAL_SIZE,
  RFP_ANALYSIS_MAX_TOTAL_SIZE_LABEL,
  validatePdfMeta,
  withRfpAnalysisGuestId,
  type FileMetaInput,
} from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

interface CreateJobBody {
  rfpFile?: FileMetaInput
  taskFile?: FileMetaInput | null
  guestId?: string | null
}

function readFileMeta(value: unknown): FileMetaInput | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<FileMetaInput>
  if (typeof item.name !== 'string' || typeof item.size !== 'number') return null
  return { name: item.name, size: item.size, type: typeof item.type === 'string' ? item.type : null }
}

async function createGuestOwnerUserId(
  supabase: ReturnType<typeof getRfpAnalysisServiceClient>,
  guestId: string,
  jobId: string,
) {
  const email = `rfp-analysis-${jobId}@guest.presales.local`
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
    email_confirm: true,
    user_metadata: {
      name: '비회원',
      rfp_analysis_guest: true,
      guest_id: guestId,
    },
  })

  if (!error && data.user?.id) return data.user.id
  throw error || new Error('비회원 분석 사용자 생성에 실패했습니다')
}

export async function GET() {
  const auth = await requireActiveUser()
  if (!auth.ok) return auth.response

  const supabase = getRfpAnalysisServiceClient()
  const { data, error } = await supabase
    .from('rfp_analysis_jobs')
    .select('id, status, progress, step, rfp_file_name, task_file_name, project_title, report_html_path, error_message, result_json, created_at, completed_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'AI 분석 이력 조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({
    jobs: (data ?? [])
      .filter((job) => !getRfpAnalysisUserDeletedAt(job.result_json))
      .map(({ result_json: _resultJson, ...job }) => job),
  })
}

export async function POST(request: NextRequest) {
  let body: CreateJobBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const actorResult = await getRfpAnalysisActor(request, body.guestId)
  if (!actorResult.ok) return actorResult.response
  const { actor } = actorResult

  const headersList = await headers()
  const ip = getClientIp(headersList)
  const [actorLimit, ipLimit] = await Promise.all([
    checkRateLimitAsync(`rfp-analysis:${actor.rateLimitKey}`, 3, 24 * 60 * 60 * 1000),
    checkRateLimitAsync(`rfp-analysis:ip:${ip}`, 10, 60 * 60 * 1000),
  ])

  if (!actorLimit.allowed) {
    return NextResponse.json(
      { error: '무료 AI 분석은 하루 3회까지 이용할 수 있습니다.' },
      { status: 429 },
    )
  }
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: '요청이 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 })
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
  const freeLimit = actor.kind === 'user'
    ? await checkGlobalFreeUserLimit(supabase, actor.user.id)
    : await checkGlobalFreeGuestLimit(supabase, actor.guestId)
  if (!freeLimit.allowed) {
    return NextResponse.json(
      { error: freeLimit.error, limit: freeLimit.limit, used: freeLimit.used },
      { status: 403 },
    )
  }

  const jobId = crypto.randomUUID()
  const rfpPath = buildStoragePath(actor.storageOwnerId, jobId, 'rfp', rfpFile.name)
  const taskPath = taskFile ? buildStoragePath(actor.storageOwnerId, jobId, 'task', taskFile.name) : null
  let ownerUserId = actor.kind === 'user' ? actor.user.id : null
  if (actor.kind === 'guest') {
    try {
      ownerUserId = await createGuestOwnerUserId(supabase, actor.guestId, jobId)
    } catch {
      return NextResponse.json({ error: '비회원 분석 작업 준비에 실패했습니다' }, { status: 500 })
    }
  }

  const [rfpSigned, taskSigned] = await Promise.all([
    supabase.storage.from('rfp-analysis').createSignedUploadUrl(rfpPath, { upsert: true }),
    taskPath ? supabase.storage.from('rfp-analysis').createSignedUploadUrl(taskPath, { upsert: true }) : Promise.resolve(null),
  ])

  if (rfpSigned.error || !rfpSigned.data?.token || (taskSigned && (taskSigned.error || !taskSigned.data?.token))) {
    return NextResponse.json({ error: 'PDF 업로드 URL 생성에 실패했습니다' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('rfp_analysis_jobs')
    .insert({
      id: jobId,
      user_id: ownerUserId,
      status: 'created',
      progress: 5,
      step: '업로드 대기',
      rfp_file_name: rfpFile.name,
      rfp_file_path: rfpPath,
      rfp_file_size: rfpFile.size,
      task_file_name: taskFile?.name ?? null,
      task_file_path: taskPath,
      task_file_size: taskFile?.size ?? null,
      result_json: actor.kind === 'guest' ? withRfpAnalysisGuestId(null, actor.guestId) : null,
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
      rfpToken: rfpSigned.data.token,
      taskToken: taskSigned?.data?.token ?? null,
    },
  })
}
