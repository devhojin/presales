# Scenario Test Report - 2026-05-05

## Scope

PRESALES 전체 핵심 사용자 여정을 기준으로 공개 탐색, 스토어 구매 진입, 인증 보호, AI RFP 분석, 콘텐츠 조회, 관리자 조회 흐름을 점검했다.

## Scenario Matrix

| Area | Scenario | Result |
| --- | --- | --- |
| Static QA | `npm run lint -- --quiet`, `npx tsc --noEmit`, `npm run build` | Pass |
| Public routes | `/`, `/us`, `/store`, `/consulting`, `/ai-analysis`, `/announcements`, `/feeds`, `/brief`, `/faq`, `/terms`, `/privacy`, `/refund` | Pass |
| Detail routes | Store product, announcement detail, feed detail, brief detail, landing pages | Pass |
| Protected routes | `/mypage`, `/admin`, `/admin/rfp-analysis` without login | Redirects to login |
| Public APIs | Products, announcements, feeds, briefs, recent announcements | Pass |
| Auth APIs | RFP analysis and admin APIs without login | Returns 401 |
| Store UX | Add product to cart, open cart drawer, go to cart, checkout redirects to login | Pass |
| AI Analysis UX | Example preview popup, fake report render, non-PDF rejection | Pass |
| Mobile UX | 390px viewport home screen and mobile navigation menu | Pass |
| Admin UX | Admin login and dashboard read-only view | Pass |
| Admin RFP UX | RFP analysis management list, counts, download button states | Pass |
| My Console UX | AI analysis report list and activity sections after login | Pass |

## Fixes Applied

1. Store product cards now eager-load the first page's above-the-fold product thumbnails to remove Next.js LCP image warnings.
2. Auth forms now include browser autocomplete hints for email, current password, new password, name, organization, and phone fields.

## Notes

- Existing failed AI analysis jobs that display `DOMMatrix is not defined` are historical job records. They were not modified because they are stored analysis history, not a current route/runtime failure.
- No destructive admin actions, payment mutations, product edits, or data deletion were performed during this test pass.
