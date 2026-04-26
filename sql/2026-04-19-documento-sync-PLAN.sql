-- 2026-04-19: documento(원천) → presales 가격·정보 일괄 동기화 PLAN
-- ⚠️ 호란 승인 후 적용. 적용 경로: Supabase Management API /database/query (애란이 일괄 실행)
-- 근거 데이터: scripts/crawl-output/documento-products-v3.json + mapping.json
--
-- 작업 3종:
--   A) PPT 가격 동기화 19건 (price + original_price)
--   B) PDF 가격 동기화 11건 (49,000 → 45,000)
--   C) 무료 자료 신규 등록 4~5건 (호란이 어느 4건 선택할지 결정)

----------------------------------------------------------------------
-- A) PPT 매칭 19건 가격 동기화 (documento 기준 원가)
--    참고: doc 가격은 정상가 기준. originalPrice 는 별도 dump 필요시 추후 업데이트.
--    ps28 (대형쇼핑몰 서비스정책서 통합본) 500원 = 호란 정상가 확인 완료
--    ps49 (프로젝트 수행계획서) presales 무료 vs documento 4,900원 → 무료 유지(호란 결정 1=그대로)
--      → 단 doc은 4,900원이라 presales의 무료 정책이 더 사용자친화적. is_free=true 유지.
----------------------------------------------------------------------
update products set price = 71900 where id = 20;  -- 안전플랫폼 관제 시스템 MMI
update products set price = 45000 where id = 23;  -- 국내 Top tier 쇼핑몰 BM
update products set price = 45000 where id = 25;  -- 금융 시스템 유지운영
update products set price = 45000 where id = 19;  -- 30억 나라장터 입찰
update products set price = 45000 where id = 24;  -- IoT 서버 시스템 디바이스 연동(유료)
update products set price =   500 where id = 28;  -- 대형쇼핑몰 서비스정책서 통합본 (정상가 500원 확인)
update products set price = 45000 where id = 30;  -- 청해시 홈페이지
update products set price = 58900 where id = 31;  -- UI/UX 기획서
update products set price = 45000 where id = 32;  -- 악성코드 은닉사이트
update products set price = 25000 where id = 34;  -- 광고플랫폼 스토리보드
update products set price = 45000 where id = 58;  -- 상품이력제 정보시스템
update products set price = 45000 where id = 35;  -- 산업활용 디자인DB
update products set price = 45000 where id = 36;  -- 네트워크 보안 교육 플랫폼
update products set price = 45000 where id = 37;  -- 27억 정보보안
update products set price = 45000 where id = 38;  -- 농산물 물류 추적
update products set price = 45000 where id = 39;  -- 화영시 여객
update products set price = 45000 where id = 40;  -- [A3] 45억
update products set price = 45000 where id = 41;  -- [세로/A4] 45억
-- ps49 프로젝트 수행계획서: presales 무료 유지 (호란 결정 = 도큐멘토 그대로지만 free 정책 차이 — 별도 확인 권장)

----------------------------------------------------------------------
-- B) PDF 매칭 11건 가격 49,000 → 45,000 동기화
----------------------------------------------------------------------
update products set price = 45000 where id = 63;  -- 30억 시스템 구축 PDF ↔ doc104
update products set price = 45000 where id = 65;  -- Top쇼핑몰 BM PDF ↔ doc96
update products set price = 45000 where id = 70;  -- 청해시 홈페이지 PDF ↔ doc135
update products set price = 45000 where id = 74;  -- 산업활용 디자인DB PDF ↔ doc163
update products set price = 45000 where id = 75;  -- 네트워크 보안 교육 PDF ↔ doc166
update products set price = 45000 where id = 76;  -- 27억 정보보안 PDF ↔ doc175
update products set price = 45000 where id = 77;  -- 농산물 물류 PDF ↔ doc184
update products set price = 45000 where id = 78;  -- 화영시 여객 PDF ↔ doc186
update products set price = 45000 where id = 79;  -- [A3] 45억 PDF ↔ doc191
update products set price = 45000 where id = 80;  -- [세로/A4] 45억 PDF ↔ doc195
update products set price = 45000 where id = 84;  -- 상품이력제 PDF ↔ doc157

-- 매칭 안된 PDF 11건 (presales 자체 등록물) 가격 그대로 유지:
--   ps44(나라장터제안서작성법, 69000), ps64(안전플랫폼MMI PDF, 49000),
--   ps66(금융유지운영 PDF), ps68(군부대IoT PDF), ps69(정부지자체 PDF),
--   ps71(UI/UX PDF), ps72(악성코드 PDF), ps73(광고플랫폼 PDF),
--   ps81(ISP PDF), ps82(나라장터제안서작성법 PDF), ps83(예비창업패키지 PDF)

----------------------------------------------------------------------
-- C) documento 무료 신규 등록 후보 5건 — 호란이 4건 선택 필요
--    공통: category_id=1, tier='basic', is_free=true, price=0, is_published=true
----------------------------------------------------------------------
-- C-1. doc171 WBS (엑셀)
insert into products (title, description, price, category_id, tier, format, is_free, is_published)
values (
  'WBS (엑셀 버전)',
  'WBS(Work Breakdown Structure) 엑셀 양식 — 사업 운영 단계 작업분해도 작성용. documento 원본 무료 자료 기반.',
  0, 1, 'basic', 'XLSX', true, true
);

-- C-2. doc146 분석 자료 - 메타버스 도서관 여행 사업 (PDF)
insert into products (title, description, price, category_id, tier, format, is_free, is_published)
values (
  '분석 자료 — 메타버스 도서관 여행 사업 (PDF)',
  '메타버스 도서관 여행 사업 시장 분석 자료. 신규 사업 발굴/제안서 사전조사용 무료 자료.',
  0, 1, 'basic', 'PDF', true, true
);

-- C-3. doc187 입찰 제안서 무료 다운로드 (템플릿-A3 가로형)
insert into products (title, description, price, category_id, tier, format, is_free, is_published)
values (
  '입찰 제안서 무료 다운로드 (템플릿 — A3 가로형)',
  'A3 가로형 입찰 제안서 템플릿. 디자인 베이스라인으로 활용 가능한 무료 양식.',
  0, 1, 'basic', 'PPTX', true, true
);

-- C-4. doc113 제안서 작성 지원 (비상주 컨설팅)
--   ⚠️ 이건 사실상 컨설팅 서비스. presales 별도 컨설팅 메뉴 있음 → 등록 시 중복 위험
insert into products (title, description, price, category_id, tier, format, is_free, is_published)
values (
  '제안서 작성 지원 안내 (비상주 컨설팅)',
  '제안서 작성 지원 비상주 컨설팅 안내 자료 (실 컨설팅은 별도 신청).',
  0, 1, 'basic', 'PDF', true, true
);

-- C-5. doc178 제안서 작성 지원 (상주 컨설팅) — C-4와 함께 컨설팅 안내
insert into products (title, description, price, category_id, tier, format, is_free, is_published)
values (
  '제안서 작성 지원 안내 (상주 컨설팅)',
  '제안서 작성 지원 상주 컨설팅 안내 자료 (실 컨설팅은 별도 신청).',
  0, 1, 'basic', 'PDF', true, true
);

-- 호란 선택 시나리오:
--   (a) C-1, C-2, C-3, C-4 (가장 자연스러운 무료 자료 4건, 상주는 비상주 안내로 커버)
--   (b) C-1, C-2, C-3, C-5 (상주 안내만 등록)
--   (c) C-1, C-2, C-3 + (113, 178은 컨설팅 메뉴에서 처리)
