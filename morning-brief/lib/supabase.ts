import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _anon: SupabaseClient | null = null
let _service: SupabaseClient | null = null

function need(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`환경변수 ${key} 누락`)
  return v
}

/** 브라우저/Edge 안전: anon key 클라이언트 (구독·재구독·수신거부) */
export function morningBriefAnon(): SupabaseClient {
  if (_anon) return _anon
  _anon = createClient(
    need('MORNING_BRIEF_SUPABASE_URL'),
    need('MORNING_BRIEF_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false } },
  )
  return _anon
}

/** 서버 전용: service_role 클라이언트 (Cron, 관리 작업) */
export function morningBriefService(): SupabaseClient {
  if (_service) return _service
  _service = createClient(
    need('MORNING_BRIEF_SUPABASE_URL'),
    need('MORNING_BRIEF_SUPABASE_SERVICE_KEY'),
    { auth: { persistSession: false } },
  )
  return _service
}

export type SourceSite = 'presales' | 'spc' | 'maruai' | 'admin' | 'import'
