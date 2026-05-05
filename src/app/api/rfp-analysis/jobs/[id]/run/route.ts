import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getRfpAnalysisActor, isRfpAnalysisJobOwnedByActor } from '@/lib/rfp-analysis-access'
import {
  buildReportHtml,
  buildSourceBundle,
  buildStoragePath,
  extractPdfText,
  fetchReportPromotions,
  getRfpAnalysisFailureMessage,
  getRfpAnalysisGuestId,
  getRfpAnalysisServiceClient,
  getRfpAnalysisUserDeletedAt,
  RFP_ANALYSIS_BUCKET,
  runOpenAiRfpAnalysis,
  withRfpAnalysisGuestId,
  withRfpAnalysisUserDeletedAt,
} from '@/lib/rfp-analysis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

async function updateJob(
  supabase: ReturnType<typeof getRfpAnalysisServiceClient>,
  id: string,
  values: Record<string, unknown>,
) {
  await supabase.from('rfp_analysis_jobs').update(values).eq('id', id)
}

async function downloadStorageFile(
  supabase: ReturnType<typeof getRfpAnalysisServiceClient>,
  path: string,
) {
  const { data, error } = await supabase.storage.from(RFP_ANALYSIS_BUCKET).download(path)
  if (error || !data) {
    throw new Error('업로드된 PDF 파일을 찾을 수 없습니다')
  }
  return data.arrayBuffer()
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actorResult = await getRfpAnalysisActor(request)
  if (!actorResult.ok) return actorResult.response
  const { actor } = actorResult

  const { id } = await params
  const supabase = getRfpAnalysisServiceClient()
  const { data: job, error: jobError } = await supabase
    .from('rfp_analysis_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (jobError) {
    return NextResponse.json({ error: 'AI 분석 작업 조회에 실패했습니다' }, { status: 500 })
  }
  if (!job || !isRfpAnalysisJobOwnedByActor(actor, job)) {
    return NextResponse.json({ error: 'AI 분석 작업을 찾을 수 없습니다' }, { status: 404 })
  }
  if (job.status === 'completed') {
    return NextResponse.json({ job })
  }

  try {
    await updateJob(supabase, id, { status: 'extracting', progress: 35, step: 'PDF 원문 추출 중', error_message: null })

    const rfpBuffer = await downloadStorageFile(supabase, job.rfp_file_path)
    const docs = [await extractPdfText(rfpBuffer, job.rfp_file_name, 'RFP')]

    if (job.task_file_path && job.task_file_name) {
      const taskBuffer = await downloadStorageFile(supabase, job.task_file_path)
      docs.push(await extractPdfText(taskBuffer, job.task_file_name, 'TASK'))
    }

    const totalChars = docs.reduce((sum, doc) => sum + doc.charCount, 0)
    if (totalChars < 2000) {
      throw new Error('PDF에서 분석 가능한 텍스트를 충분히 추출하지 못했습니다. 텍스트형 PDF로 다시 업로드해주세요.')
    }

    await updateJob(supabase, id, {
      status: 'analyzing',
      progress: 60,
      step: 'AI 분석 중',
      source_page_count: docs.reduce((sum, doc) => sum + doc.pageCount, 0),
    })

    const sourceBundle = buildSourceBundle(docs)
    const { result, responseId } = await runOpenAiRfpAnalysis(sourceBundle, docs)

    await updateJob(supabase, id, { status: 'rendering', progress: 85, step: 'HTML 리포트 생성 중' })

    const { products, reviews } = await fetchReportPromotions(supabase)
    const html = buildReportHtml(result, products, reviews)
    const reportPath = buildStoragePath(actor.storageOwnerId, id, 'report', 'rfp-analysis-report.html')

    const { error: uploadError } = await supabase.storage
      .from(RFP_ANALYSIS_BUCKET)
      .upload(reportPath, Buffer.from(html, 'utf8'), {
        contentType: 'text/html',
        upsert: true,
      })
    if (uploadError) {
      throw new Error('HTML 리포트 저장에 실패했습니다')
    }

    const projectTitle = result.projectTitle.confidenceState === 'found' ? result.projectTitle.value : job.rfp_file_name
    const completedAt = new Date().toISOString()
    const userDeletedAt = getRfpAnalysisUserDeletedAt(job.result_json)
    const guestId = getRfpAnalysisGuestId(job.result_json)
    const resultWithGuest = guestId ? withRfpAnalysisGuestId(result, guestId) : result
    const resultJson = userDeletedAt ? withRfpAnalysisUserDeletedAt(resultWithGuest, userDeletedAt) : resultWithGuest
    const { data: completedJob, error: completeError } = await supabase
      .from('rfp_analysis_jobs')
      .update({
        status: 'completed',
        progress: 100,
        step: '완료',
        project_title: projectTitle,
        result_json: resultJson,
        report_html_path: reportPath,
        openai_response_id: responseId,
        completed_at: completedAt,
      })
      .eq('id', id)
      .select('id, status, progress, step, project_title, report_html_path, completed_at')
      .single()

    if (completeError || !completedJob) {
      throw new Error('AI 분석 완료 상태 저장에 실패했습니다')
    }

    return NextResponse.json({ job: completedJob })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다'
    const message = getRfpAnalysisFailureMessage(error)
    logger.error('AI RFP 분석 실패', 'rfp-analysis/run', { jobId: id, error: rawMessage })
    await updateJob(supabase, id, {
      status: 'failed',
      progress: 100,
      step: '실패',
      error_message: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
