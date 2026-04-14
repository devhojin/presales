@AGENTS.md

## ⚠️ 작업 시작 전 필수 체크리스트 (READ FIRST)

**이 섹션을 읽기 전 어떤 명령도 실행하지 마세요.**

### 0. 🚨 배포 불일치 진단 순서 (코드 건드리기 전!)

사용자가 "프로덕션 이상/숫자 다름/반영 안 됨/변화 없음" 중 하나라도 언급하면:
1. `git log --oneline -3` 으로 최근 커밋 해시 확인
2. 그 해시가 **Vercel Deployments 목록에 있는지** 확인 (사용자에게 스크린샷 요청 또는 질문)
3. 없으면 → **webhook 끊김 확정** → Git 재연결 안내 (Settings → Git → Disconnect → Connect)
4. 있으면 → "Current" 뱃지 어느 커밋에 붙었는지 확인
5. **위 1~4 끝나고 나서야** 코드 문제로 접근

절대 금지: "Redeploy 하세요"만 던지고 webhook 상태 체크 생략. 옛날 커밋 재배포는 무의미.
2026-04-14 이 순서 생략해서 토큰 낭비 + 사용자 크게 신뢰 잃음.

### 1. Vercel 배포 절대 규칙

- **이 PC에서 `vercel deploy`/`vercel link`/`vercel --prod` 절대 실행 금지**
- 실제 프로덕션은 `presales-zeta.vercel.app` (hojinchae-6423 팀, devhojin 개인 계정)
- 로컬 PC들의 Vercel CLI는 다른 팀(`startuppartnercenter` 등)에 로그인되어 있어, 배포 시 잘못된 팀에 빈 프로젝트가 생성되고 사용자에게 실패 알림 메일이 발송됨 (2026-04-14 사고 발생)
- **배포는 GitHub push만 한다.** `git push origin master` → Vercel webhook이 자동배포
- 배포가 안 보이면 사용자에게 "Vercel 대시보드에서 Redeploy" 요청. 절대 CLI로 시도하지 말 것
- `.vercel/` 디렉토리가 생기면 즉시 삭제

### 2. 작업 시작 의례 (매 세션 첫 실행)

```bash
cd ~/presales && git pull
```

그리고 다음 메모리를 명시적으로 Read:
- `presales_vercel_account.md` — Vercel 배포 금지 규칙
- `feedback_commit_push.md` — 커밋/푸시 규칙
- `setup_guide.md` — 환경 정보

### 3. 사고 방지 원칙

- **모르는 정보는 추측하지 말고 사용자에게 물어볼 것** (계정, 도메인, 키 등)
- **돌이킬 수 없는 액션 전 반드시 사용자 확인**: 배포, 강제 푸시, DB 마이그레이션, 프로젝트 삭제
- **하드코딩 금지** (특히 limit/페이지수 같은 허수 유발 코드)
- 발견한 버그/문제는 묻지 말고 즉시 수정 (사용자 표준 지시)

---

## 에이전트 팀 운영 모드

이 프로젝트는 **9인 자율 에이전트 팀 (v2.0)**으로 운영됩니다.

- 에이전트 정의: `agents/` 디렉토리 참조
- 작업 요청 → Orchestrator가 분석 → 적절한 에이전트에 분배 → QA 검증 → 배포
- 병렬 처리 가능한 작업은 동시 실행 (Agent tool 병렬 호출)
- 모든 작업 완료 후: `npm run build` → `git push` → `npx vercel --yes --prod`

## 에이전트 팀 구성

| 에이전트 | 역할 | 모델 | 정의 |
|----------|------|------|------|
| Orchestrator | PM/팀장, 작업 분배 및 조율 | opus | `agents/orchestrator.md` |
| Frontend | Next.js/React UI 개발 | sonnet | `agents/frontend.md` |
| Backend | Supabase DB/API/결제/인증 | sonnet | `agents/backend.md` |
| DevOps | 배포/Git/도메인/모니터링 | haiku | `agents/devops.md` |
| QA | 빌드검증/보안/코드리뷰/테스트 | sonnet | `agents/qa.md` |
| Growth & SEO | SEO기술/GA4분석/전환퍼널 | sonnet | `agents/growth.md` |
| Scenario Writer | 사용자여정/시나리오/개선안도출 | sonnet | `agents/scenario-writer.md` |
| Content Writer | 상품설명/법적문서/FAQ/블로그 | sonnet | `agents/docs-writer.md` |
| Marketer | 마케팅전략/캠페인/프로모션 | sonnet | `agents/marketer.md` |

## 개발 환경 정책

- **작업 경로**: `~/presales` (홈 디렉토리 기준, 모든 PC 동일 패턴)
- **GitHub**: `devhojin/presales` (Private) — 코드 백업 및 멀티 PC 동기화
- **작업 종료 시**: 반드시 `git commit` + `git push` 실행 (다른 PC 동기화 필수)
- **작업 시작 시**: 반드시 `git pull` 실행 (최신 코드 동기화)
- **커밋 시**: 반드시 `--author="Hojin Chae <hojinchae@gmail.com>"` 사용 (Vercel 자동배포 조건)
- **배포**: 커밋 → `git push origin master` 까지만. **CLI 배포 금지** (위 ⚠️ 섹션 참조)
- **새 PC 세팅**: 메모리 `reference_new_pc_setup.md` 참조

## 활성 스킬 (우선순위)

이 프로젝트에서 우선적으로 활용할 Claude Skills (`~/.claude/skills/`):

- **nextjs-developer** — Next.js 16 App Router, Server Components, API Routes
- **react-expert** — React 19 컴포넌트, 커스텀 훅, Zustand 상태관리
- **typescript-pro** — 타입 안전성, 유틸리티 타입
- **postgres-pro** — Supabase PostgreSQL 최적화, RLS
- **api-designer** — REST API 설계, Supabase 클라이언트 패턴
- **secure-code-guardian** — 인증/인가, 입력 검증
- **code-reviewer** — 코드 리뷰, 품질 개선
- **debugging-wizard** — 에러 분석, 근본 원인 추적
