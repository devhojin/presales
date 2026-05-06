# 사이트 연동 가이드

> SPC, maru AI, 신규 사이트가 모닝브리프 구독을 붙일 때 따라야 하는 표준 절차.

## 1. 환경변수 (사이트마다 추가)

```bash
# .env.local
MORNING_BRIEF_API_URL=https://<morning-brief-api-host>
MORNING_BRIEF_INGEST_SECRET=<server-only-secret>
MORNING_BRIEF_SOURCE=presales   # 'presales' | 'spc' | 'maruai' (사이트별로 다름)
```

> 중앙 API를 우선 사용한다. 부득이하게 direct DB fallback을 쓰는 서버 프로젝트만 `MORNING_BRIEF_SUPABASE_URL`과 `MORNING_BRIEF_SUPABASE_SERVICE_KEY`를 서버 환경변수로 둔다. anon 키로 모닝브리프 원장 테이블에 직접 접근하지 않는다.

## 2. 구독 API 패턴

각 사이트는 자기 도메인에 `/api/brief/subscribe` route를 둔다. 내부적으로 중앙 API를 호출한다.

```ts
// app/api/brief/subscribe/route.ts (모든 사이트 공통 패턴)
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json() as { email: string; name?: string }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: '올바른 이메일이 아닙니다' }, { status: 400 })
  }

  const baseUrl = process.env.MORNING_BRIEF_API_URL!.replace(/\/+$/, '')
  const res = await fetch(`${baseUrl}/api/v1/subscribe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.MORNING_BRIEF_INGEST_SECRET!}`,
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      name: name || null,
      source_site: process.env.MORNING_BRIEF_SOURCE!,
      brief_type_key: 'public_procurement_daily',
    }),
  })
  if (!res.ok) return NextResponse.json({ ok: false, error: '구독 등록 실패' }, { status: 502 })

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
- ❌ 브라우저 또는 공개 클라이언트에서 service_role key 사용
- ❌ anon 키로 `subscribers`, `subscriber_sources` 등 원장 테이블 직접 접근
- ❌ 사이트마다 다른 unsubscribe 페이지 (혼란만 유발)
- ❌ source 값 임의 신설 (스키마 check 제약 위배 시 PostgREST 에러)
