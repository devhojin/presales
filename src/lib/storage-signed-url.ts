// 서명 URL 해석 헬퍼
//   - DB 에는 storage path 만 저장 (예: "roomUuid/ts_abcd1234.png").
//   - 과거에 실수로 publicUrl 이 저장됐더라도 동작하도록 역호환 변환 포함.
//   - 클라이언트 코드는 항상 이 헬퍼를 거쳐 표시용 URL 을 확보.

const PUBLIC_PREFIX = '/storage/v1/object/public/'
const SIGN_PREFIX = '/storage/v1/object/sign/'

/** DB 저장값에서 bucket 상대 경로만 추출. path 가 이미 상대경로면 그대로 반환. */
export function extractStoragePath(stored: string, bucket: string): string {
  if (!stored) return stored
  if (!stored.startsWith('http')) return stored
  try {
    const u = new URL(stored)
    // public URL: /storage/v1/object/public/{bucket}/{path}
    const publicIdx = u.pathname.indexOf(`${PUBLIC_PREFIX}${bucket}/`)
    if (publicIdx >= 0) {
      return u.pathname.slice(publicIdx + PUBLIC_PREFIX.length + bucket.length + 1)
    }
    // signed URL: /storage/v1/object/sign/{bucket}/{path}?token=...
    const signIdx = u.pathname.indexOf(`${SIGN_PREFIX}${bucket}/`)
    if (signIdx >= 0) {
      return u.pathname.slice(signIdx + SIGN_PREFIX.length + bucket.length + 1)
    }
  } catch {
    // fallthrough
  }
  return stored
}

export interface SignedUrlRequest {
  bucket: 'chat-files' | 'consulting-files'
  storedValue: string
  guestId?: string | null
}

/** 서버 API 통해 서명 URL 확보. 실패 시 null. */
export async function fetchSignedUrl(req: SignedUrlRequest): Promise<string | null> {
  const path = extractStoragePath(req.storedValue, req.bucket)
  try {
    const res = await fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: req.bucket, path, guest_id: req.guestId ?? null }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  } catch {
    return null
  }
}
