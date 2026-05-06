import { NextResponse } from 'next/server'
import { requireAdminService } from '@/lib/require-admin'
import {
  getRfpAnalysisUserDeletedAt,
  deleteRfpAnalysisJobPermanently,
  withRfpAnalysisUserDeletedAt,
} from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  const { id } = await params
  const { data: job, error } = await admin.service
    .from('rfp_analysis_jobs')
    .select('id, result_json')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 분석 작업 조회에 실패했습니다' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  const existingDeletedAt = getRfpAnalysisUserDeletedAt(job.result_json)
  if (existingDeletedAt) {
    return NextResponse.json({ ok: true, userDeletedAt: existingDeletedAt })
  }

  const userDeletedAt = new Date().toISOString()
  const { error: updateError } = await admin.service
    .from('rfp_analysis_jobs')
    .update({
      result_json: withRfpAnalysisUserDeletedAt(job.result_json, userDeletedAt),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: '사용자 삭제 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userDeletedAt })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  const { id } = await params
  const result = await deleteRfpAnalysisJobPermanently(admin.service, id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, removedFiles: result.removedFiles })
}
