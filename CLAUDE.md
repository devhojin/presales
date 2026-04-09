@AGENTS.md

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
- **배포**: 커밋 → 푸시 → `npx vercel --yes --prod` 항상 세트로 실행

---

## 새 PC 환경 세팅 가이드 (전체)

### 1단계: 필수 도구 설치

```bash
# Node.js v24+ (https://nodejs.org)
# 설치 후 자동으로 npm, npx 포함

# pnpm (aiplug, STARTUP_PARTNER_CENTER용)
npm install -g pnpm

# Vercel CLI
npm install -g vercel

# Git 설정
git config --global user.name "hojinchae"
git config --global user.email "hojinchae@gmail.com"
```

### 2단계: 프로젝트 클론 + 패키지 설치

```bash
# presales (npm)
git clone https://github.com/devhojin/presales.git ~/presales
cd ~/presales && npm install

# aiplug (pnpm)
git clone https://github.com/devhojin/aiplug.git ~/aiplug
cd ~/aiplug && pnpm install

# aiplug-guide (정적 HTML, 패키지 설치 불필요)
git clone https://github.com/devhojin/aiplug-guide.git ~/aiplug-guide

# STARTUP_PARTNER_CENTER (pnpm)
git clone https://github.com/devhojin/startuppartnercenter.git ~/STARTUP_PARTNER_CENTER
cd ~/STARTUP_PARTNER_CENTER && pnpm install
```

### 3단계: 환경변수 파일 복사

기존 PC에서 아래 파일들을 복사해서 새 PC에 동일 경로로 생성:

| 프로젝트 | 파일 | 설명 |
|----------|------|------|
| presales | `~/presales/.env.local` | Supabase URL/Key, GA4, SMTP 등 |
| aiplug | `~/aiplug/.env` + `~/aiplug/.env.local` | 둘 다 필요 |
| STARTUP_PARTNER_CENTER | 환경변수 없음 (Vercel 환경변수 사용) | - |

### 4단계: Vercel 프로젝트 연결

```bash
# presales
mkdir -p ~/presales/.vercel
echo '{"projectId":"prj_LAPFLaX6f56SRAHqZpu59d44SQE5","orgId":"team_o9NoReOkNv0R6jFl1I778NUn","projectName":"presales"}' > ~/presales/.vercel/project.json

# aiplug
mkdir -p ~/aiplug/.vercel
echo '{"projectId":"prj_ZLguWJOyoZet5SQ3PuqRYX3QGja1","orgId":"team_o9NoReOkNv0R6jFl1I778NUn","projectName":"aiplug"}' > ~/aiplug/.vercel/project.json

# aiplug-guide
mkdir -p ~/aiplug-guide/.vercel
echo '{"projectId":"prj_E00o1sUOtPeBP1rdJpjJKIh6eWQh","orgId":"team_o9NoReOkNv0R6jFl1I778NUn","projectName":"aiplug-guide"}' > ~/aiplug-guide/.vercel/project.json

# STARTUP_PARTNER_CENTER
mkdir -p ~/STARTUP_PARTNER_CENTER/.vercel
echo '{"projectId":"prj_cjDHmg8uLwKgDQjqgCVOSKYf2O0E","orgId":"team_o9NoReOkNv0R6jFl1I778NUn","projectName":"startuppartnercenter"}' > ~/STARTUP_PARTNER_CENTER/.vercel/project.json
```

### 5단계: Claude Code 설정

#### 5-1. Claude Code 설치
- VS Code Extension: "Claude Code" 검색 후 설치
- CLI: `npm install -g @anthropic-ai/claude-code` (또는 VS Code 확장에서 자동 설치)

#### 5-2. settings.json 생성 (`~/.claude/settings.json`)

```json
{
  "permissions": {
    "allow": [
      "Bash", "Edit", "Write", "Read", "Glob", "Grep", "Agent",
      "WebFetch", "WebSearch",
      "mcp__plugin_telegram_telegram__reply",
      "mcp__plugin_telegram_telegram__react",
      "mcp__plugin_telegram_telegram__edit_message",
      "mcp__plugin_telegram_telegram__download_attachment"
    ]
  },
  "mcpServers": {
    "dalle": {
      "command": "node",
      "args": ["C:/Users/hojin/dalle-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "(기존 PC에서 복사)",
        "SAVE_DIR": "C:/Users/hojin/images"
      }
    }
  },
  "enabledPlugins": {
    "telegram@claude-plugins-official": true,
    "context7@claude-plugins-official": true,
    "playwright@claude-plugins-official": true,
    "github@claude-plugins-official": true
  },
  "effortLevel": "max",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
  }
}
```

#### 5-3. DALLE MCP 서버 설치

```bash
git clone https://github.com/YOUR_REPO/dalle-mcp.git ~/dalle-mcp
cd ~/dalle-mcp && npm install && npm run build
mkdir -p ~/images
```

> DALLE MCP가 없으면 settings.json에서 `mcpServers.dalle` 항목 제거해도 됨

#### 5-4. 텔레그램 채널 설정

```bash
# Claude Code에서 /telegram:configure 실행 후 봇 토큰 입력
# 이후 /telegram:access 로 허용 사용자 추가
```

텔레그램 access 설정 (`~/.claude/channels/telegram/access.json`):
```json
{
  "dmPolicy": "allowlist",
  "allowFrom": ["6380164358"],
  "groups": {},
  "pending": {}
}
```

#### 5-5. 플러그인 활성화

Claude Code 실행 후 아래 플러그인이 자동 설치되지 않으면 수동 활성화:
- `telegram` — 텔레그램 알림/응답
- `context7` — 라이브러리 문서 조회
- `playwright` — 브라우저 자동화/테스트
- `github` — GitHub 연동

### 6단계: 작업 시작

```bash
cd ~/presales
git pull          # 최신 코드 가져오기
# Claude Code 실행하면 바로 작업 가능
```

### 체크리스트

- [ ] Node.js v24+, pnpm, vercel CLI 설치
- [ ] 4개 프로젝트 클론 완료
- [ ] 환경변수 파일 복사 (presales `.env.local`, aiplug `.env` + `.env.local`)
- [ ] Vercel project.json 4개 생성
- [ ] Claude Code 설치 + `settings.json` 생성
- [ ] 텔레그램 채널 설정 (선택)
- [ ] DALLE MCP 설정 (선택)
- [ ] `git pull` 후 `npm run build` 정상 확인

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
