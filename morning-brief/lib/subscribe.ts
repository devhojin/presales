import { randomBytes } from 'node:crypto'
import { morningBriefAnon, type SourceSite } from './supabase'

export type SubscribeResult =
  | { ok: true; created: boolean; resubscribed: boolean }
  | { ok: false; error: string }

/**
 * 사이트 공통 구독 처리. 사이트마다 자기 source 값을 넘긴다.
 *  - 신규 → subscribers + subscriber_sources 양쪽 INSERT
 *  - 기존 active → subscriber_sources만 추가
 *  - 기존 unsubscribed → 재구독 (status='active')
 */
export async function subscribeEmail(
  email: string,
  name: string | null,
  source: SourceSite,
): Promise<SubscribeResult> {
  const lower = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    return { ok: false, error: '올바른 이메일 주소가 아닙니다' }
  }

  const sb = morningBriefAnon()

  const { data: existing, error: selErr } = await sb
    .from('subscribers')
    .select('id, status')
    .eq('email', lower)
    .maybeSingle()
  if (selErr) return { ok: false, error: selErr.message }

  let subId: string
  let created = false
  let resubscribed = false

  if (existing) {
    subId = existing.id
    if (existing.status !== 'active') {
      const { error: updErr } = await sb
        .from('subscribers')
        .update({
          status: 'active',
          unsubscribed_at: null,
          name: name || undefined,
        })
        .eq('id', subId)
      if (updErr) return { ok: false, error: updErr.message }
      resubscribed = true
    }
  } else {
    const token = randomBytes(16).toString('base64url')
    const { data, error: insErr } = await sb
      .from('subscribers')
      .insert({ email: lower, name: name || null, token, status: 'active' })
      .select('id')
      .single()
    if (insErr) return { ok: false, error: insErr.message }
    subId = data.id
    created = true
  }

  const { error: srcErr } = await sb
    .from('subscriber_sources')
    .upsert({ subscriber_id: subId, source }, { onConflict: 'subscriber_id,source' })
  if (srcErr) return { ok: false, error: srcErr.message }

  return { ok: true, created, resubscribed }
}

/**
 * 토큰 기반 수신거부. 사이트 무관하게 사람 단위로 status='unsubscribed'.
 */
export async function unsubscribeByToken(
  token: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!token) return { ok: false, error: '토큰이 필요합니다' }
  const sb = morningBriefAnon()

  // 1) 토큰으로 본인 확인 (헤더 기반 RLS)
  const { data: me, error: selErr } = await sb
    .from('subscribers')
    .select('id, email')
    .eq('token', token)
    .maybeSingle()
  if (selErr) return { ok: false, error: selErr.message }
  if (!me) return { ok: false, error: '유효하지 않은 토큰입니다' }

  const { error: updErr } = await sb
    .from('subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('id', me.id)
  if (updErr) return { ok: false, error: updErr.message }

  return { ok: true, email: me.email }
}
