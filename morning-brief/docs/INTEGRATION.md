# 사이트 연동 가이드

> SPC, maru AI, 신규 사이트가 모닝브리프 구독을 붙일 때 따라야 하는 표준 절차.

## 1. 환경변수 (사이트마다 추가)

```bash
# .env.local
MORNING_BRIEF_SUPABASE_URL=https://ynvirceyybekzyqbzbxz.supabase.co
MORNING_BRIEF_SUPABASE_ANON_KEY=<anon-key>
MORNING_BRIEF_SOURCE=presales   # 'presales' | 'spc' | 'maruai' (사이트별로 다름)
```

> service_role key는 절대 사이트 .env에 두지 않는다. 발송용 Cron(presales 프로젝트)만 가짐.

## 2. 구독 API 패턴

각 사이트는 자기 도메인에 `/api/brief/subscribe` route를 둔다. 내부적으로 morning-brief Supabase 호출.

```ts
// app/api/brief/subscribe/route.ts (모든 사이트 공통 패턴)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json() as { email: string; name?: string }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: '올바른 이메일이 아닙니다' }, { status: 400 })
  }

  const sb = createClient(
    process.env.MORNING_BRIEF_SUPABASE_URL!,
    process.env.MORNING_BRIEF_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
  const source = process.env.MORNING_BRIEF_SOURCE!  // 'presales' / 'spc' / 'maruai'
  const lower = email.toLowerCase()

  // upsert subscriber
  const { data: existing } = await sb
    .from('subscribers')
    .select('id, status')
    .eq('email', lower)
    .maybeSingle()

  let subId: string
  if (existing) {
    subId = existing.id
    if (existing.status !== 'active') {
      await sb.from('subscribers').update({
        status: 'active',
        unsubscribed_at: null,
        name: name || null,
      }).eq('id', subId)
    }
  } else {
    const token = randomBytes(16).toString('base64url')
    const { data, error } = await sb.from('subscribers').insert({
      email: lower, name: name || null, token, status: 'active',
    }).select('id').single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    subId = data.id
  }

  // record source (idempotent — PK는 (subscriber_id, source))
  await sb.from('subscriber_sources').upsert(
    { subscriber_id: subId, source },
    { onConflict: 'subscriber_id,source' },
  )

  return NextResponse.json({ ok: true })
}
```

## 3. 수신거부 (모든 사이트 공통)

수신거부 링크는 발송된 메일 안에 한 번만 들어가고, **morning-brief 도메인의 정식 unsubscribe 페이지**로 보낸다 (사이트 분기 X). 이 페이지는 presales 프로젝트의 `/brief/unsubscribe?token=...` 라우트가 호스팅한다.

토큰 검증 후 `subscribers.status = 'unsubscribed'`, `unsubscribed_at = now()` 업데이트.

## 4. 출처 표시 (메일 본문)

브리프 메일 푸터에:
```
이 메일은 다음 사이트에서 구독하신 모닝브리프입니다:
{source 배열, 예: presales, maru AI}
수신거부: <link>
```

`brief_sends` 테이블에는 발송 시점에 그 사람의 모든 source를 join해서 표시.

## 5. 절대 하지 말 것

- ❌ 사이트 자기 DB에 구독자 사본 저장 (진실은 morning-brief 한 곳)
- ❌ 구독 API에서 service_role key 사용 (anon으로 충분, RLS가 막음)
- ❌ 사이트마다 다른 unsubscribe 페이지 (혼란만 유발)
- ❌ source 값 임의 신설 (스키마 check 제약 위배 시 PostgREST 에러)
