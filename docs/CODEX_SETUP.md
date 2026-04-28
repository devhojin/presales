# PRESALES Codex Setup

이 문서는 프리세일즈 프로젝트를 Codex에서 바로 작업할 수 있게 하기 위한 로컬 준비 상태를 정리합니다.

## 1. 준비된 구성

- 에이전트 정의: `agents/`
- 프로젝트 스킬: `.agents/skills/`
- MCP 설정: `.mcp.json`
- 검증 스크립트: `npm run codex:doctor`
- MCP용 환경 변수 템플릿: `.env.codex.example`

## 2. 에이전트 구성

현재 프로젝트에는 아래 역할 문서가 준비되어 있습니다.

- Orchestrator: `agents/orchestrator.md`
- Frontend: `agents/frontend.md`
- Backend: `agents/backend.md`
- DevOps: `agents/devops.md`
- QA: `agents/qa.md`
- Growth: `agents/growth.md`
- Scenario Writer: `agents/scenario-writer.md`
- Content Writer: `agents/docs-writer.md`
- Marketer: `agents/marketer.md`
- Junior: `agents/junior.md`
- Audit Chief / Bug Hunter / Security / Quality / UX: `agents/auditors/*.md`

## 3. 프로젝트 스킬

프로젝트 로컬 스킬은 `.agents/skills/` 아래에 준비되어 있습니다.

- `design-taste-frontend`
- `full-output-enforcement`
- `high-end-visual-design`
- `industrial-brutalist-ui`
- `minimalist-ui`
- `redesign-existing-projects`
- `stitch-design-taste`

## 4. GitHub 정보

Codex 작업 기준 GitHub 정보는 다음과 같습니다.

- Owner/Repo: `devhojin/presales`
- Remote: `https://github.com/devhojin/presales.git`
- 기본 브랜치: `master`
- 저장소 가시성: Private
- 커밋 author 규칙: `Hojin Chae <hojinchae@gmail.com>`

### GitHub MCP에 필요한 값

- 환경 변수: `GITHUB_PERSONAL_ACCESS_TOKEN`
- 권한 기준:
  - 기본 저장소 작업: `repo`
  - 조직 팀 조회가 필요하면: `read:org`
  - 보안 알림 조회가 필요하면: `security_events`

참고:
- GitHub 공식 MCP 서버 저장소: <https://github.com/github/github-mcp-server>
- GitHub Docs MCP 설정 예시: <https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp>

현재 이 머신에는 Docker가 없어서 GitHub 공식 컨테이너 서버 경로는 바로 못 씁니다. 그래서 프로젝트 `.mcp.json`은 현재 로컬 `@modelcontextprotocol/server-github` 경로를 유지합니다.
이 패키지는 npm 기준 deprecated 상태이므로, Docker 사용 가능해지면 `ghcr.io/github/github-mcp-server` 또는 GitHub의 원격 MCP 경로로 교체하는 것이 다음 단계입니다.

## 5. MCP 구성

프로젝트 `.mcp.json`에는 아래 서버가 준비되어 있습니다.

- `supabase-presales`
  - 패키지: `@supabase/mcp-server-supabase@latest`
  - 모드: read-only
  - 프로젝트 스코프: `vswkrbemigyclgjrpgqt`
  - 필요 환경 변수: `SUPABASE_ACCESS_TOKEN`
- `playwright`
  - 패키지: `@playwright/mcp@latest`
  - 허용 호스트: `localhost`, `127.0.0.1`, `presales-zeta.vercel.app`, `presales.co.kr`
- `context7`
  - 패키지: `@upstash/context7-mcp`
  - 권장 환경 변수: `CONTEXT7_API_KEY`
- `telegram-presales`
  - 스크립트: `scripts/telegram-mcp.mjs`
  - 필요 환경 변수: `TELEGRAM_BOT_TOKEN`
  - 권장 환경 변수: `TELEGRAM_CHAT_ID`, `TELEGRAM_ALLOWED_CHAT_IDS`
  - OS 환경변수가 없으면 프로젝트 루트 `.env.local` 값도 읽음
- `github-presales`
  - 패키지: `@modelcontextprotocol/server-github`
  - 필요 환경 변수: `GITHUB_PERSONAL_ACCESS_TOKEN`
- `filesystem-presales`
  - 패키지: `@modelcontextprotocol/server-filesystem`
  - 루트: 현재 프로젝트 디렉터리(`.`)

### Supabase MCP 참고

Supabase는 공식 문서에서 `project_ref` 스코프와 `read_only=true` 사용을 권장합니다.

- Supabase MCP: <https://github.com/supabase-community/supabase-mcp>

## 6. 환경 변수 준비

`.env.codex.example` 를 참고해서 셸 프로필이나 비밀 저장소에 아래 값을 넣습니다.

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=...
export SUPABASE_ACCESS_TOKEN=...
export CONTEXT7_API_KEY=...   # optional
export TELEGRAM_BOT_TOKEN=...  # optional
export TELEGRAM_CHAT_ID=...    # optional
export TELEGRAM_ALLOWED_CHAT_IDS=... # optional, comma-separated
```

프로젝트의 앱 런타임 환경 변수(`.env.local`, Vercel env)와 MCP 토큰은 분리해서 관리합니다.

## 7. 검증 방법

아래 명령으로 Codex 준비 상태를 점검합니다.

```bash
npm run codex:doctor
```

검증 항목:

- 핵심 설정 파일 존재 여부
- Git remote / branch 확인
- `.mcp.json` 파싱
- MCP 관련 환경 변수 존재 여부
- Playwright / Context7 / GitHub / Supabase MCP 패키지 해석 가능 여부
- Docker 가용성

## 8. 현재 상태 요약

- 프로젝트 에이전트 문서 존재
- 프로젝트 스킬 존재
- MCP 설정 존재
- Node / npm / npx 사용 가능
- Playwright MCP, Context7 MCP, GitHub MCP 패키지 확인 완료
- Supabase MCP 패키지 확인 완료
- Docker 없음

## 9. 바로 다음 액션

1. 셸에 `GITHUB_PERSONAL_ACCESS_TOKEN`, `SUPABASE_ACCESS_TOKEN` 설정
2. `npm run codex:doctor`
3. Codex에서 프로젝트 열고 `AGENTS.md` 기준으로 작업 시작
