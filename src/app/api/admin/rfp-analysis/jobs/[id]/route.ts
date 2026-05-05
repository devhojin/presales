import { NextResponse } from 'next/server'
import { requireAdminService } from '@/lib/require-admin'
import {
  getRfpAnalysisGuestId,
  getRfpAnalysisUserDeletedAt,
  RFP_ANALYSIS_BUCKET,
  withRfpAnalysisUserDeletedAt,
} from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

function compactStoragePaths(paths: Array<string | null | undefined>) {
  return Array.from(new Set(paths.filter((path): path is string => Boolean(path))))
}

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
  const { data: job, error } = await admin.service
    .from('rfp_analysis_jobs')
    .select('id, user_id, rfp_file_path, task_file_path, report_html_path, result_json')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 분석 작업 조회에 실패했습니다' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  const storagePaths = compactStoragePaths([
    job.rfp_file_path,
    job.task_file_path,
    job.report_html_path,
  ])

  if (storagePaths.length > 0) {
    const { error: storageError } = await admin.service.storage
      .from(RFP_ANALYSIS_BUCKET)
      .remove(storagePaths)

    if (storageError) {
      return NextResponse.json({ error: '업로드/리포트 파일 삭제에 실패했습니다' }, { status: 500 })
    }
  }

  const { error: downloadsError } = await admin.service
    .from('rfp_analysis_report_downloads')
    .delete()
    .eq('job_id', id)

  if (downloadsError) {
    return NextResponse.json({ error: '리포트 다운로드 이력 삭제에 실패했습니다' }, { status: 500 })
  }

  const { error: deleteError } = await admin.service
    .from('rfp_analysis_jobs')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'AI 분석 작업 완전삭제에 실패했습니다' }, { status: 500 })
  }

  if (getRfpAnalysisGuestId(job.result_json) && job.user_id) {
    await admin.service.auth.admin.deleteUser(job.user_id)
  }

  return NextResponse.json({ ok: true, removedFiles: storagePaths.length })
}
