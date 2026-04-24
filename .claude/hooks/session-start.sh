#!/bin/bash
# presales SessionStart hook
# - origin/master 자동 동기화 (git fetch + 안전한 pull --rebase)
# - dirty/divergence 감지 시 경고 (자동 수정 X)
# - 절대 실패하지 않음 (exit 0 항상). 결과는 additionalContext 로 보고.
set +e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 0

# git repo 가 아니면 noop
git rev-parse --git-dir > /dev/null 2>&1 || exit 0

LINES=()
LINES+=("📍 presales 세션 시작 자동 점검 ($(date +%H:%M:%S))")

# fetch
FETCH_ERR=$(git fetch origin master 2>&1)
if [ $? -ne 0 ]; then
  LINES+=("⚠️ git fetch 실패: $FETCH_ERR")
  CTX=$(printf '%s\n' "${LINES[@]}")
  jq -n --arg ctx "$CTX" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
  exit 0
fi

LOCAL=$(git rev-parse master 2>/dev/null)
REMOTE=$(git rev-parse origin/master 2>/dev/null)
AHEAD=$(git rev-list --count origin/master..master 2>/dev/null || echo 0)
BEHIND=$(git rev-list --count master..origin/master 2>/dev/null || echo 0)
DIRTY_COUNT=$(git status --porcelain | wc -l | tr -d ' ')

if [ "$LOCAL" = "$REMOTE" ]; then
  LINES+=("✅ origin/master 동기화 완료 (${LOCAL:0:7})")
elif [ "$DIRTY_COUNT" -gt 0 ] && [ "$BEHIND" -gt 0 ]; then
  LINES+=("⚠️ 충돌 위험: dirty ${DIRTY_COUNT}건 + behind ${BEHIND}커밋 — 자동 pull 보류")
  LINES+=("   수동: git stash && git pull --rebase && git stash pop")
elif [ "$AHEAD" -gt 0 ] && [ "$BEHIND" -gt 0 ]; then
  LINES+=("⚠️ divergence: ahead ${AHEAD} / behind ${BEHIND} — 수동 rebase 필요")
elif [ "$BEHIND" -gt 0 ]; then
  PULL_OUT=$(git pull --rebase --autostash origin master 2>&1)
  if [ $? -eq 0 ]; then
    LINES+=("✅ git pull --rebase: ${BEHIND}커밋 동기화 완료")
  else
    LINES+=("⚠️ pull --rebase 실패: $PULL_OUT")
  fi
elif [ "$AHEAD" -gt 0 ]; then
  LINES+=("📤 로컬 ahead ${AHEAD}커밋 — push 대기")
fi

# dirty 알람 (3번 룰)
if [ "$DIRTY_COUNT" -gt 0 ]; then
  DIRTY_PREVIEW=$(git status --porcelain | head -5 | sed 's/^/   /')
  LINES+=("📝 미커밋 변경 ${DIRTY_COUNT}건:")
  LINES+=("$DIRTY_PREVIEW")
  LINES+=("   → 세션 종료 시 [skip ci] wip 자동 commit·push 됩니다")
fi

CTX=$(printf '%s\n' "${LINES[@]}")
jq -n --arg ctx "$CTX" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
exit 0
