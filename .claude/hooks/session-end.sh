#!/bin/bash
# presales SessionEnd hook
# - dirty 면 [skip ci] wip 자동 commit + push (다른 PC 동기화 보장)
# - master 브랜치에서만 동작 (안전장치)
# - [skip ci] 토큰으로 Vercel 자동배포 회피 (CLAUDE.md ⚠️ 섹션 준수)
# - 절대 실패하지 않음 (exit 0 항상)
set +e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 0

# git repo 확인
git rev-parse --git-dir > /dev/null 2>&1 || exit 0

# master 브랜치만 자동 wip (다른 브랜치는 의도된 작업이라 가정)
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ "$BRANCH" != "master" ]; then
  echo "[wip-hook] 현재 브랜치 '${BRANCH}' — master 아님, 자동 wip skip" >&2
  exit 0
fi

# dirty 검사
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

# wip 커밋
HOST=$(hostname -s 2>/dev/null || echo "unknown")
TS=$(date +"%Y-%m-%d %H:%M:%S %Z")
DIRTY_FILES=$(git status --porcelain | wc -l | tr -d ' ')

git add -A
git -c commit.gpgsign=false commit \
  --author="Hojin Chae <hojinchae@gmail.com>" \
  -m "wip: 세션종료 자동 체크포인트 (${HOST} ${TS}, ${DIRTY_FILES}파일) [skip ci]" >&2

if [ $? -ne 0 ]; then
  echo "[wip-hook] commit 실패 (변경 없음 또는 pre-commit hook 거부)" >&2
  exit 0
fi

# push (실패해도 exit 0 — 다음 SessionStart 가 ahead 알림)
PUSH_OUT=$(git push origin master 2>&1)
if [ $? -eq 0 ]; then
  echo "[wip-hook] ✅ wip commit + push 완료 ([skip ci] → Vercel 빌드 우회)" >&2
else
  echo "[wip-hook] ⚠️ push 실패 — 수동 'git push' 필요 (커밋은 로컬에 보존됨)" >&2
  echo "   원인: $PUSH_OUT" >&2
fi
exit 0
