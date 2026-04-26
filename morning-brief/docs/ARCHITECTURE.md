# 모닝브리프 아키텍처

> 작성: 2026-04-26 / 결정자: 호진님 / 구현: 아란
> 본 문서는 **마스터 진실(SSoT)** 입니다. 모든 개발 시 우선 참조하세요.
> Supabase Storage `morning-brief / docs` 버킷에 동일 사본이 보관됩니다.

## 1. 한 줄 요약

여러 사이트(presales, SPC, maru AI)에서 **이메일을 수집**하고, **공유 Supabase 프로젝트(`morning-brief`)** 에 통합 저장한 뒤, **Vercel Cron**이 매일 KST 07:00에 모닝브리프를 발송한다.

## 2. 핵심 결정 (왜 이렇게 했나)

| 결정 | 선택지 | 채택 | 이유 |
|------|--------|------|------|
| 명단 위치 | A. presales DB 통합 / B. 새 전용 프로젝트 | **B** | 자매 경계 깔끔, 다 사이트 확장 자연스러움. presales도 "가져다 쓰는" 입장으로 통일 |
| 발송 메커니즘 | A. NAS 크론 / B. GitHub Actions / C. Vercel Cron | **C** | Pro 플랜 보유, presales 코드 안에 cron route 두면 인프라 단일화 |
| 출처 표시 | A. source 단일 컬럼 / B. 별도 source 테이블 | **B** | 같은 이메일이 여러 사이트 가입 시 출처 누적 표현 가능 |
| 기존 NAS 자산 | 유지 / 폐기 | **폐기** | NAS 포맷 예정. 모든 자산 아란PC + Vercel + Supabase로 이전 |

## 3. 시스템 구성

```text
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  presales 사이트      │    │  SPC 사이트           │    │  maru AI 사이트       │
│  (Vercel + Next.js)  │    │  (Vercel + Next.js)  │    │  (Vercel + Next.js)  │
│                      │    │                      │    │                      │
│  /api/brief/         │    │  /api/brief/         │    │  /api/brief/         │
│   subscribe          │    │   subscribe          │    │   subscribe          │
│   unsubscribe        │    │   unsubscribe        │    │   unsubscribe        │
└──────────┬───────────┘    └──────────┬───────────┘    └──────────┬───────────┘
           │                           │                           │
           │ source=presales           │ source=spc                │ source=maruai
           ▼                           ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  Supabase: morning-brief (ynvirceyybekzyqbzbxz)             │
│                                                                              │
│  Tables:                                                                     │
│   - subscribers          (이메일 1행 = 사람 1명, 정규화)                       │
│   - subscriber_sources   (어느 사이트에서 가입했는지, 1:N)                     │
│   - news_items           (수집된 뉴스, FTS 인덱스 포함)                         │
│   - briefs               (일자별 발송 묶음, 상태/카운트)                       │
│   - brief_sends          (구독자 × 브리프, 발송 결과 로그)                     │
│                                                                              │
│  Storage:                                                                    │
│   - docs (public read)   (이 문서들. 모든 사이트가 fetch 참조)                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ 매일 KST 06:50 수집/dedup
                                       │ 매일 KST 07:00 발송
                                       │
                          ┌────────────┴────────────┐
                          │  Vercel Cron            │
                          │  (presales project 안)  │
                          │                         │
                          │  /api/cron/collect-news │
                          │  /api/cron/send-brief   │
                          └─────────────────────────┘
```

## 4. 폴더 구조 (presales 안)

```text
~/presales/
└── morning-brief/
    ├── docs/                      # 본 문서들 (Storage와 동기화)
    │   ├── ARCHITECTURE.md       # ← 이 파일
    │   ├── INTEGRATION.md         # 다른 사이트(SPC/maru AI)에 붙이는 방법
    │   ├── RUNBOOK.md             # 운영/장애대응
    │   └── SCHEMA.md              # 테이블/컬럼 상세
    ├── lib/                       # TypeScript 라이브러리
    │   ├── supabase.ts            # morning-brief 클라이언트
    │   ├── collect-news.ts        # Google News RSS
    │   ├── dedup.ts               # Claude Haiku dedup
    │   ├── render-brief.ts        # HTML 본문 생성
    │   └── send-mail.ts           # 메일플러그 SMTP
    ├── scripts/                   # 일회성/유지보수 스크립트
    │   ├── migrate-from-presales.ts   # 기존 brief_subscribers 이관
    │   └── upload-docs.ts             # docs/*.md → Storage 업로드
    ├── sql/
    │   ├── 001_init.sql           # 초기 스키마
    │   └── 002_rls.sql            # RLS 정책
    └── data/                      # 로컬 작업용 (.gitignore)
```

## 5. Vercel Cron 설계

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/collect-news", "schedule": "50 21 * * *" },
    { "path": "/api/cron/send-brief",    "schedule": "0 22 * * *" }
  ]
}
```

> Vercel Cron은 UTC 기준. KST 07:00 = UTC 22:00 (전날). KST 06:50 = UTC 21:50 (전날).

라우트는 `process.env.CRON_SECRET`을 헤더(`Authorization: Bearer ...`)로 검증해서 외부 호출을 차단.

## 6. 자매 경계

- **morning-brief 프로젝트는 누구의 것인가?** → 아란이 운영(메인 비서, 전체 사업관리 영역)
- 다른 사이트들은 모두 **소비자(consumer)** 입장. 직접 INSERT/SELECT 가능하지만, 마스터 명단은 morning-brief에만 있다.
- 사이트별 자기 DB(presales/spc/maruai)에 구독자 사본을 두지 **않는다**. 진실은 한 곳(morning-brief)에만.

## 7. NAS 폐기 영향

- ❌ NAS daily-news.py 폐기 (대체: presales의 `/api/cron/*`)
- ❌ NAS news.db 폐기 (대체: morning-brief.news_items 테이블)
- ❌ NAS dashboard :8787 폐기 (대체: 별도 결정 — Vercel 이관 또는 아란PC 호스팅)
- ❌ NAS Supabase 백업 폐기 (대체: 별도 결정 — 아란PC 또는 D드라이브)

## 8. 미결 사항

- [ ] 대시보드 :8787 → Vercel 이관 (Python → Next.js 변환 검토)
- [ ] Supabase 일일 백업 새 위치 (아란PC vs D드라이브)
- [ ] 뉴스 아카이브 SQLite의 누적 데이터 마이그레이션 여부 (현재 ~3개월치)
- [ ] CORS 정책: SPC/maru AI에서 morning-brief Supabase 직접 호출 vs 자기 사이트 API 통해 프록시
