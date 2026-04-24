# 🔄 이어가기 (2026-04-19 → 다음 세션)

**호진님이 "프리세일즈 이어가자" 하시면 이 파일부터 읽으세요.**

---

## 🎯 진행 중 과제: Task #9 — 토스 가상계좌 + 현금영수증 자동발급 (C안)

**상태:** ⏸ 블로킹 (결제위젯 연동 키 미확보)

### ✅ 완료 (2026-04-19 커밋 `bdf0ec9`)

| 항목 | 위치 |
|------|------|
| DB 컬럼 추가 (virtual_account/bank/due/cash_receipt_url) | `sql/2026-04-19-toss-virtual-account.sql` — Supabase 적용됨 |
| Webhook 엔드포인트 (DEPOSIT_CALLBACK 처리) | `src/app/api/payment/webhook/toss/route.ts` |
| confirm route (가상계좌 응답 확장) | `src/app/api/payment/confirm/route.ts` |
| checkout (customerName/Email/Phone 전달, 라벨 수정) | `src/app/checkout/page.tsx` |
| success 페이지 (가상계좌 UI + 현금영수증 링크) | `src/app/checkout/success/page.tsx` |
| Vercel 환경변수 `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` | 등록됨 (잘못된 종류) |
| Toss 대시보드 webhook (DEPOSIT_CALLBACK + PAYMENT_STATUS_CHANGED) | 등록됨 |

### ❌ 블로킹 원인

Vercel에 넣은 토스 키가 **"API 개별 연동 키"** 섹션 소속.  
코드는 `@tosspayments/tosspayments-sdk` 위젯 사용 → **"결제위젯 연동 키"** 필요.

프로덕션 콘솔 에러:
```
결제위젯 연동 키의 클라이언트 키로 SDK를 연동해주세요.
API 개별 연동 키는 지원하지 않습니다.
```

**아임웹 사용 상점은 결제위젯 연동 키 발급이 막혀있음** (호진님이 토스에 문의했고 그렇게 답변 받음, 2026-04-19 저녁).

### 🚀 이어가기 순서

#### 1단계 — 호진님 조치 결과 확인
호진님께 "오늘 토스/아임웹에 결제위젯 키 재문의 결과 어떻게 됐어요?" 물어보세요.

#### 2단계 A) 위젯 키 발급 성공한 경우
1. Vercel Dashboard → Environment Variables
2. `NEXT_PUBLIC_TOSS_CLIENT_KEY` 와 `TOSS_SECRET_KEY` 값을 위젯 키로 교체
3. Redeploy — **"Use existing Build Cache" 체크 해제** 필수 (NEXT_PUBLIC은 빌드타임 inlining)
4. E2E 재개 (아래 "E2E 테스트 순서" 참조)

#### 2단계 B) 발급 불가능 → 플랜 B (SDK 변경)
현재 `@tosspayments/tosspayments-sdk` (위젯 전용) 를 **`@tosspayments/payment-sdk`** (구버전, 개별 연동 키 지원) 로 교체.

변경 파일: `src/app/checkout/page.tsx`
- `loadTossPayments` → `loadPaymentWidget` 또는 직접 `window.location` redirect
- `widgets.requestPayment(...)` → `paymentWidget.requestPayment({method: 'VIRTUAL_ACCOUNT', ...})` 또는 토스 SDK v1 방식
- 주의: success/fail URL 은 그대로, `paymentKey/orderId/amount` 쿼리 파라미터로 리턴되므로 success 페이지는 건드릴 필요 없음

패키지 교체 명령:
```bash
npm uninstall @tosspayments/tosspayments-sdk
npm install @tosspayments/payment-sdk
```

#### 3단계 — E2E 테스트 순서 (위젯 동작 시)
1. 로그인: `user02@test.com` / `Test123!` (user01은 상품 58 이미 구매이력 있음, admin 도 금지)
2. `/store/58` 접속 → 장바구니 담기 → `/cart` → 결제하기
3. 결제수단 "카드·가상계좌·간편결제" 선택 → 토스 위젯에서 **가상계좌** 탭 클릭
4. 은행 선택 + 현금영수증 정보 입력 → 결제하기
5. `/checkout/success` 에서 가상계좌 발급 UI 확인:
   - 은행 라벨 (예: "KB국민은행")
   - 계좌번호 (font-mono select-all)
   - 예금주 / 입금 기한
6. 토스 대시보드 → 테스트 결제 내역 → 해당 건 "입금 완료" 버튼 클릭
7. 10초 후 Supabase `orders` 테이블에서 `status='paid'`, `paid_at`, `cash_receipt_url` 채워졌는지 확인
8. `/mypage/orders` 에서 다운로드 가능 상태로 변경 확인

---

## 📂 관련 기록

- `sql/2026-04-19-toss-virtual-account.sql` — DB 변경
- `src/app/api/payment/webhook/toss/route.ts` — webhook 처리
- `src/app/api/payment/confirm/route.ts` — 승인 처리
- `src/app/checkout/page.tsx` — 체크아웃 플로우
- `src/app/checkout/success/page.tsx` — 성공 페이지 UI

## 🚫 하지 말 것

- Task #9 이미 끝났다고 커밋하지 말 것 (아직 E2E 미완료)
- 위젯 키 발급 전에 Vercel 환경변수 건드리지 말 것 (지금 설정도 Redeploy 용으로 기록된 상태)
- 이 PC에서 `vercel deploy`/`vercel link` 절대 실행 금지 (`AGENTS.md` 배포 규칙 참조)

## 🗒 참고 — 다른 호진님 action (내일 이후)

- 🔴 `presales.co.kr` 도메인 DNS Imweb 잔재 → Vercel 연결 (critical)
- 🟡 GA4 측정 ID (`NEXT_PUBLIC_GA_ID`) Vercel Env 등록
- 🟡 토스 **라이브 키** 교체 (Task #9 위젯 키 테스트 성공 후)
- 🟢 GitHub PAT / Supabase PAT MCP 재활성화

자세한 내용은 후속 세션에서 별도 작업 기록 문서로 남긴다.
