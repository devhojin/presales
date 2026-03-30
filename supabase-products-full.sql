-- =============================================
-- PRESALES 전체 상품 등록 SQL
-- 기존 상품 삭제 후 전체 재등록
-- =============================================

DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
DELETE FROM product_files;
DELETE FROM products;

-- Reset sequence
ALTER SEQUENCE products_id_seq RESTART WITH 1;

-- =============================================
-- 무료 상품 (16개)
-- =============================================

INSERT INTO products (title, description, price, original_price, category_id, tier, format, pages, file_size, thumbnail_url, tags, is_published, is_free) VALUES

-- 1. 프로젝트 산출물 목록
('프로젝트 산출물 목록', 'IT 프로젝트에서 산출해야 할 문서 목록을 체계적으로 정리한 엑셀 템플릿입니다. 단계별(착수/분석/설계/구현/시험/전개) 산출물과 담당자, 일정을 한눈에 관리할 수 있습니다.', 0, 0, 1, 'basic', 'XLSX', 5, '50KB', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['산출물','프로젝트관리','PMO','엑셀','템플릿'], TRUE, TRUE),

-- 2. 3개년 수주 ARPU
('3개년 수주 ARPU 매출 산정 엑셀', '3개년 수주 계획과 ARPU(고객당 평균 매출) 산정을 위한 엑셀 시트입니다. 사업계획서 매출 전망 작성 시 필수 자료입니다.', 0, 0, 6, 'basic', 'XLSX', 3, '30KB', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['ARPU','수주','매출산정','사업계획서','엑셀'], TRUE, TRUE),

-- 3. WBS PPT
('WBS 작업분류체계 PPT 템플릿', '프로젝트 작업분류체계(WBS)를 PPT로 시각화한 템플릿입니다. 제안서의 추진 일정 섹션에 바로 활용할 수 있습니다.', 0, 0, 1, 'basic', 'PPTX', 8, '1.2MB', 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['WBS','일정관리','프로젝트관리','PPT','제안서'], TRUE, TRUE),

-- 4. 개인정보보호법 적용사례 시나리오 100건
('개인정보보호법 적용사례 시나리오 100건', '개인정보보호법 실무 적용 사례 100건을 정리한 PDF입니다. 제안서 보안 섹션 작성 시 참고 자료로 활용하세요.', 0, 0, 1, 'basic', 'PDF', 120, '5MB', 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['개인정보보호','보안','법률','시나리오','컴플라이언스'], TRUE, TRUE),

-- 5. 건설현장 공종 분류
('건설현장 공종 분류 체계 엑셀', '건설현장 공종분류체계를 통합 정리한 엑셀입니다. 건설/시설 분야 입찰 제안서 작성 시 공종 구분에 활용합니다.', 0, 0, 1, 'basic', 'XLSX', 10, '2.4MB', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['건설','공종분류','시설관리','엑셀','입찰'], TRUE, TRUE),

-- 6. 기능 및 기술요건 정의서
('기능 및 기술요건 정의서 템플릿', '시스템 구축 프로젝트의 기능 요구사항과 기술 요건을 체계적으로 정의하는 Word 템플릿입니다.', 0, 0, 1, 'basic', 'DOCX', 15, '200KB', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['요구사항','기술요건','분석','템플릿','시스템구축'], TRUE, TRUE),

-- 7. 대형쇼핑몰 서비스정책서
('대형쇼핑몰 서비스정책서 (무료)', '대형 온라인 쇼핑몰의 서비스 정책서 통합본입니다. 커머스 플랫폼 구축 제안서 참고 자료로 활용하세요.', 0, 0, 1, 'basic', 'DOCX, PDF', 30, '2MB', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['쇼핑몰','서비스정책','이커머스','플랫폼'], TRUE, TRUE),

-- 8. 데이터전환 계획서
('데이터전환 계획서 템플릿', '시스템 마이그레이션 시 데이터 전환 계획을 수립하는 Word 템플릿입니다. 전환 대상, 절차, 검증 방법을 포함합니다.', 0, 0, 1, 'basic', 'DOC', 12, '150KB', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['데이터전환','마이그레이션','계획서','시스템구축'], TRUE, TRUE),

-- 9. 디바이스 배포 프로세스
('IoT 디바이스 배포 프로세스 PPT', 'IoT 솔루션의 디바이스 배포 및 설치 프로세스를 정리한 PPT입니다.', 0, 0, 1, 'basic', 'PPTX', 15, '3MB', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['IoT','디바이스','배포','설치','프로세스'], TRUE, TRUE),

-- 10. 문서관리지침서
('PMO 문서관리 지침서', '프로젝트 관리 조직(PMO)의 문서 관리 지침서입니다. 문서 분류, 버전 관리, 배포 절차를 정의합니다.', 0, 0, 1, 'basic', 'DOC', 20, '300KB', 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['PMO','문서관리','지침서','프로젝트관리'], TRUE, TRUE),

-- 11. 변경요청서
('프로젝트 변경요청서 템플릿', '프로젝트 진행 중 범위/일정/비용 변경 시 사용하는 공식 변경요청서 양식입니다.', 0, 0, 1, 'basic', 'DOCX', 3, '50KB', 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['변경요청','프로젝트관리','양식','템플릿'], TRUE, TRUE),

-- 12. 설계문서 ERD
('설계문서 ERD PPT', 'ERD(Entity-Relationship Diagram) 설계문서 PPT 템플릿입니다. 데이터베이스 설계 섹션에 활용하세요.', 0, 0, 1, 'basic', 'PPT', 10, '500KB', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['ERD','데이터베이스','설계','PPT'], TRUE, TRUE),

-- 13. 요구사항 추적표
('요구사항 추적 매트릭스 엑셀', '요구사항 추적 매트릭스(RTM) 엑셀 템플릿입니다. 요구사항 ID별 설계/개발/테스트 매핑을 관리합니다.', 0, 0, 1, 'basic', 'XLS', 5, '100KB', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['요구사항','추적','매트릭스','품질관리','엑셀'], TRUE, TRUE),

-- 14. 통합테스트 시나리오 및 결과서
('통합테스트 시나리오 및 결과서', '시스템 통합테스트(SIT) 시나리오와 결과를 기록하는 엑셀 템플릿입니다.', 0, 0, 1, 'basic', 'XLS', 8, '200KB', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['통합테스트','SIT','시나리오','품질관리','엑셀'], TRUE, TRUE),

-- 15. 프로젝트 산출물 템플릿 번들
('프로젝트 산출물 템플릿 번들 (10종)', '프로젝트 전 단계 산출물 템플릿 10종 세트입니다. 요구사항정의서, 콘텐츠구조정의서, 프로세스정의서, 추적매트릭스, DB설계서, 현행시스템분석서, WBS 등을 포함합니다.', 0, 0, 1, 'package', 'XLSX, DOC, XLS, ZIP', 80, '5MB', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['산출물','템플릿','번들','프로젝트관리','세트'], TRUE, TRUE),

-- 16. 프로젝트 평가서
('프로젝트 평가서 엑셀', '프로젝트 완료 후 성과를 평가하는 엑셀 템플릿입니다. 목표 대비 달성도, 교훈, 개선사항을 정리합니다.', 0, 0, 1, 'basic', 'XLSX', 5, '100KB', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['프로젝트평가','성과관리','엑셀','PMO'], TRUE, TRUE);


-- =============================================
-- 유료 상품 (30개)
-- =============================================

INSERT INTO products (title, description, price, original_price, category_id, tier, format, pages, file_size, thumbnail_url, tags, is_published, is_free) VALUES

-- 17. A3 45억규모 공공 제안서
('[A3] 45억 규모 공공 제안서 - 시스템 구축부문', 'IoT활용 에너지 효율 관리 시스템 구축 정성적 제안서입니다. A3 횡형 76페이지 본편 + 템플릿 5종(표지, 목차, 간지, 조견표, 표지측면)을 제공합니다. 45억 원 규모 대형 공공 입찰의 구조와 디자인을 참고하세요.', 199000, 390000, 1, 'premium', 'PPTX x6, PDF', 76, '45MB', 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['A3제안서','45억규모','공공입찰','IoT','에너지효율','시스템구축','정성적제안서','나라장터'], TRUE, FALSE),

-- 18. ISP 통합전산망 구축
('ISP 통합전산망 구축 정보화 전략계획', '공공기관 통합전산망 구축을 위한 ISP(정보화전략계획) 제안서입니다. 현황 분석부터 목표 아키텍처, 실행 로드맵까지 포함합니다.', 199000, 390000, 1, 'premium', 'PPTX, PDF', 120, '70MB', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['ISP','정보화전략','통합전산망','공공기관','아키텍처','로드맵'], TRUE, FALSE),

-- 19. IoT 서버 시스템 디바이스 연동 시나리오
('IoT 솔루션 서버시스템 디바이스 연동 시나리오', 'IoT 솔루션의 서버 시스템과 디바이스 간 연동 시나리오를 상세히 기술한 PPT입니다. 기술제안서의 시스템 아키텍처 섹션에 활용하세요.', 49000, 70000, 1, 'basic', 'PPTX', 30, '5MB', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['IoT','서버','디바이스','연동','시나리오','아키텍처'], TRUE, FALSE),

-- 20. UI/UX 기획서
('온라인 채널 Service UI/UX 기획서', '대규모 온라인 서비스의 UI/UX 기획서입니다. 화면 설계, 사용자 플로우, 인터랙션 정의를 포함합니다.', 69000, 100000, 1, 'premium', 'PPTX', 80, '15MB', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['UIUX','기획서','화면설계','사용자경험','온라인서비스'], TRUE, FALSE),

-- 21. 건설현장 공종분류체계 (유료)
('건설현장 공종분류체계 프리미엄', '건설현장 공종분류체계 상세 데이터를 담은 프리미엄 엑셀입니다. 무료 버전보다 더 상세한 분류와 코드 체계를 제공합니다.', 49000, 70000, 1, 'basic', 'XLSX', 15, '2.4MB', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['건설','공종분류','시설관리','프리미엄','입찰'], TRUE, FALSE),

-- 22. 광고플랫폼 스토리보드
('광고플랫폼 스토리보드 (광고주+운영 관리자)', '광고 플랫폼의 광고주 관리자와 사업운영 관리자 화면의 스토리보드 2종 세트입니다.', 59000, 90000, 1, 'basic', 'PPTX x2', 50, '10MB', 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['광고플랫폼','스토리보드','화면설계','관리자'], TRUE, FALSE),

-- 23. 교육플랫폼 네트워크 보안 인력 양성
('네트워크 보안 인력 양성 교육 플랫폼 개발 운영 제안서', '네트워크 보안 분야 인력 양성을 위한 교육 플랫폼 개발 및 운영 제안서입니다.', 89000, 130000, 1, 'premium', 'PPTX, PDF', 60, '21MB', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['교육플랫폼','네트워크보안','인력양성','정부사업'], TRUE, FALSE),

-- 24. 국내 Top tier 쇼핑몰 BM 개선
('국내 Top tier 쇼핑몰 BM 개선 및 차세대 제안서', '국내 대형 쇼핑몰의 비즈니스 모델 개선 및 차세대 시스템 구축 제안서입니다.', 99000, 150000, 1, 'premium', 'PPTX, PDF', 80, '25MB', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['쇼핑몰','BM개선','차세대','이커머스','시스템구축'], TRUE, FALSE),

-- 25. 군부대 IoT 시설물 원격감시체계
('군부대 IoT 활용 시설물 원격감시체계 구축 제안서', '군부대 시설물에 IoT 센서를 활용한 원격감시체계 구축 제안서입니다. 본편 + A3 보충 페이지를 포함합니다.', 149000, 250000, 1, 'premium', 'PPTX, PDF, A3', 90, '50MB', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['군부대','IoT','원격감시','시설관리','국방','정부사업'], TRUE, FALSE),

-- 26. 금융 시스템 유지운영 제안서
('금융 시스템 유지운영 제안서 (월 1억 매출)', '금융권 시스템 유지운영 사업의 기술 제안서입니다. 월 1억 원 매출 규모의 실전 제안서를 기반으로 합니다.', 99000, 150000, 1, 'premium', 'PPTX, PDF', 70, '20MB', 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['금융','유지운영','SM','월1억','시스템운영'], TRUE, FALSE),

-- 27. 나라장터 입찰 제안서 30억규모
('나라장터 입찰 제안서 - 시스템 구축 30억 규모', '30억 규모 나라장터 입찰 제안서입니다. 정성적 제안서 + 정량적 제안서 + A3 보충 페이지 총 5종을 제공합니다.', 99000, 190000, 1, 'premium', 'PPTX x3, PDF x2', 100, '30MB', 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['나라장터','30억규모','입찰제안서','정성적','정량적','시스템구축'], TRUE, FALSE),

-- 28. 나라장터 제안서 작성법
('나라장터 제안서 작성법 가이드', '나라장터 입찰 제안서를 처음 작성하는 분을 위한 작성법 가이드입니다. 제안요청서 분석부터 제안서 구조화까지 설명합니다.', 69000, 100000, 2, 'basic', 'PPTX, PDF', 40, '22MB', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['나라장터','제안서작성법','가이드','입찰','초보자'], TRUE, FALSE),

-- 29. 노션 영업기회관리
('노션 영업기회관리 PMBOOK', '노션(Notion)을 활용한 영업기회 관리 체계 가이드입니다. CRM 없이 효율적으로 영업 파이프라인을 관리하세요.', 35000, 50000, 6, 'basic', 'DOCX', 20, '2MB', 'https://images.unsplash.com/photo-1611224885990-ab7363d1f2a9?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['노션','영업관리','CRM','파이프라인','PMBOOK'], TRUE, FALSE),

-- 30. 농산물 물류 추적 관리 시스템
('농산물 물류 추적 및 관리 시스템 구축 용역 제안서', '농산물 물류 추적 및 관리 시스템 구축 용역 제안서입니다. 유통 이력 추적, GPS 모니터링, 콜드체인 관리를 포함합니다.', 99000, 150000, 1, 'premium', 'PPTX', 70, '24MB', 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['농산물','물류','추적시스템','콜드체인','정부사업'], TRUE, FALSE),

-- 31. 대형쇼핑몰 서비스정책서 통합본 유료
('대형쇼핑몰 서비스정책서 통합본 프리미엄', '대형 온라인 쇼핑몰의 서비스 정책서 프리미엄 통합본입니다. 무료 버전보다 상세한 운영 정책과 SLA를 포함합니다.', 49000, 70000, 1, 'basic', 'DOCX, PDF', 50, '3MB', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['쇼핑몰','서비스정책','프리미엄','이커머스','SLA'], TRUE, FALSE),

-- 32. 사업비 세부내역 산출
('사업비 세부내역 산출 (비목 산출표)', '공공사업 사업비 세부내역 산출을 위한 비목 산출표입니다. 가격제안서 작성 시 필수 자료입니다.', 35000, 50000, 4, 'basic', 'ZIP (EXCEL)', 10, '1MB', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['사업비','비목산출','가격제안','원가계산','공공사업'], TRUE, FALSE),

-- 33. 산업활용 디자인DB 구축 박물관
('산업활용 디자인DB 구축 제안서 (박물관)', '박물관 소장품의 디자인 DB 구축 사업 제안서입니다. 3D 스캐닝, 메타데이터 설계, 아카이빙 체계를 포함합니다.', 89000, 130000, 1, 'premium', 'PPTX', 60, '15MB', 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['박물관','디자인DB','3D스캐닝','아카이빙','문화재'], TRUE, FALSE),

-- 34. 산출물 템플릿 프리미엄
('프로젝트 산출물 템플릿 프리미엄 번들', '프로젝트 산출물 템플릿 프리미엄 세트입니다. 무료 버전보다 더 상세한 양식과 작성 가이드를 포함합니다.', 69000, 100000, 1, 'package', 'XLSX, DOC, XLS, ZIP', 100, '8MB', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['산출물','템플릿','프리미엄','번들','프로젝트관리'], TRUE, FALSE),

-- 35. 세로 45억규모 공공 제안서
('[A4] 45억 규모 공공 제안서 - 시스템 구축부문 (세로)', '45억 규모 시스템 구축 제안서 A4 세로형 버전입니다. A3 버전과 동일 내용을 세로 포맷으로 재구성했습니다. 템플릿 포함.', 199000, 390000, 1, 'premium', 'PPTX x6, PDF x2', 80, '48MB', 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['A4제안서','45억규모','세로형','공공입찰','시스템구축','나라장터'], TRUE, FALSE),

-- 36. 스마트빌리지 확산사업 제안서
('스마트빌리지 확산 사업 제안서', '2025년 스마트빌리지 확산 사업 제안서입니다. IoT 센서, 스마트 도어락, 독거노인 돌봄 서비스 등을 포함합니다.', 89000, 130000, 1, 'premium', 'HWP', 50, '20MB', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['스마트빌리지','IoT','돌봄서비스','정부사업','지자체'], TRUE, FALSE),

-- 37. 악성코드 은닉사이트 조치
('악성코드 은닉사이트 조치 및 기술지원 용역 제안서', '악성코드 은닉사이트 탐지, 조치 및 기술지원 용역 제안서입니다. 본편 + A3 보충 페이지 포함.', 129000, 200000, 1, 'premium', 'PPTX, PDF, A3', 80, '30MB', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['보안','악성코드','사이버보안','KISA','정부사업'], TRUE, FALSE),

-- 38. 안전플랫폼 관제 시스템 MMI
('안전플랫폼 관제 시스템 MMI', 'IoT 솔루션 기반 안전 플랫폼의 모니터링 MMI(Man-Machine Interface) 설계서입니다.', 59000, 90000, 1, 'basic', 'PPTX', 35, '2.7MB', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['관제시스템','MMI','모니터링','IoT','안전플랫폼'], TRUE, FALSE),

-- 39. 예비창업패키지 사업계획서
('예비창업패키지 사업계획서 (AI 분야)', '예비창업패키지 신청을 위한 사업계획서입니다. AI 분야 창업 아이템 기준으로 작성되었습니다. PPT + HWP 두 가지 버전을 제공합니다.', 89000, 130000, 6, 'premium', 'PPTX, PDF, HWP', 40, '10MB', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['예비창업패키지','사업계획서','AI','창업','정부지원사업'], TRUE, FALSE),

-- 40. 온라인 채용관리시스템 경영정보시스템
('온라인 채용관리시스템 및 경영정보시스템 구축 용역 제안서', '온라인 채용관리시스템과 경영정보시스템 구축 용역 제안서입니다. HR + BI 통합 시스템 구축 사례입니다.', 89000, 130000, 1, 'premium', 'PPTX, PDF', 65, '15MB', 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['채용관리','경영정보','MIS','HR시스템','공공사업'], TRUE, FALSE),

-- 41. 정보보안 업무관리 시스템 27억
('정보보안 업무관리 시스템 구축 제안서 (27억 규모)', '27억 규모의 정보보안 업무관리 시스템 구축 제안서입니다. 보안 관제, 취약점 분석, 인시던트 관리 체계를 포함합니다.', 149000, 250000, 1, 'premium', 'PPTX, PDF', 100, '57MB', 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['정보보안','27억규모','보안관제','취약점분석','시스템구축'], TRUE, FALSE),

-- 42. 정부 지자체 홈페이지 유지보수 고도화
('정부 지자체 홈페이지 통합 유지보수 및 고도화 제안서', '정부 지자체 홈페이지 통합 유지보수 및 고도화 사업 제안서입니다. 본편 + A3 보충 페이지를 포함합니다.', 149000, 250000, 1, 'premium', 'PPTX, PDF, A3', 90, '64MB', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['지자체','홈페이지','유지보수','고도화','정부사업'], TRUE, FALSE),

-- 43. 청해시 홈페이지 유지보수 고도화
('청해시 홈페이지 통합 유지보수 및 고도화 제안서', '청해시 홈페이지 통합 유지보수 및 고도화 제안서입니다. 본편 + A3 보충 페이지 3종을 포함합니다.', 149000, 250000, 1, 'premium', 'PPTX x4', 85, '30MB', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['청해시','홈페이지','유지보수','고도화','지자체'], TRUE, FALSE),

-- 44. 화영시 여객서비스 포털사이트
('화영시 여객서비스 입주기업 지원 포털사이트 제안서', '화영시 여객서비스 입주기업 지원 포털사이트 구축 제안서입니다. 본편 + A3 보충 4종을 포함합니다.', 129000, 200000, 1, 'premium', 'PPTX x5', 80, '18MB', 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['포털사이트','입주기업','지자체','정부사업'], TRUE, FALSE),

-- 45. SLA 서비스 품질관리 (파일 없음)
('SLA 서비스 품질관리 가이드', 'IT 서비스 품질관리(SLA) 체계 수립 가이드입니다. 서비스 수준 정의, 측정 지표, 모니터링 방안을 포함합니다.', 59000, 90000, 1, 'basic', 'PPTX', 30, '5MB', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['SLA','서비스품질','품질관리','IT서비스','운영'], TRUE, FALSE),

-- 46. 상품이력제 정보시스템 (파일 없음)
('상품이력제 정보시스템 구축 사업 제안서', '상품이력제 정보시스템 구축 사업 제안서입니다. 상품 추적, 이력 관리, 유통 모니터링 체계를 포함합니다.', 89000, 130000, 1, 'premium', 'PPTX, PDF', 60, '15MB', 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800&h=600', ARRAY['상품이력제','추적시스템','유통','정보시스템','정부사업'], TRUE, FALSE);
