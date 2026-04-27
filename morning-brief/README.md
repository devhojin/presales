# 모닝브리프 (morning-brief)

여러 사이트(presales, SPC, maru AI)에서 수집한 이메일 구독자에게 매일 아침 KST 07:00 시장동향 모닝브리프를 발송하는 모듈.

> **마스터 진실:** `docs/ARCHITECTURE.md` 부터 읽으세요.
> Supabase Storage `docs` 버킷에도 동일 사본이 있습니다 (`https://ynvirceyybekzyqbzbxz.supabase.co/storage/v1/object/public/docs/ARCHITECTURE.md`).

## 빠른 참조

| 파일 | 내용 |
|------|------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 전체 그림, 핵심 결정, NAS 폐기 영향 |
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | 5개 테이블 상세 |
| [`docs/INTEGRATION.md`](docs/INTEGRATION.md) | SPC, maru AI 연동 표준 |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | 장애 대응, 수동 발송, 비용 |
| [`sql/001_init.sql`](sql/001_init.sql) | 초기 스키마 |
| [`sql/002_rls.sql`](sql/002_rls.sql) | RLS 정책 |

## Supabase 프로젝트

- 이름: `morning-brief`
- ref: `ynvirceyybekzyqbzbxz`
- region: `ap-northeast-2` (Seoul)
- URL: `https://ynvirceyybekzyqbzbxz.supabase.co`

## 환경변수 (presales 안에서 사용)

```bash
# 모닝브리프 마스터 DB (anon 키 — 사이트 공통)
MORNING_BRIEF_SUPABASE_URL=https://ynvirceyybekzyqbzbxz.supabase.co
MORNING_BRIEF_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...   # 또는 sb_publishable_...
MORNING_BRIEF_SOURCE=presales

# 발송용 (presales 프로젝트만 필요, Cron Route 안에서)
MORNING_BRIEF_SUPABASE_SERVICE_KEY=eyJhbGciOi...
MB_CRON_SECRET=<random-string>
ANTHROPIC_API_KEY=<claude-haiku용>
MAILPLUG_HOST=smtp.mailplug.co.kr
MAILPLUG_PORT=465
MAILPLUG_USER=<mailplug 계정>
MAILPLUG_PASS=<mailplug 비번>
```

## 운영 명령

```bash
# 문서 업로드 (Storage 동기화)
npx tsx morning-brief/scripts/upload-docs.ts

# 수동 수집/발송 (Vercel 배포 후)
curl -X POST https://presales-zeta.vercel.app/api/cron/morning-brief/collect \
  -H "Authorization: Bearer $MB_CRON_SECRET"
curl -X POST https://presales-zeta.vercel.app/api/cron/morning-brief/send \
  -H "Authorization: Bearer $MB_CRON_SECRET"
```
