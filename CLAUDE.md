@AGENTS.md

## 개발 환경 정책
- **작업 경로**: `D:\presales` (Dropbox 외부, 모든 PC 동일)
- **GitHub**: `devhojin/presales` (Private) — 코드 백업 및 멀티 PC 동기화
- **기획 문서 백업**: `D:\Dropbox\Backup-Project\presales\` (Dropbox, 비코드 자료만)
- **작업 종료 시**: 반드시 `git commit` + `git push` 실행 (다른 PC 동기화 필수)
- **작업 시작 시**: 반드시 `git pull` 실행 (최신 코드 동기화)
- **다른 PC 최초 설정**: `git clone https://github.com/devhojin/presales.git D:\presales && cd D:\presales && npm install`

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
