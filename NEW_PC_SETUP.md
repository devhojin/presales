# 새 환경 세팅 가이드 (2026-04-09 최신)

## 1. 필수 도구 설치

```bash
# Node.js v24+ (https://nodejs.org) — npm, npx 포함
# pnpm
npm install -g pnpm
# Vercel CLI
npm install -g vercel
# Git 설정
git config --global user.name "hojinchae"
git config --global user.email "hojinchae@gmail.com"
```

## 2. 프로젝트 클론

```bash
git clone https://github.com/devhojin/presales.git ~/presales
git clone https://github.com/devhojin/aiplug.git ~/aiplug
git clone https://github.com/devhojin/aiplug-guide.git ~/aiplug-guide
git clone https://github.com/devhojin/startuppartnercenter.git ~/STARTUP_PARTNER_CENTER
```

## 3. 패키지 설치

```bash
cd ~/presales && npm install
cd ~/aiplug && pnpm install
cd ~/STARTUP_PARTNER_CENTER && pnpm install
# aiplug-guide는 정적 HTML, 패키지 설치 불필요
```

## 4. 환경변수 파일 복사

기존 PC에서 아래 파일 내용 복사 → 새 PC 동일 경로에 생성:

| 프로젝트 | 파일 | 비고 |
|----------|------|------|
| presales | `~/presales/.env.local` | Supabase, GA4, SMTP 등 |
| aiplug | `~/aiplug/.env` + `~/aiplug/.env.local` | 둘 다 필요 |
| STARTUP_PARTNER_CENTER | 없음 | Vercel 환경변수 사용 |
| aiplug-guide | 없음 | 정적 사이트 |

> "환경변수 내용 붙여넣기 해줘" 하면 파일로 만들어드림

## 5. Vercel 프로젝트 연결

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

## 6. Claude Code 설정

### 6-1. Claude Code 설치
- VS Code Extension: "Claude Code" 검색 후 설치
- 또는 CLI: `npm install -g @anthropic-ai/claude-code`

### 6-2. settings.json (`~/.claude/settings.json`)

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

### 6-3. DALLE MCP 서버 (선택)

```bash
# 기존 PC에서 ~/dalle-mcp 폴더 통째로 복사하거나:
git clone https://github.com/YOUR_REPO/dalle-mcp.git ~/dalle-mcp
cd ~/dalle-mcp && npm install && npm run build
mkdir -p ~/images
```

> DALLE 안 쓰면 settings.json에서 `mcpServers.dalle` 제거해도 됨

### 6-4. 텔레그램 채널 설정 (선택)

```bash
# Claude Code에서 /telegram:configure 실행 → 봇 토큰 입력
# /telegram:access 로 허용 사용자 추가
```

또는 직접 생성:
```bash
mkdir -p ~/.claude/channels/telegram
echo '{"dmPolicy":"allowlist","allowFrom":["6380164358"],"groups":{},"pending":{}}' > ~/.claude/channels/telegram/access.json
```

### 6-5. 플러그인

Claude Code 최초 실행 시 자동 설치됨. 안 되면 플러그인 마켓에서 수동 활성화:
- telegram — 텔레그램 알림/응답
- context7 — 라이브러리 문서 조회
- playwright — 브라우저 자동화
- github — GitHub 연동

## 7. 작업 흐름

- 작업 완료 → 자동으로 commit + push (말 안 해도 됨)
- 커밋 시 반드시: `--author="Hojin Chae <hojinchae@gmail.com>"` (Vercel 자동배포 조건)
- 커밋 → 푸시 → Vercel 배포는 항상 세트로 실행 (GitHub 자동배포 불안정)
- 작업 완료 시 md 파일, 메모리, 학습 파일 모두 최신화 (다른 세션 이어가기용)
- 수동 배포: "올려줘"라고 하면 됨

## 8. 다른 PC에서 작업 시작할 때마다

```bash
cd ~/presales && git pull
cd ~/aiplug && git pull
cd ~/STARTUP_PARTNER_CENTER && git pull
cd ~/aiplug-guide && git pull
```

## 체크리스트

- [ ] Node.js v24+, pnpm, vercel CLI 설치됨
- [ ] Git global config (user.name, user.email) 설정됨
- [ ] 4개 프로젝트 클론 + 패키지 설치 완료
- [ ] 환경변수 파일 복사됨 (presales .env.local, aiplug .env + .env.local)
- [ ] Vercel project.json 4개 생성됨
- [ ] Claude Code 설치 + settings.json 생성됨
- [ ] 텔레그램 채널 설정됨 (선택)
- [ ] DALLE MCP 설정됨 (선택)
- [ ] git pull 후 npm run build 정상 확인
