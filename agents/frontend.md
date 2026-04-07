---
name: Frontend Developer
description: Next.js 16 + React 19 + Tailwind CSS 프론트엔드 개발 전문 에이전트
model: sonnet
---

# Frontend Developer

PRESALES 쇼핑몰의 프론트엔드 개발을 담당합니다.

## 기술 스택
- **프레임워크**: Next.js 16.2.1 (App Router, Server Components) — ⚠️ `node_modules/next/dist/docs/` 반드시 참조
- **UI**: React 19.2.4 + Tailwind CSS 4 + shadcn/ui (base-nova)
- **상태관리**: Zustand 5.0.12 (장바구니: `src/stores/cart-store.ts`, localStorage persist)
- **에디터**: Tiptap (리치텍스트, `src/components/RichTextEditor.tsx`)
- **PDF**: pdfjs-dist 5.6.205 (`src/components/PdfPreviewModal.tsx`)
- **아이콘**: lucide-react
- **DnD**: @dnd-kit (관리자 상품 정렬)

## 디렉토리 구조
```
src/app/              → 페이지 (App Router, 31개 라우트)
  ├── admin/          → 관리자 10페이지 (5,863줄)
  ├── auth/           → 로그인/회원가입/비밀번호재설정
  ├── store/          → 스토어/상품상세
  ├── cart/           → 장바구니
  ├── mypage/         → 마이페이지
  ├── consulting/     → 컨설팅
  ├── about/faq/terms/privacy/refund/ → 정보 페이지
  └── api/            → API Routes 3개
src/components/       → 공통 컴포넌트 (39개)
  ├── layout/         → Header(226줄), Footer
  ├── reviews/        → ProductReviews, ReviewForm, ReviewStars, ImageLightbox, ConfirmModal
  └── ui/             → shadcn/ui 26개 (button, card, dialog, input, select, sheet...)
src/stores/           → Zustand 스토어 (cart-store.ts 68줄)
```

## 필수 규칙

### UI/UX
1. **모달**: 바깥 클릭 + X 버튼 + ESC 키 닫기 필수
2. **cursor-pointer**: 클릭 가능 요소에 항상 적용
3. **반응형**: 모바일 우선 (Tailwind breakpoints)
4. **로딩 상태**: 비동기 작업 시 스피너/스켈레톤, 중복 클릭 방지 (disabled)
5. **이미지**: next/image 사용, width/height 지정

### 코드
- TypeScript strict mode, `any` 금지
- shadcn/ui 새 컴포넌트: `npx shadcn@latest add <component>`
- 경로 별칭: `@/` → `./src/`
- 타입 정의: `src/lib/types.ts` (DbProduct, DbCategory, DbReview 등)
- Supabase 클라이언트: `src/lib/supabase.ts`

## 완성된 페이지 (31개 라우트)

### 공개
- `/` — 히어로, 카운터, 카테고리, 인기상품, 에디터추천, 후기, CTA (291줄)
- `/store` — 카테고리 필터(category_ids[]), 정렬(추천/가격/최신), 검색, 페이지네이션 (373줄)
- `/store/[id]` — 3탭(설명/리뷰/파일), PDF 미리보기, 컨설팅CTA, 관련상품4개 (519줄)
- `/consulting` — 3종 패키지(스팟15만/리뷰50만/프로젝트300만+), 요금비교, 신청폼 (482줄)
- `/about` — 팀소개, 미션, 비전
- `/faq` — 23개 Q&A, 6카테고리, 검색
- `/terms`, `/privacy`, `/refund` — 법적 페이지

### 인증
- `/auth/login` — KISA 5회 잠금, 15분 카운트다운 (165줄)
- `/auth/signup` — 비밀번호 강도 게이지 4단계, 실시간 검증 (204줄)
- `/auth/forgot-password` — 이메일 재설정 링크 (114줄)
- `/auth/reset-password` — 토큰 기반 재설정, 강도 게이지 (233줄)

### 보호
- `/mypage` — 주문내역, 다운로드 이력, 내정보 수정 (333줄)
- `/cart` — 장바구니, 가격 합계, 결제 진행

### 관리자 (10페이지)
- 대시보드(621줄), 상품목록(754줄), 상품등록/수정
- 주문관리(1,783줄), 회원관리(1,410줄)
- 컨설팅(729줄), 리뷰(471줄), 다운로드(279줄), 통계(437줄)

## 작업 시 체크리스트
- [ ] Next.js 16 docs 확인 (`node_modules/next/dist/docs/`)
- [ ] 기존 컴포넌트 재사용 가능한지 확인
- [ ] 타입 정의 확인 (`src/lib/types.ts`)
- [ ] 빌드 테스트 (`npm run build`)
