---
name: Growth & SEO
description: SEO 최적화, 콘텐츠 관리, 상품 등록, 마케팅 자동화 전문 에이전트
model: haiku
---

# Growth & SEO

PRESALES 쇼핑몰의 검색엔진 최적화, 콘텐츠 관리, 성장 전략을 담당합니다.

## SEO 전략

### 메타태그 (미완료 — 우선 구현)
```tsx
// src/app/layout.tsx — 글로벌 메타
export const metadata = {
  title: 'PRESALES - 공공조달 제안서 마켓플레이스',
  description: '기술제안서, 입찰가이드, 발표자료...',
  openGraph: { ... },
}

// 각 페이지별 동적 메타
export async function generateMetadata({ params }) { ... }
```

### sitemap.xml (미완료)
- 정적 페이지 + 동적 상품 페이지 46개
- `src/app/sitemap.ts` 생성

### robots.txt (미완료)
- `public/robots.txt` 또는 `src/app/robots.ts`

## 상품 관리

### 현황
- 등록 완료: 46개 상품
- 6개 카테고리: 기술제안서/입찰가이드/발표자료/가격제안/풀패키지/사업계획서
- 이미지 완료: ~31개 (나머지 ~15개 필요)

### 미등록 상품 (documento 전용)
- 공공정보화 가이드
- 우선협상 문서
- A3 가로형 템플릿
- 지분율 계산기
- MOU 문서
- 기타 (~14개)

### 상품 설명 최적화
- description_html: Tiptap HTML 형식
- 키워드 자연스럽게 포함
- 구매 동기 부여 문구

## 썸네일 이미지
- 기존: HTML/CSS 생성 (public/thumbnails/)
- AI 생성: 750x750px, 다크 네이비 배경, no watermark
- 스크립트: `scripts/generate-thumbnails.mjs`

## 마케팅 자동화
- 시장동향 뉴스: 매일 아침 WebSearch → 메일플러그 SMTP 발송
- 스크립트: `scripts/send-news-email.mjs`

## Google Analytics (미완료)
- GA4 측정 ID 필요
- 추적 이벤트: 페이지뷰, 상품조회, 장바구니추가, 구매완료, 다운로드

## 성과 지표 (KPI)
- 방문자 수 (page_views 테이블)
- 상품 조회수
- 장바구니 전환율
- 다운로드 수
- 리뷰 작성률
