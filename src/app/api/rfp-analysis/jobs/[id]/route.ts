import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/require-active-user'
import { getRfpAnalysisActor, isRfpAnalysisJobOwnedByActor } from '@/lib/rfp-analysis-access'
import {
  getRfpAnalysisServiceClient,
  getRfpAnalysisUserDeletedAt,
  withRfpAnalysisUserDeletedAt,
} from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actorResult = await getRfpAnalysisActor(request)
  if (!actorResult.ok) return actorResult.response
  const { actor } = actorResult

  const { id } = await params
  const supabase = getRfpAnalysisServiceClient()
  const { data, error } = await supabase
    .from('rfp_analysis_jobs')
    .select('id, user_id, status, progress, step, rfp_file_name, task_file_name, project_title, report_html_path, error_message, openai_response_id, created_at, completed_at, result_json')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 분석 상태 조회에 실패했습니다' }, { status: 500 })
  }
  if (!data || !isRfpAnalysisJobOwnedByActor(actor, data)) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({
    job: {
      id: data.id,
      status: data.status,
      progress: data.progress,
      step: data.step,
      rfp_file_name: data.rfp_file_name,
      task_file_name: data.task_file_name,
      project_title: data.project_title,
      report_html_path: data.report_html_path,
      error_message: data.error_message,
      openai_response_id: data.openai_response_id,
      created_at: data.created_at,
      completed_at: data.completed_at,
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireActiveUser()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = getRfpAnalysisServiceClient()
  const { data: job, error } = await supabase
    .from('rfp_analysis_jobs')
    .select('id, user_id, result_json')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 분석 리포트 삭제 처리에 실패했습니다' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  const existingDeletedAt = getRfpAnalysisUserDeletedAt(job.result_json)
  if (existingDeletedAt) {
    return NextResponse.json({ ok: true, userDeletedAt: existingDeletedAt })
  }

  const userDeletedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('rfp_analysis_jobs')
    .update({
      result_json: withRfpAnalysisUserDeletedAt(job.result_json, userDeletedAt),
    })
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (updateError) {
    return NextResponse.json({ error: 'AI 분석 리포트 삭제 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userDeletedAt })
}
