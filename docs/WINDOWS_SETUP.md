# Windows 개발 환경 세팅

이 문서는 Windows PC에서 `presales` 프로젝트를 새로 받아 개발을 이어가기 위한 최소 절차입니다.

## 1. 필수 도구

- Git for Windows
- Node.js 24.x 권장
- npm 11.x 권장
- VS Code 또는 Cursor

현재 검증된 로컬 버전:

```powershell
node -v
# v24.15.0

npm -v
# 11.12.1
```

## 2. GitHub에서 받기

```powershell
git clone https://github.com/devhojin/presales.git
cd presales
git checkout master
git pull --ff-only
```

`node_modules`는 운영체제별 native package가 달라서 Mac에서 복사하지 않습니다. Windows에서 반드시 새로 설치합니다.

```powershell
npm ci
```

## 3. 환경변수 준비

`.env.local`은 Git에 올라가지 않습니다. 새 PC에서는 예시 파일을 복사한 뒤 실제 값을 채웁니다.

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

필수 값:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

결제/메일/모닝브리프 기능을 테스트할 때 추가로 필요한 값:

- `NEXT_PUBLIC_TOSS_CLIENT_KEY`
- `TOSS_SECRET_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MORNING_BRIEF_SUPABASE_URL`
- `MORNING_BRIEF_SUPABASE_ANON_KEY`
- `MORNING_BRIEF_SUPABASE_SERVICE_KEY`
- `MB_CRON_SECRET`
- `ANTHROPIC_API_KEY`

실제 비밀키는 GitHub에 커밋하지 않습니다.

## 4. 개발 전 점검

```powershell
npm run codex:doctor
npm run lint -- --quiet
npm run build
```

성공 기준:

- `codex:doctor`: hard failure 없음
- `lint --quiet`: 출력 없이 종료
- `build`: Next.js route summary 출력 후 종료

## 5. 로컬 실행

```powershell
npm run dev -- --hostname 127.0.0.1
```

브라우저:

```text
http://127.0.0.1:3000
```

## 6. Windows에서 흔한 문제

### Next SWC 또는 Turbopack native binding 오류

Mac의 `node_modules`를 복사했거나 optional native package가 깨진 경우입니다.

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
npm run build
```

### PowerShell 실행 정책 오류

`npm` 또는 local script 실행이 막히면 PowerShell을 관리자 권한이 아닌 일반 권한으로 열고 다음을 실행합니다.

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 포트 3000 사용 중

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## 7. 배포 규칙

이 프로젝트에서는 로컬에서 Vercel CLI 배포를 하지 않습니다.

금지:

```powershell
vercel deploy
vercel link
vercel --prod
```

배포는 GitHub push로만 트리거합니다.
