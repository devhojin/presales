# GA4 연동 구현 가이드

## 구현 내용

### 1. GoogleAnalytics 컴포넌트 (src/components/GoogleAnalytics.tsx)
- Next.js 16 Script 컴포넌트를 활용한 gtag.js 로드
- 환경변수 `NEXT_PUBLIC_GA_MEASUREMENT_ID`로 측정 ID 관리
- 측정 ID가 없으면 스크립트를 렌더링하지 않음 (아직 GA4 계정 미생성 시)
- afterInteractive 전략으로 최적 로드 시간 확보

### 2. gtag.js 유틸리티 (src/lib/gtag.ts)
클라이언트 컴포넌트에서 사용하는 GA4 이벤트 추적 함수:

**핵심 함수:**
- `pageview(url)` - 페이지뷰 추적
- `event(action, category, label, value)` - 커스텀 이벤트

**편의 함수:**
- `trackProductView(productId, productName, price?)` - 상품 조회
- `trackAddToCart(productId, productName, quantity)` - 장바구니 추가
- `trackPurchase(transactionId, value, currency)` - 구매 완료
- `trackDownload(fileName, fileType)` - 파일 다운로드
- `trackReviewSubmit(productId, rating)` - 리뷰 제출
- `trackEngagement(action, category, label?)` - 일반 사용자 상호작용

### 3. layout.tsx 통합
- root layout의 head 영역에 GoogleAnalytics 컴포넌트 추가
- PageViewTracker와 함께 작동

### 4. 환경변수 설정
`.env.local` 파일에 GA4 설정 준비:
```
# Google Analytics 4 - GA4 계정 생성 후 측정 ID 설정
# 예: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

## GA4 계정 설정 방법

### 1. Google Analytics 계정 생성
1. [Google Analytics](https://analytics.google.com)에 접속
2. 새 속성 생성: "PRESALES"
3. 데이터 수집 플랫폼: "웹"
4. 속성 정보 입력:
   - 웹사이트 이름: PRESALES
   - 웹사이트 URL: https://presales-zeta.vercel.app

### 2. 측정 ID 확인
1. 관리자 → 데이터스트림
2. 웹 데이터스트림 선택
3. 측정 ID (G-로 시작) 복사

### 3. 환경변수 설정
.env.local에 측정 ID 추가:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

그 후 npm run build && git push && npx vercel --yes --prod 실행

## 사용 예시

### 상품 페이지에서 상품 조회 추적
```typescript
'use client'

import { trackProductView } from '@/lib/gtag'

export function ProductDetail({ product }) {
  React.useEffect(() => {
    trackProductView(product.id, product.name, product.price)
  }, [product])

  return <div>{product.name}</div>
}
```

### 장바구니 추가 시 이벤트 추적
```typescript
import { trackAddToCart } from '@/lib/gtag'

function handleAddToCart(product) {
  // 장바구니 추가 로직
  trackAddToCart(product.id, product.name, 1)
}
```

### 구매 완료 시 이벤트 추적
```typescript
import { trackPurchase } from '@/lib/gtag'

function handlePurchaseSuccess(orderId, total) {
  trackPurchase(orderId, total, 'KRW')
}
```

### 파일 다운로드 추적
```typescript
import { trackDownload } from '@/lib/gtag'

function handleDownload(filename) {
  trackDownload(filename, 'pdf')
}
```

## 추적 가능한 이벤트 목록

| 이벤트 | 함수 | 설명 |
|--------|------|------|
| product_view | trackProductView | 상품 페이지 조회 |
| add_to_cart | trackAddToCart | 장바구니 추가 |
| purchase | trackPurchase | 구매 완료 |
| download | trackDownload | 파일 다운로드 |
| review_submit | trackReviewSubmit | 리뷰 제출 |
| (custom) | trackEngagement | 기타 사용자 상호작용 |

## PageViewTracker와의 관계

- **PageViewTracker** (`src/components/PageViewTracker.tsx`): Supabase에 페이지뷰 기록 (내부 분석용)
- **GoogleAnalytics**: GA4에 이벤트 전송 (Google Analytics 대시보드용)
- 두 시스템은 독립적으로 작동하며 상호 간섭 없음

## 브라우저 콘솔에서 GA4 테스트

```javascript
// GA4 설정 확인
console.log(window.dataLayer)

// 커스텀 이벤트 전송 테스트
gtag('event', 'test_event', {
  'event_category': 'test',
  'event_label': 'test_label'
})
```

## 관련 파일 경로

- GA4 컴포넌트: `src/components/GoogleAnalytics.tsx`
- GA4 유틸리티: `src/lib/gtag.ts`
- Root Layout: `src/app/layout.tsx`
- 환경설정: `.env.local`

## 배포 상태

- 빌드: ✓ 성공 (npm run build)
- Git: ✓ 커밋 및 푸시 완료
- Vercel: ✓ 프로덕션 배포 완료
- URL: https://presales-zeta.vercel.app

## 다음 단계

1. GA4 계정 생성
2. 측정 ID를 .env.local에 추가
3. 배포 (npm run build && git push && npx vercel --yes --prod)
4. Google Analytics 대시보드에서 데이터 수집 확인
5. 필요한 페이지/컴포넌트에 이벤트 추적 함수 호출 추가
