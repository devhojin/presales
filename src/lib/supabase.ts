import { createBrowserClient } from '@supabase/ssr'
// import type { Database } from './database.types'

/**
 * Supabase 브라우저 클라이언트
 * lib/types.ts 의 DbProduct/DbReview 가 database.types.ts 의 Row 타입 기반으로 재정의됨 (DB sync).
 * 단, `<Database>` 제네릭 전면 적용은 각 파일의 로컬 타입(Announcement/TeamMember 등) 과
 * null 가드 업데이트가 필요해 점진적 적용 (다음 세션에서 파일별로).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser client environment variables are not configured')
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
