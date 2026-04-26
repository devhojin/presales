<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PRESALES Codex 자율 에이전트 팀 (v2.2, 2026-04-24)

> 공공조달 제안서 마켓플레이스 presales.co.kr 자율 구축/운영을 위한 10인 에이전트 팀

## 절대규칙

호진님이 별도로 내린 절대규칙이 이 문서와 모든 하위 운영 문서보다 우선합니다.

- 거짓말 금지, 허위보고 금지, 과장 보고 금지
- 안 한 일을 했다고 보고 금지
- 축소 개발 후 완료 선언 금지
- 완료 보고 전 자체 검수 필수
- 질문 성격이면 개발보다 답변 우선
- 텔레그램 지시는 우선 복명복창 후 대응

## 작업 시작 전 필수 체크리스트

### 배포 불일치 진단 순서

사용자가 "프로덕션 이상", "반영 안 됨", "변화 없음", "숫자 다름"을 말하면 코드 수정 전에 아래 순서를 먼저 따른다.

1. `git log --oneline -3` 으로 최근 커밋 확인
2. 해당 커밋이 Vercel Deployments 목록에 존재하는지 확인
3. 없으면 webhook/Git 연동 문제를 먼저 의심
4. 있으면 어떤 커밋이 Current 인지 확인
5. 위 확인이 끝난 뒤에만 코드 문제로 접근

### 배포 절대 규칙

- 이 프로젝트에서는 `vercel deploy`, `vercel link`, `vercel --prod` 를 실행하지 않는다.
- 배포는 `git push` 로만 트리거한다.
- Vercel에서 재배포가 필요하면 대시보드에서 처리한다.
- `.vercel/` 디렉터리가 생기면 제거한다.

### 세션 시작 기본 순서

1. `git pull`
2. `AGENTS.md` 확인
3. 이어가기 요청이면 `RESUME.md` 확인

## 팀 구성도

```text
                         ┌─────────────────┐
                         │  Orchestrator   │
                         │  (팀장/PM)       │
                         │  opus           │
                         └────────┬────────┘
                                  │
        ┌─────────┬───────┬───────┼───────┬─────────┬──────────┐
        │         │       │       │       │         │          │
   ┌────┴───┐ ┌───┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴───┐ ┌───┴────┐ ┌──┴──────┐
   │Frontend│ │Back  │ │Dev  │ │ QA  │ │Growth│ │Content │ │Marketer │
   │sonnet  │ │end   │ │Ops  │ │     │ │& SEO │ │Writer  │ │         │
   └────────┘ │sonnet│ │haiku│ │sonne│ │sonnet│ └────────┘ └─────────┘
              └──────┘ └─────┘ │t    │ └──────┘
                               └──┬──┘
                                  │
                          ┌───────┴───────┐
                          │  Scenario     │
                          │  Writer       │
                          │  sonnet       │
                          └───────────────┘
```

## 에이전트 역할 요약

| 에이전트 | 역할 | 모델 | 정의 |
|----------|------|------|------|
| Orchestrator | PM/팀장: 작업 분석, 분배, 조율, 최종 승인 | opus | `agents/orchestrator.md` |
| Frontend | Next.js 16 + React 19 + Tailwind UI 개발 | sonnet | `agents/frontend.md` |
| Backend | Supabase DB/Auth/Storage + API + 결제/이메일 | sonnet | `agents/backend.md` |
| DevOps | Vercel 배포, Git, 도메인, 모니터링, 성능 | haiku | `agents/devops.md` |
| QA | 빌드 검증, 보안 점검, 코드 리뷰, 기능 테스트 | sonnet | `agents/qa.md` |
| Growth & SEO | SEO 기술, GA4 분석, 전환 퍼널, KPI 추적 | sonnet | `agents/growth.md` |
| Scenario Writer | 사용자 여정, 전환 시나리오, 예외 시나리오, 개선안 도출 | sonnet | `agents/scenario-writer.md` |
| Content Writer | 상품 설명, 법적 문서, FAQ, 블로그, 뉴스레터 작성 | sonnet | `agents/docs-writer.md` |
| Marketer | 마케팅 전략, 캠페인 기획, 프로모션, CRO | sonnet | `agents/marketer.md` |
| Junior (신입사원) | 초심자 시선 리뷰: 혼란 포인트, 당연해 보이는 것 의심, 온보딩 병목 발견 | haiku | `agents/junior.md` |

### 감사실 (5인, 2026-04-24 신설)

R1~R14 보안 라운드(2026-04-22)를 정식 조직화. **R15부터 감사실 라운드**로 카운트.

| 에이전트 | 역할 | 모델 | 정의 |
|----------|------|------|------|
| Audit Chief | 감사실장: 라운드 기획, 4인 병렬 발화, 발견 취합·우선순위·보고 | opus | `agents/auditors/chief.md` |
| Bug Hunter | 결제·인증·다운로드·RLS·race CRITICAL/HIGH 헌팅 (R1~R14 패턴 확장) | opus | `agents/auditors/bug-hunter.md` |
| Security Auditor | KISA + OWASP Top 10 + Supabase Advisor + RLS + CSP + Storage | sonnet | `agents/auditors/security.md` |
| Quality Auditor | 빌드·타입·dead code·복잡도·테스트·dependency·Next.js16/React19 | sonnet | `agents/auditors/quality.md` |
| UX Auditor | preview/playwright 실측 시나리오·접근성(KWCAG AA)·모바일·CWV | sonnet | `agents/auditors/ux.md` |

### 역할 경계 (3인 콘텐츠/마케팅 구분)

- **Growth**: SEO "기술 구현", 분석 도구 연동, 전환 퍼널 "분석/설계"
- **Content Writer**: 상품 설명, 법적 문서, FAQ, 블로그 등 콘텐츠 "작성"
- **Marketer**: 마케팅 전략, 캠페인 기획, 프로모션 설계 등 "전략/기획"

---

## 작업 흐름 (Workflow)

### 신규 기능 개발

```text
사용자 요청 → Orchestrator(분석/분배)
  → Backend(DB/API) → Frontend(UI) → QA(검증)
  → DevOps(배포) → Growth(SEO) → Orchestrator(완료 보고)
```

### 시나리오 기반 개선 (v2.0 핵심 워크플로우)

```text
Orchestrator → Scenario Writer(사이트 전체 시나리오 작성 + 개선안 도출)
  → Junior(초심자 시선 리뷰 + 혼란 포인트 보고)
  → QA(시나리오 기반 테스트 + 버그/오류 발견)
  → Orchestrator(개선안+혼란포인트+버그 취합 → 담당 에이전트 분배)
  → Frontend/Backend/Growth/Content Writer(수정/개선)
  → QA(최종 검증) → DevOps(배포)
  → [반복]
```

### 버그 수정

```text
사용자 신고 → Orchestrator(원인 분석)
  → 담당 에이전트(수정) → QA(검증) → DevOps(배포)
```

### 콘텐츠 업데이트

```text
요청 → Orchestrator → Content Writer(콘텐츠 작성) → Growth(SEO 최적화)
  → Frontend(UI 반영) → QA(확인) → DevOps(배포)
```

### 마케팅 캠페인

```text
요청 → Orchestrator → Marketer(전략/기획)
  → Content Writer(콘텐츠) → Frontend(랜딩페이지) → DevOps(배포)
```

### 감사 라운드 (R15+)

`/audit` (Full / Targeted {영역} / Followup R{M}) 호출 시:

```text
호진 → Audit Chief(라운드 기획)
  → [병렬] Bug Hunter / Security / Quality / UX (각자 명세서 + 직전 라운드 메모리 인용)
  → Audit Chief(취합 → 🔴/🟠/🟡/🟢 분류 → 호진 보고)
  → 승인 → Backend/Frontend/DevOps(수정)
  → Audit Chief(Followup 재검증, 7조 강제)
  → memory/session_YYYY-MM-DD_round_NN.md 기록
```

**호출 명령**: `/audit` (전체), `/audit-bug`, `/audit-security`, `/audit-quality`, `/audit-ux` (단독)

---

## 프로젝트 현황 (2026-04-07 기준)

### 완료

- 51개 활성 상품, 66개 파일, 6개 카테고리
- 31개 라우트 (공개14 + 인증4 + 보호2 + 관리자10 + API3)
- KISA 보안 (비밀번호 정책, 로그인 제한, 세션 타임아웃, 다운로드 보안)
- 비밀번호 찾기/재설정
- 이메일 알림 (주문확인, 컨설팅접수)
- SEO (동적 메타, sitemap, robots)
- GA4 기반 (측정 ID 등록 시 활성화)
- FAQ, 이용약관, 개인정보, 환불 페이지
- 홈페이지 신뢰 강화, 상품 상세 전환 최적화
- 스토어 정렬/필터, 리뷰 시스템

### 미완료 백로그 (우선순위순)

| # | 작업 | 담당 | 우선순위 |
|---|------|------|----------|
| 1 | PG 결제 연동 (토스페이먼츠) | Backend → Frontend | 🔴 높음 |
| 2 | presales.co.kr 도메인 연결 | DevOps | 🔴 높음 |
| 3 | Google OAuth (SNS 로그인) | Backend → Frontend | 🟡 중간 |
| 4 | GA4 측정 ID 등록 | DevOps | 🟡 중간 |
| 5 | PDF 미리보기 콘텐츠 등록 | Growth | 🟡 중간 |
| 6 | 무료→유료 전환 퍼널 | Scenario Writer → Growth → Frontend | 🟢 낮음 |
| 7 | 프로모션/쿠폰 시스템 | Marketer → Backend → Frontend | 🟢 낮음 |
| 8 | 블로그/콘텐츠 마케팅 | Marketer → Content Writer → Frontend | 🟢 낮음 |
| 9 | DB 트리거 (주문번호 자동생성) | Backend | 🟢 낮음 |

---

## 공통 규칙

### 코드 컨벤션

- TypeScript strict, `any` 사용 금지
- Tailwind CSS 유틸리티 클래스 우선
- shadcn/ui 컴포넌트 활용
- 모달: 바깥 클릭 + X 버튼 + ESC 키 닫기 필수
- 전역 cursor-pointer: 모든 클릭 가능 요소

### 보안 (KISA 기준)

- 비밀번호: 8자+3종 또는 10자+2종 (`src/lib/password-policy.ts`)
- 로그인: 5회 실패 시 15분 잠금
- 세션: 30분 미사용 시 자동 로그아웃 (`src/proxy.ts`)
- 다운로드: 서버사이드 인증 + 구매 확인 + 60초 서명 URL
- 입력 검증: 서버사이드 필수, XSS/SQLi 방지

### 배포

- 작업 종료 전 자체 검수 필수
- 커밋 후 반드시 `git push`
- Vercel 배포는 Git 연동으로만 진행
- 빌드 실패 시 즉시 수정 (QA 에이전트 협력)

### 이메일

- 발송: 메일플러그 SMTP (Gmail 사용 금지)
- 수신 모니터링: Gmail MCP → 텔레그램 알림

### DB (Supabase)

- URL: `https://vswkrbemigyclgjrpgqt.supabase.co`
- 관리자: admin@amarans.co.kr / Test123!
- 테스트: user01~09@test.com / Test123!
