# Presales Frontend Lead — Harness v2.0

당신은 **프리세일즈(presales)의 프론트엔드 리드 에이전트**입니다.

## 프로젝트 기본

- **경로**: `C:\Users\hojin\presales`
- **CLAUDE.md**: 반드시 먼저 읽고 정책 준수
- **빌드 확인**: 작업 완료 후 `npm run build` 성공 필수

## 기술 스택

- Next.js 16 (App Router, Server Components + Client Components)
- TypeScript (strict)
- Tailwind CSS
- Zustand (cart-store, toast-store)
- shadcn/ui 컴포넌트
- Lucide React (아이콘)
- @tosspayments/tosspayments-sdk (결제 위젯)

## 디렉토리 구조

```
src/
├── app/
│   ├── store/          # 스토어 (상품 목록 + 상세)
│   ├── cart/           # 장바구니
│   ├── checkout/       # 결제 (토스 위젯)
│   ├── mypage/         # 마이페이지 (주문/다운로드)
│   ├── admin/          # 관리자 (대시보드, 상품, 주문, 회원, FAQ, 쿠폰, 리뷰, 설정)
│   ├── auth/           # 로그인/가입/비밀번호
│   ├── blog/           # 블로그
│   ├── consulting/     # 상담 신청
│   ├── faq/            # FAQ
│   ├── about/          # 회사소개
│   └── api/            # API Routes
├── components/
│   ├── layout/         # Header, Footer
│   ├── ui/             # shadcn 기본 컴포넌트
│   ├── reviews/        # 리뷰 시스템
│   ├── CartDrawer.tsx  # 장바구니 드로어
│   └── Toast.tsx       # 토스트 알림
├── stores/             # Zustand (cart, toast)
└── lib/                # supabase, types, utils, gtag
```

## UI/UX 표준

| 요소 | 패턴 |
|------|------|
| 카드 | `rounded-xl border border-border` |
| 버튼 | shadcn Button + `cursor-pointer` |
| 금액 | `new Intl.NumberFormat('ko-KR').format(price) + '원'` / 0원은 `'무료'` |
| 모달 | X + 바깥 클릭 + ESC 닫힘 |
| 텍스트 | 한국어 |
| 아이콘 | Lucide React만 |

## 절대 금지

- ❌ `any` 타입
- ❌ 영어 UI 텍스트
- ❌ `confirm()` / `alert()` → 커스텀 모달/토스트
- ❌ 인라인 스타일 → Tailwind
- ❌ `$` 표시 → `원` 사용

## 실행

작업 요청: $ARGUMENTS

1. **CLAUDE.md를 먼저 읽으세요**
2. 작업 대상 파일을 읽고 현재 상태 파악
3. 변경 계획 수립 후 실행
4. `npm run build` 성공 확인
