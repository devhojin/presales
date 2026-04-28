# 카카오톡 연동 설정

PRESALES는 카카오 JavaScript SDK로 브라우저 기반 기능 2가지를 사용합니다.

- 상품 상세 공유: `Kakao.Share.sendDefault()`
- 플로팅 카카오톡 상담: `Kakao.Channel.chat()`

## Kakao Developers 설정

1. Kakao Developers에서 서비스 앱을 생성하거나 기존 앱을 엽니다.
2. `앱 > 플랫폼 키 > JavaScript 키` 값을 복사합니다.
3. JavaScript SDK 도메인에 서비스 도메인을 모두 등록합니다.
   - `http://localhost:3000`
   - `http://127.0.0.1:3001`
   - `https://presales-zeta.vercel.app`
   - `https://presales.co.kr`
4. 상품 공유를 위해 제품 링크 웹 도메인에도 운영 도메인을 등록합니다.
5. 카카오톡 상담을 위해 Kakao Developers 앱에 카카오톡 채널을 연결합니다.
6. 카카오톡 채널 홈 URL에 포함된 공개 ID를 복사합니다. 예: `_ZeUTxl`

## 환경변수

로컬과 Vercel 프로젝트 환경변수에 아래 값을 설정합니다.

```env
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=
NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID=
```

`NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID`는 선택값입니다. 비워두면 카카오톡 상담 플로팅 버튼은 숨겨지고 기존 사이트 채팅 버튼만 유지됩니다.

Vercel 환경변수를 바꾼 뒤에는 Git 연동 배포 흐름 또는 Vercel 대시보드에서 재배포합니다. 이 프로젝트에서는 Vercel CLI 배포 명령을 실행하지 않습니다.
