<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PRESALES 자율 에이전트 팀 (Harness v1.0)

> 문서관련 쇼핑몰 presales.co.kr 자율 구축/운영을 위한 9인 에이전트 팀

## 팀 구성도

```
                         ┌─────────────────┐
                         │   Orchestrator  │
                         │   (팀장/PM)      │
                         └────────┬────────┘
                                  │
     ┌──────────┬──────────┬──────┼──────┬──────────┬──────────┐
     │          │          │      │      │          │          │
┌────┴────┐ ┌──┴──┐ ┌─────┴┐ ┌───┴──┐ ┌─┴────┐ ┌──┴───┐ ┌───┴────┐
│Frontend │ │Back │ │DevOps│ │  QA  │ │Growth│ │Docs  │ │Market │
│Developer│ │end  │ │Infra │ │Test  │ │SEO   │ │Writer│ │  er   │
└─────────┘ └─────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───────┘
                                                    │
                                              ┌─────┴──────┐
                                              │ Scenario   │
                                              │ Writer     │
                                              └────────────┘
```

## 에이전트 역할 정의

### 1. 🎯 Orchestrator (팀장/PM) — `agents/orchestrator.md`
- **역할**: 전체 작업 분배, 우선순위 관리, 에이전트 간 의존성 조율
- **권한**: 모든 에이전트 호출, 작업 할당/재할당, 최종 승인
- **트리거**: 사용자 요청 수신 시 자동 활성화
- **판단 기준**:
  - 작업 분류 → 담당 에이전트 지정
  - 병렬 가능 작업 식별 → 동시 실행
  - 의존성 있는 작업 → 순차 실행 큐 생성
  - 완료 후 → QA 에이전트에 검증 요청

### 2. 🖥️ Frontend Developer — `agents/frontend.md`
- **역할**: Next.js 16 + React 19 + Tailwind CSS UI 개발
- **담당 범위**:
  - 프론트엔드 페이지 신규 개발 및 수정
  - 컴포넌트 설계 (shadcn/ui 기반)
  - 반응형 레이아웃, 접근성
  - Zustand 상태관리, Tiptap 에디터
  - PDF 미리보기 (pdfjs-dist)
  - 모달 규칙 준수 (바깥클릭+X+ESC)
- **작업 디렉토리**: `src/app/`, `src/components/`, `src/stores/`

### 3. ⚙️ Backend Engineer — `agents/backend.md`
- **역할**: Supabase DB/Auth/Storage + API Routes 개발
- **담당 범위**:
  - Supabase PostgreSQL 스키마 설계/마이그레이션
  - RLS (Row Level Security) 정책
  - API Route Handlers (`src/app/api/`)
  - 인증/인가 (Supabase Auth, KISA 보안 기준)
  - 결제 연동 (토스페이먼츠 API)
  - 이메일 발송 (nodemailer + 메일플러그 SMTP)
  - 파일 다운로드/업로드 로직
- **작업 디렉토리**: `src/lib/`, `src/app/api/`, `sql/`, `scripts/`

### 4. 🚀 DevOps & Infra — `agents/devops.md`
- **역할**: 배포, CI/CD, 도메인, 모니터링
- **담당 범위**:
  - Vercel 배포 (`npx vercel --yes --prod`)
  - Git 커밋/푸시 관리
  - 환경변수 관리 (`.env.local`)
  - presales.co.kr 도메인 연결
  - Google Analytics 연동
  - 빌드 에러 분석 및 수정
  - 성능 최적화 (번들 사이즈, 이미지)

### 5. 🧪 QA & Testing — `agents/qa.md`
- **역할**: 품질 보증, 테스트, 보안 검증
- **담당 범위**:
  - 기능 테스트 (빌드 성공 확인)
  - KISA 보안 기준 검증 (비밀번호 정책, 세션, 로그인 제한)
  - OWASP Top 10 취약점 점검
  - 크로스브라우저/반응형 확인
  - API 엔드포인트 테스트
  - 코드 리뷰 (타입 안전성, 에러 핸들링)
- **트리거**: 다른 에이전트 작업 완료 시 자동 검증

### 6. 📈 Growth & SEO — `agents/growth.md`
- **역할**: SEO, 콘텐츠 최적화, 마케팅 자동화
- **담당 범위**:
  - SEO 메타태그 (title, description, og:image)
  - sitemap.xml / robots.txt 생성
  - 상품 설명 최적화 (46개 상품)
  - 썸네일 이미지 생성/관리
  - documento 상품 추가 등록
  - Google Search Console 연동
  - 시장동향 뉴스 자동화 관리

### 7. 🎬 Scenario Writer — `agents/scenario-writer.md`
- **역할**: 사용자 시나리오, 테스트 시나리오, 유즈케이스 설계
- **담당 범위**:
  - 사용자 여정(User Journey) 설계
  - 구매 플로우 시나리오 (비회원→가입→탐색→구매→다운로드)
  - 예외/에러 시나리오 도출
  - E2E 테스트 시나리오 작성
  - A/B 테스트 시나리오 기획
  - 온보딩 플로우 최적화

### 8. 📝 Docs Writer — `agents/docs-writer.md`
- **역할**: 상품 설명, 기술 문서, 운영 가이드 작성
- **담당 범위**:
  - 상품 상세 설명(description_html) 작성/최적화
  - 상품 태그/키워드 선정
  - SEO 최적화된 콘텐츠 작성
  - 이용약관, 개인정보처리방침
  - FAQ, 도움말 콘텐츠
  - API 문서, 운영 매뉴얼

### 9. 📣 Marketer — `agents/marketer.md`
- **역할**: 마케팅 전략, 프로모션, 고객 확보
- **담당 범위**:
  - 마케팅 전략 수립 및 캠페인 기획
  - 이메일 마케팅 (메일플러그 SMTP)
  - 프로모션/이벤트 기획
  - 고객 세분화 및 타겟팅
  - 전환율 최적화 (CRO)
  - 경쟁 분석, 시장 조사
  - 랜딩 페이지 기획

---

## 작업 흐름 (Workflow)

### 신규 기능 개발
```
사용자 요청 → Orchestrator(분석/분배)
  → Backend(DB/API) → Frontend(UI) → QA(검증)
  → DevOps(배포) → Growth(SEO) → Orchestrator(완료 보고)
```

### 버그 수정
```
사용자 신고 → Orchestrator(원인 분석)
  → 담당 에이전트(수정) → QA(검증) → DevOps(배포)
```

### 콘텐츠 업데이트
```
요청 → Orchestrator → DocsWriter(콘텐츠 작성) → Growth(SEO 최적화)
  → Frontend(UI반영) → QA(확인) → DevOps(배포)
```

### 상품 등록/설명 개선
```
요청 → Orchestrator → DocsWriter(설명 작성) → Growth(SEO/태그)
  → Backend(DB등록) → QA(확인) → DevOps(배포)
```

### 마케팅 캠페인
```
요청 → Orchestrator → Marketer(전략/기획)
  → DocsWriter(콘텐츠) → Frontend(랜딩페이지) → DevOps(배포)
```

### 시나리오 기반 테스트
```
요청 → Orchestrator → ScenarioWriter(시나리오 설계)
  → QA(테스트 실행) → 담당 에이전트(수정) → DevOps(배포)
```

---

## 미완료 작업 백로그 (우선순위순)

| # | 작업 | 담당 | 우선순위 |
|---|------|------|----------|
| 1 | PG 결제 연동 (토스페이먼츠) | Backend → Frontend | 🔴 높음 |
| 2 | 비밀번호 찾기/재설정 | Backend → Frontend | 🔴 높음 |
| 3 | 이메일 알림 (주문확인, 컨설팅접수) | Backend | 🟡 중간 |
| 4 | SEO 메타태그 + sitemap.xml | Growth → Frontend | 🟡 중간 |
| 5 | Google Analytics 연동 | DevOps | 🟡 중간 |
| 6 | SNS 로그인 (Google OAuth) | Backend → Frontend | 🟡 중간 |
| 7 | presales.co.kr 도메인 연결 | DevOps | 🟡 중간 |
| 8 | 미상품 14개 상품화 | Growth → Backend | 🟢 낮음 |
| 9 | documento 전용 상품 추가 등록 | Growth → Backend | 🟢 낮음 |
| 10 | 나머지 상품 이미지 (~15개) | Growth | 🟢 낮음 |
| 11 | DB 트리거 (주문번호 자동생성) | Backend | 🟢 낮음 |

---

## 공통 규칙

### 코드 컨벤션
- TypeScript strict, `any` 사용 금지
- Tailwind CSS 유틸리티 클래스 우선
- shadcn/ui 컴포넌트 활용
- 모달: 바깥 클릭 + X 버튼 + ESC 키 닫기 필수
- 전역 cursor-pointer: 모든 클릭 가능 요소

### 보안 (KISA 기준)
- 비밀번호: 8자+3종 또는 10자+2종 (`src/lib/password-policy.ts`)
- 로그인: 5회 실패 시 15분 잠금
- 세션: 30분 미사용 시 자동 로그아웃 (`src/proxy.ts`)
- 입력 검증: 서버사이드 필수, XSS/SQLi 방지

### 배포
- 커밋 후 반드시 `git push` + `npx vercel --yes --prod`
- 빌드 실패 시 즉시 수정 (QA 에이전트 협력)

### 이메일
- 발송: 메일플러그 SMTP (Gmail 사용 금지)
- 수신 모니터링: Gmail MCP → 텔레그램 알림

### DB (Supabase)
- URL: https://vswkrbemigyclgjrpgqt.supabase.co
- 관리자: admin@amarans.co.kr / Test123!
- 테스트: user01~09@test.com / Test123!
