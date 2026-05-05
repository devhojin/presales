/**
 * Supabase Storage 대용량 업로드 헬퍼
 *
 * Supabase Pro 플랜 기준:
 * - standard upload (`supabase.storage.upload()`): 50 MB per file
 * - resumable upload (TUS protocol): 50 GB per file
 *
 * 이 헬퍼는 파일 크기에 따라 자동으로 적절한 방식을 선택:
 * - ≤ 6 MB: standard (네트워크 왕복 절약)
 * - > 6 MB: TUS resumable (50MB 이상도 안전)
 *
 * 6 MB 기준은 Supabase 공식 권장값 (resumable 초기화 오버헤드 상쇄 지점).
 */

import * as tus from 'tus-js-client'
import { createClient } from './supabase'

const RESUMABLE_THRESHOLD = 6 * 1024 * 1024 // 6 MB
const TUS_CHUNK_SIZE = 6 * 1024 * 1024 // 6 MB (Supabase 고정값)

export interface UploadOptions {
  bucket: string
  path: string
  file: File
  contentType?: string
  upsert?: boolean
  signedToken?: string
  onProgress?: (percent: number) => void
}

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string }

/**
 * 파일 업로드 — 크기에 따라 standard/TUS resumable 자동 선택
 */
export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, contentType, upsert = false, signedToken, onProgress } = opts

  if (signedToken) {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, signedToken, file, {
      contentType: contentType || file.type,
      upsert,
    })
    if (error) return { ok: false, error: error.message }
    onProgress?.(100)
    return { ok: true, path }
  }

  // 작은 파일 → standard upload (빠름)
  if (file.size <= RESUMABLE_THRESHOLD) {
    const supabase = createClient()
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: contentType || file.type,
      upsert,
    })
    if (error) return { ok: false, error: error.message }
    onProgress?.(100)
    return { ok: true, path }
  }

  // 큰 파일 → TUS resumable (50GB 까지)
  return uploadResumable(opts)
}

async function uploadResumable(opts: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, contentType, upsert = false, onProgress } = opts
  const supabase = createClient()

  // 세션 토큰 필요 (TUS 엔드포인트는 auth 헤더 요구)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, error: '로그인이 필요합니다' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const endpoint = `${supabaseUrl}/storage/v1/upload/resumable`

  return new Promise<UploadResult>((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': upsert ? 'true' : 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: contentType || file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      chunkSize: TUS_CHUNK_SIZE,
      onError: (err) => {
        resolve({ ok: false, error: err.message || 'upload failed' })
      },
      onProgress: (bytesSent, bytesTotal) => {
        if (bytesTotal > 0) {
          onProgress?.(Math.round((bytesSent / bytesTotal) * 100))
        }
      },
      onSuccess: () => {
        resolve({ ok: true, path })
      },
    })

    // 진행 중이던 업로드 재개 지원
    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0])
      }
      upload.start()
    })
  })
}
