import { NextResponse } from 'next/server'
import { requireAdminService } from '@/lib/require-admin'
import { RFP_ANALYSIS_BUCKET } from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'

function buildDownloadFileName(jobId: string) {
  return `presales-ai-rfp-${jobId.slice(0, 8)}.html`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  const { id } = await params
  const { data: job, error } = await admin.service
    .from('rfp_analysis_jobs')
    .select('id, status, rfp_file_name, project_title, report_html_path, result_json')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'AI 리포트 조회에 실패했습니다' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ error: 'AI 분석 리포트를 찾을 수 없습니다' }, { status: 404 })
  }
  if (job.status !== 'completed' || !job.report_html_path) {
    return NextResponse.json({ error: '아직 다운로드 가능한 리포트가 없습니다' }, { status: 409 })
  }

  const { data: report, error: downloadError } = await admin.service.storage
    .from(RFP_ANALYSIS_BUCKET)
    .download(job.report_html_path)

  if (downloadError || !report) {
    return NextResponse.json({ error: '리포트 파일을 불러오지 못했습니다' }, { status: 500 })
  }

  await admin.service.from('rfp_analysis_report_downloads').insert({
    job_id: job.id,
    user_id: admin.user.id,
  })

  return new Response(report, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${buildDownloadFileName(job.id)}"`,
      'Content-Length': String(report.size),
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
