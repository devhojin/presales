import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/require-active-user'
import { getRfpAnalysisServiceClient } from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireActiveUser()
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = getRfpAnalysisServiceClient()
  const { data, error } = await supabase
    .from('rfp_analysis_jobs')
    .select('id, status, progress, step, rfp_file_name, task_file_name, project_title, report_html_path, error_message, openai_response_id, created_at, completed_at')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 분석 상태 조회에 실패했습니다' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ job: data })
}
