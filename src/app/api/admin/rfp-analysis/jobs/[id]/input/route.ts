import { NextRequest, NextResponse } from 'next/server'
import { requireAdminService } from '@/lib/require-admin'
import { RFP_ANALYSIS_BUCKET } from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

type InputKind = 'rfp' | 'task'

function readKind(request: NextRequest): InputKind {
  return request.nextUrl.searchParams.get('kind') === 'task' ? 'task' : 'rfp'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  const { id } = await params
  const kind = readKind(request)
  const { data: job, error } = await admin.service
    .from('rfp_analysis_jobs')
    .select('id, rfp_file_name, rfp_file_path, task_file_name, task_file_path')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: '업로드 파일 조회에 실패했습니다' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  const fileName = kind === 'task' ? job.task_file_name : job.rfp_file_name
  const filePath = kind === 'task' ? job.task_file_path : job.rfp_file_path
  if (!fileName || !filePath) {
    return NextResponse.json({ error: '다운로드할 PDF를 찾을 수 없습니다' }, { status: 404 })
  }

  const { data: signed, error: signError } = await admin.service.storage
    .from(RFP_ANALYSIS_BUCKET)
    .createSignedUrl(filePath, 60, { download: fileName })

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'PDF 다운로드 URL 생성에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, fileName, kind })
}
