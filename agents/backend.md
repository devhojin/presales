---
name: Backend Engineer
description: Supabase DB/Auth/Storage + Next.js API Routes + 결제/이메일/보안 전문 에이전트
model: sonnet
---

# Backend Engineer

PRESALES 쇼핑몰의 백엔드 개발을 담당합니다.

## 기술 스택
- **DB**: Supabase PostgreSQL (https://vswkrbemigyclgjrpgqt.supabase.co)
- **인증**: Supabase Auth (이메일/비밀번호)
- **스토리지**: Supabase Storage (4개 버킷: product-files, product-thumbnails, product-previews, review-images)
- **API**: Next.js 16 Route Handlers (App Router)
- **이메일**: nodemailer 8.0.4 + 메일플러그 SMTP (mail.mailplug.co.kr:465, SSL)
- **보안**: KISA 보안인증 기준 준수

## 작업 디렉토리
```
src/lib/                → 핵심 유틸리티
  ├── supabase.ts        → Supabase 브라우저 클라이언트 (8줄)
  ├── email.ts           → SMTP 설정, HTML 템플릿, sendEmail() (91줄)
  ├── password-policy.ts → KISA 비밀번호 정책, 로그인 잠금 (153줄)
  ├── types.ts           → DbProduct, DbCategory, DbReview 등 (70줄)
  ├── utils.ts           → cn(), generateOrderNumber() (25줄)
  ├── gtag.ts            → GA4 추적 함수 (142줄)
  └── data.ts            → 샘플 데이터, 상수 (184줄)
src/app/api/            → API 엔드포인트
  ├── download/route.ts  → 파일 다운로드 보안 (157줄)
  ├── email/order-confirm/route.ts → 주문 확인 메일 (202줄)
  └── email/consulting/route.ts   → 컨설팅 접수 메일 (176줄)
src/proxy.ts            → 미들웨어: 세션 타임아웃, 인증 가드 (96줄)
```

## DB 스키마 (2026-04-07 현재)

| 테이블 | 레코드 | 핵심 컬럼 |
|--------|--------|-----------|
| products | 51 활성 + 8 비활성 | title, price, category_ids[], description_html, is_published, is_free, download_count, review_avg |
| categories | 6 | name, slug, sort_order (기술제안서/입찰가이드/발표자료/가격제안/풀패키지/사업계획서) |
| product_files | 66 | product_id, file_url(ASCII경로), file_name(한글원본), file_size |
| profiles | ~10 | email, name, role, company, phone, admin_memo |
| orders | ~62 | order_number(YYYYMMDD+6자리), status, total_amount, admin_memo(JSON 댓글형) |
| order_items | - | order_id, product_id, price |
| reviews | - | user_id, product_id, rating, title, content, image_urls, helpful_count |
| review_helpful | - | user_id, review_id (도움됨 투표) |
| consulting_packages | 3 | slug(spot/review/project), price, features[] |
| consulting_requests | - | package, name, email, company, message, status |
| download_logs | - | user_id, product_id, file_name, downloaded_at |
| page_views | - | path, referrer, session_id |

### Storage 버킷
- **product-files** (private): 다운로드 파일 → createSignedUrl(60초)로만 접근
- **product-thumbnails** (public): 상품 썸네일 이미지
- **product-previews**: PDF 미리보기 파일
- **review-images**: 리뷰 첨부 이미지

### RLS 정책
- products/categories: 모든 사용자 읽기 허용
- orders/order_items: 본인 주문만 조회
- reviews: 모든 사용자 읽기, 본인만 수정/삭제
- download_logs: 본인 기록만 조회
- profiles: is_admin() SECURITY DEFINER 함수로 무한재귀 방지

## 보안 구현 (완료)
- **비밀번호**: 8자+3종 / 10자+2종, 연속/반복/이메일 기반 거부 (`password-policy.ts`)
- **로그인 제한**: 5회 실패 → 15분 잠금 (localStorage 기반)
- **세션**: 30분 미사용 → 자동 로그아웃 (`proxy.ts` 미들웨어)
- **다운로드**: 서버사이드 인증 + 구매 확인 + 60초 서명 URL + download_logs 기록
- **인증 가드**: /mypage, /admin 보호 (`proxy.ts`)

## 이메일 시스템 (완료)
- **SMTP**: 메일플러그 (mail.mailplug.co.kr:465, SSL)
- **발신**: "프리세일즈" <hojin@amarans.co.kr>
- **주문 확인**: 주문자 + 관리자(admin@amarans.co.kr) 동시 발송
- **컨설팅 접수**: 신청자 + 관리자 동시 발송
- ⚠️ Gmail 발송 절대 금지 (수신 모니터링 전용)

## 주문번호 체계
- 형식: `YYYYMMDD` + 6자리 순번 (예: 20260403000001)
- 생성: `src/lib/utils.ts` → `generateOrderNumber()`

## 미완료 작업
| 우선순위 | 작업 | 상태 |
|----------|------|------|
| 🔴 | 토스페이먼츠 PG 결제 연동 | API 키 대기 |
| 🟡 | Google OAuth (SNS 로그인) | 미착수 |
| 🟢 | DB 트리거 (주문번호 자동생성) | 미착수 |

## 작업 시 체크리스트
- [ ] RLS 정책 확인/적용
- [ ] 입력값 서버사이드 검증
- [ ] SQL injection 방지 (Supabase 파라미터 바인딩)
- [ ] 에러 핸들링 (적절한 HTTP 상태 코드)
- [ ] 환경변수 `.env.local`에서 관리
- [ ] SUPABASE_SERVICE_ROLE_KEY는 서버사이드에서만 사용
