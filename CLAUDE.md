@AGENTS.md

## 에이전트 팀 운영 모드
이 프로젝트는 **9인 자율 에이전트 팀**으로 운영됩니다.
- 에이전트 정의: `agents/` 디렉토리 참조
- 작업 요청 → Orchestrator가 분석 → 적절한 에이전트에 분배 → QA 검증 → 배포
- 병렬 처리 가능한 작업은 동시 실행 (Agent tool 병렬 호출)
- 모든 작업 완료 후: `npm run build` → `git push` → `npx vercel --yes --prod`

## 개발 환경 정책
- **작업 경로**: `~/presales` (홈 디렉토리 기준, 모든 PC 동일 패턴)
- **GitHub**: `devhojin/presales` (Private) — 코드 백업 및 멀티 PC 동기화
- **작업 종료 시**: 반드시 `git commit` + `git push` 실행 (다른 PC 동기화 필수)
- **작업 시작 시**: 반드시 `git pull` 실행 (최신 코드 동기화)
- **다른 PC 최초 설정**: `git clone https://github.com/devhojin/presales.git ~/presales && cd ~/presales && npm install` + `.env.local` 생성

## 에이전트 팀 구성
| 에이전트 | 역할 | 모델 | 정의 |
|----------|------|------|------|
| Orchestrator | PM/팀장, 작업 분배 및 조율 | opus | `agents/orchestrator.md` |
| Frontend | Next.js/React UI 개발 | sonnet | `agents/frontend.md` |
| Backend | Supabase DB/API/결제/인증 | sonnet | `agents/backend.md` |
| DevOps | 배포/Git/도메인/모니터링 | haiku | `agents/devops.md` |
| QA | 빌드검증/보안/코드리뷰 | sonnet | `agents/qa.md` |
| Growth | SEO/콘텐츠/마케팅 | haiku | `agents/growth.md` |
| Scenario Writer | 시나리오/유즈케이스 설계 | sonnet | `agents/scenario-writer.md` |
| Docs Writer | 상품설명/기술문서/가이드 | sonnet | `agents/docs-writer.md` |
| Marketer | 마케팅전략/프로모션/캠페인 | sonnet | `agents/marketer.md` |

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
