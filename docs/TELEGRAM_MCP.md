# Telegram MCP

이 프로젝트는 로컬 Codex 세션에서 텔레그램 봇을 사용할 수 있도록 `telegram-presales` MCP 서버를 제공합니다.

## 필요한 환경변수

실제 값은 `.env.local` 또는 Windows 사용자 환경변수에만 입력합니다.

```env
TELEGRAM_BOT_TOKEN=1234567890:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789
TELEGRAM_ALLOWED_CHAT_IDS=123456789
```

- `TELEGRAM_BOT_TOKEN`: BotFather 에서 발급한 봇 토큰입니다.
- `TELEGRAM_CHAT_ID`: 기본 전송 대상 채팅 ID입니다.
- `TELEGRAM_ALLOWED_CHAT_IDS`: 전송 허용 채팅 ID 목록입니다. 여러 개면 쉼표로 구분합니다.

## 연결 방식

`.mcp.json`에 아래 서버가 등록되어 있습니다.

```json
"telegram-presales": {
  "command": "node",
  "args": ["scripts/telegram-mcp.mjs"],
  "env": {
    "TELEGRAM_BOT_TOKEN": "${TELEGRAM_BOT_TOKEN}",
    "TELEGRAM_CHAT_ID": "${TELEGRAM_CHAT_ID}",
    "TELEGRAM_ALLOWED_CHAT_IDS": "${TELEGRAM_ALLOWED_CHAT_IDS}"
  }
}
```

환경변수를 입력한 뒤 Codex MCP 세션을 재시작하면 다음 도구를 사용할 수 있습니다.

`scripts/telegram-mcp.mjs`는 OS 환경변수가 비어 있으면 프로젝트 루트의 `.env.local`도 읽습니다.
단, 현재 떠 있는 Codex 세션에 새 MCP 도구를 즉시 주입하지는 못하므로 설정 후 Codex 창을 재시작해야 합니다.

- `telegram_get_me`: 봇 연결 확인
- `telegram_get_updates`: 최근 메시지 조회 및 `chat_id` 확인
- `telegram_send_message`: 기본 채팅 또는 허용된 채팅으로 메시지 전송

## chat_id 확인

1. 텔레그램에서 봇에게 `/start` 메시지를 보냅니다.
2. MCP가 재시작된 뒤 `telegram_get_updates`를 호출합니다.
3. 응답의 `chat.id` 값을 `TELEGRAM_CHAT_ID`와 `TELEGRAM_ALLOWED_CHAT_IDS`에 입력합니다.
