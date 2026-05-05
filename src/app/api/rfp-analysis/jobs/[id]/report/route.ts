import { NextResponse } from 'next/server'
import { getRfpAnalysisActor, isRfpAnalysisJobOwnedByActor } from '@/lib/rfp-analysis-access'
import {
  getRfpAnalysisReportFileName,
  getRfpAnalysisServiceClient,
  RFP_ANALYSIS_BUCKET,
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
  const { data: job, error } = await supabase
    .from('rfp_analysis_jobs')
    .select('id, user_id, status, rfp_file_name, project_title, report_html_path, result_json')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 리포트 조회에 실패했습니다' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ error: 'AI 분석 리포트를 찾을 수 없습니다' }, { status: 404 })
  }
  if (!isRfpAnalysisJobOwnedByActor(actor, job)) {
    return NextResponse.json({ error: 'AI 분석 리포트 다운로드 권한이 없습니다' }, { status: 403 })
  }
  if (job.status !== 'completed' || !job.report_html_path) {
    return NextResponse.json({ error: '아직 다운로드 가능한 리포트가 없습니다' }, { status: 409 })
  }

  const fileName = getRfpAnalysisReportFileName(job.project_title, job.rfp_file_name, job.result_json)
  const { data: signed, error: signError } = await supabase.storage
    .from(RFP_ANALYSIS_BUCKET)
    .createSignedUrl(job.report_html_path, 60, { download: fileName })

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: '리포트 다운로드 URL 생성에 실패했습니다' }, { status: 500 })
  }

  await supabase.from('rfp_analysis_report_downloads').insert({
    job_id: job.id,
    user_id: actor.kind === 'user' ? actor.user.id : job.user_id,
  })

  return NextResponse.json({ url: signed.signedUrl, fileName })
}
