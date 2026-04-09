const BASE = "https://vswkrbemigyclgjrpgqt.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd2tyYmVtaWd5Y2xnanJwZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjM5MjYsImV4cCI6MjA5MDgzOTkyNn0.pm655gp6EJkr8XbLgH8PDRszhw2pk3ReJpVux2t39Gs";

async function createPosts() {
  const r = await fetch(BASE + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@amarans.co.kr", password: "Test123!" })
  });
  const { access_token } = await r.json();
  if (!access_token) { console.log("Login failed"); return; }

  const posts = [
    {
      title: "나라장터 제안서 작성: 제안 목차 만들기 완벽 가이드",
      slug: "나라장터-제안서-목차-만들기-가이드",
      excerpt: "공공조달 제안서의 핵심은 목차입니다. 평가위원이 첫 페이지에서 판단하는 구조화 전략을 알려드립니다.",
      category: "제안서 작성",
      author: "프리세일즈 팀",
      tags: ["나라장터", "제안서", "목차", "공공조달", "RFP", "평가기준"],
      is_published: true,
      published_at: "2026-04-08T09:00:00Z",
      content_html: `<h2>왜 목차가 제안서의 승패를 결정하는가</h2>
<p>공공조달 제안서 평가에서 심사위원이 가장 먼저 보는 것은 <strong>목차</strong>입니다. 수십 건의 제안서를 하루 안에 평가해야 하는 심사위원 입장에서, 목차만 보고도 "이 업체가 요구사항을 제대로 이해했는지" 판단합니다.</p>
<p>잘 짜인 목차는 단순한 페이지 안내가 아닙니다. <strong>제안 전략의 축약본</strong>이자, 평가 항목에 대한 답변 구조입니다.</p>
<h2>Step 1: RFP(제안요청서) 분석에서 시작하기</h2>
<p>목차를 만들기 전에 반드시 해야 할 일은 <strong>RFP의 평가 기준표를 역으로 분해</strong>하는 것입니다.</p>
<ul>
<li><strong>평가 항목별 배점</strong>을 확인하세요. 배점이 높은 항목에 더 많은 페이지를 할당합니다.</li>
<li><strong>필수 포함 사항</strong>을 체크리스트로 만드세요. 누락하면 감점입니다.</li>
<li><strong>가점 항목</strong>을 파악하세요. 인증서, 유사 실적, 지역업체 가점 등.</li>
</ul>
<p>예시로 일반적인 기술제안서 평가 배점 구조를 보겠습니다:</p>
<table>
<thead><tr><th>평가 항목</th><th>배점</th><th>목차 반영</th></tr></thead>
<tbody>
<tr><td>사업 이해도</td><td>20점</td><td>1장. 사업 개요 및 이해</td></tr>
<tr><td>기술 방안</td><td>40점</td><td>2장. 기술 구현 방안 (최다 페이지)</td></tr>
<tr><td>관리 방안</td><td>15점</td><td>3장. 사업 관리 계획</td></tr>
<tr><td>지원 체계</td><td>15점</td><td>4장. 유지보수 및 지원</td></tr>
<tr><td>수행 실적</td><td>10점</td><td>5장. 회사 소개 및 실적</td></tr>
</tbody>
</table>
<h2>Step 2: 3단계 목차 구조화</h2>
<p>효과적인 제안서 목차는 <strong>대분류 → 중분류 → 소분류</strong> 3단계로 구성합니다.</p>
<h3>대분류: 평가 항목과 1:1 매핑</h3>
<p>RFP의 평가 기준표 각 항목이 대분류가 됩니다. 심사위원이 "기술 방안 항목 40점"을 평가할 때, 목차에서 "2장. 기술 구현 방안"을 바로 찾을 수 있어야 합니다.</p>
<h3>중분류: 세부 요구사항 반영</h3>
<p>RFP에 나열된 세부 요구사항을 중분류로 배치합니다. 예를 들어 "2장. 기술 구현 방안" 아래에:</p>
<ul>
<li>2.1 시스템 아키텍처 설계</li>
<li>2.2 핵심 기능 구현 방안</li>
<li>2.3 데이터 마이그레이션 전략</li>
<li>2.4 보안 및 인증 체계</li>
</ul>
<h3>소분류: 차별화 포인트</h3>
<p>소분류에서 경쟁사와의 차별점을 드러냅니다. "2.2.1 AI 기반 자동 분류 시스템 (특허 출원 중)" 같은 구체적 기술력을 목차 단계에서 노출합니다.</p>
<h2>Step 3: 페이지 배분 전략</h2>
<p>제안서 전체 분량이 100페이지라면:</p>
<ul>
<li><strong>40% (40p)</strong>: 기술 방안 (배점 최고 항목)</li>
<li><strong>20% (20p)</strong>: 사업 이해도</li>
<li><strong>15% (15p)</strong>: 관리 방안</li>
<li><strong>15% (15p)</strong>: 지원 체계</li>
<li><strong>10% (10p)</strong>: 회사 소개 및 실적</li>
</ul>
<p><strong>핵심 원칙:</strong> 배점 비율과 페이지 비율을 일치시키세요. 10점짜리 항목에 30페이지를 쓰면 비효율적입니다.</p>
<h2>실수하기 쉬운 3가지</h2>
<ol>
<li><strong>RFP 순서와 목차 순서 불일치</strong>: 심사위원이 혼란스러워합니다. RFP 평가표 순서 그대로 목차를 구성하세요.</li>
<li><strong>목차에 구체성 부족</strong>: "기술 방안"보다 "클라우드 기반 마이크로서비스 아키텍처 구현 방안"이 신뢰를 줍니다.</li>
<li><strong>부록 활용 미비</strong>: 인증서, 특허증, 유사 실적 증빙 자료는 부록으로 분리하되, 목차에 명확히 기재하세요.</li>
</ol>
<h2>프리세일즈 팁</h2>
<p>프리세일즈에서 제공하는 <strong>제안서 템플릿</strong>에는 RFP 분석부터 목차 구조화까지 자동으로 가이드하는 체크리스트가 포함되어 있습니다. 처음 제안서를 작성하는 분이라면 템플릿으로 시작하는 것을 추천합니다.</p>`
    },
    {
      title: "기능명세서 작성 요령: 심사위원을 설득하는 기술 문서의 비밀",
      slug: "기능명세서-작성-요령-심사위원-설득",
      excerpt: "기능명세서는 단순한 기능 나열이 아닙니다. 평가위원이 '이 업체가 할 수 있겠다'고 느끼게 만드는 작성법을 공유합니다.",
      category: "제안서 작성",
      author: "프리세일즈 팀",
      tags: ["기능명세서", "제안서", "기술문서", "공공조달", "시스템설계", "평가기준"],
      is_published: true,
      published_at: "2026-04-07T09:00:00Z",
      content_html: `<h2>기능명세서가 중요한 이유</h2>
<p>공공조달 기술제안서에서 <strong>기능명세서</strong>는 "기술 구현 방안" 항목의 핵심입니다. 배점의 35~40%를 차지하는 이 영역에서, 기능명세서의 품질이 곧 점수입니다.</p>
<p>많은 업체가 범하는 실수는 <strong>기능을 단순히 나열</strong>하는 것입니다. "로그인 기능", "게시판 기능", "통계 기능" — 이런 수준의 명세는 어떤 업체나 쓸 수 있습니다. 심사위원을 설득하려면 <strong>구현 깊이</strong>를 보여줘야 합니다.</p>
<h2>기능명세서의 4계층 구조</h2>
<h3>Layer 1: 기능 분류 체계</h3>
<p>전체 시스템을 <strong>대기능 → 중기능 → 소기능</strong>으로 계층화합니다.</p>
<ul>
<li><strong>대기능</strong>: 시스템의 핵심 모듈 (예: 사용자 관리, 콘텐츠 관리, 통계/분석)</li>
<li><strong>중기능</strong>: 각 모듈의 주요 기능 그룹 (예: 사용자 관리 → 회원가입, 인증, 권한관리)</li>
<li><strong>소기능</strong>: 실제 구현 단위 (예: 회원가입 → 이메일 인증, SMS 인증, 소셜 로그인)</li>
</ul>
<h3>Layer 2: 기능 상세 명세</h3>
<p>각 소기능에 대해 다음을 명시합니다:</p>
<table>
<thead><tr><th>항목</th><th>내용</th><th>예시</th></tr></thead>
<tbody>
<tr><td>기능명</td><td>명확한 한줄 설명</td><td>이메일 기반 2단계 본인인증</td></tr>
<tr><td>입력</td><td>사용자 입력 데이터</td><td>이메일 주소, 인증번호</td></tr>
<tr><td>처리</td><td>시스템 내부 로직</td><td>인증번호 생성(6자리), 5분 유효, 3회 제한</td></tr>
<tr><td>출력</td><td>결과/응답</td><td>인증 성공/실패 메시지, 세션 토큰 발급</td></tr>
<tr><td>예외</td><td>에러 처리</td><td>인증번호 만료 시 재발송 안내</td></tr>
</tbody>
</table>
<h3>Layer 3: 화면 설계 (와이어프레임)</h3>
<p>기능명세서에 <strong>간단한 화면 설계</strong>를 포함하면 점수가 올라갑니다. 심사위원이 "이 업체는 이미 설계까지 마쳤구나"라는 인상을 받습니다.</p>
<ul>
<li>모든 화면을 그릴 필요 없습니다. <strong>핵심 화면 5~10개</strong>만 선별하세요.</li>
<li>Figma나 전문 도구가 아니어도 됩니다. 깔끔한 <strong>표 형태의 레이아웃 도식</strong>이면 충분합니다.</li>
</ul>
<h3>Layer 4: 비기능 요구사항</h3>
<p>기능명세서에서 자주 빠뜨리는 부분입니다:</p>
<ul>
<li><strong>성능 요구사항</strong>: 동시접속 500명 기준 응답시간 3초 이내</li>
<li><strong>보안 요구사항</strong>: 개인정보 암호화(AES-256), 접근 로그 기록</li>
<li><strong>호환성</strong>: Chrome, Edge, Safari 최신 2개 버전 지원</li>
<li><strong>접근성</strong>: 웹접근성 인증마크 (WCAG 2.1 AA)</li>
</ul>
<h2>차별화 전략: "How"를 보여주세요</h2>
<p>대부분의 제안서는 "What"(무엇을 만들 것인가)만 설명합니다. 차별화는 <strong>"How"(어떻게 구현할 것인가)</strong>에서 나옵니다.</p>
<ul>
<li>❌ "대시보드 통계 기능을 구현합니다"</li>
<li>✅ "Apache ECharts 기반 실시간 대시보드를 구현하며, WebSocket을 통해 5초 주기로 데이터를 갱신합니다. 사용자 맞춤 위젯 배치를 지원하여 부서별 KPI를 한눈에 확인할 수 있습니다."</li>
</ul>
<p>기술 키워드를 구체적으로 명시하면 심사위원의 신뢰도가 높아집니다.</p>
<h2>실전 체크리스트</h2>
<ol>
<li>RFP의 기능 요구사항을 빠짐없이 매핑했는가?</li>
<li>각 기능에 입력-처리-출력-예외를 명시했는가?</li>
<li>핵심 화면 와이어프레임을 포함했는가?</li>
<li>비기능 요구사항(성능, 보안, 호환성)을 다뤘는가?</li>
<li>"How"가 명확한가? 기술 스택과 구현 방법을 구체적으로 썼는가?</li>
</ol>`
    },
    {
      title: "공공조달 입찰 공고 분석법: 숨겨진 정보를 읽는 5가지 포인트",
      slug: "공공조달-입찰공고-분석법-5가지-포인트",
      excerpt: "같은 입찰 공고를 보고도 누군가는 핵심을 짚고, 누군가는 놓칩니다. 공고문에서 진짜 중요한 정보를 읽어내는 방법을 알려드립니다.",
      category: "입찰 가이드",
      author: "프리세일즈 팀",
      tags: ["입찰공고", "나라장터", "공공조달", "RFP분석", "조달청", "입찰전략"],
      is_published: true,
      published_at: "2026-04-06T09:00:00Z",
      content_html: `<h2>입찰 공고, 겉보기와 다릅니다</h2>
<p>나라장터에 올라오는 입찰 공고는 정형화된 양식을 따릅니다. 하지만 그 안에는 <strong>발주기관의 의도, 경쟁 구도, 유리한 조건</strong>이 숨어 있습니다. 이것을 읽어내는 능력이 수주 확률을 결정합니다.</p>
<h2>포인트 1: 사업 규모와 예산으로 경쟁 강도 파악</h2>
<p>예정가격이 <strong>1억 미만</strong>이면 중소기업 제한 경쟁이 많아 경쟁이 치열합니다. <strong>5억 이상</strong>이면 참여 업체가 줄어들고, 기술력 중심 평가 비중이 높아집니다.</p>
<ul>
<li><strong>1억 미만</strong>: 가격 경쟁 비중 높음 → 가격제안서 전략이 핵심</li>
<li><strong>1~5억</strong>: 기술:가격 = 6:4 또는 7:3 → 기술제안서 품질 중요</li>
<li><strong>5억 이상</strong>: 기술 중심 평가 → 유사 실적과 기술 차별화가 핵심</li>
</ul>
<h2>포인트 2: 참가 자격 조건에서 "진짜 대상"을 읽기</h2>
<p>참가 자격 조건은 단순한 자격 필터가 아닙니다. 발주기관이 <strong>어떤 유형의 업체를 원하는지</strong> 드러내는 단서입니다.</p>
<ul>
<li><strong>"정보통신 공사업 등록"</strong> → 하드웨어 + 네트워크 포함 사업</li>
<li><strong>"소프트웨어사업자 신고"</strong> → 순수 소프트웨어 개발 사업</li>
<li><strong>"유사 실적 3건 이상"</strong> → 신규 업체 배제 의도, 기존 업체 선호</li>
<li><strong>"지역 제한 없음"</strong> → 전국 업체 참여 가능, 경쟁 치열</li>
<li><strong>"OO시 소재 업체"</strong> → 지역 업체 우대, 가점 확인 필수</li>
</ul>
<h2>포인트 3: 평가 기준표 — 배점이 전략이다</h2>
<p>평가 기준표는 제안서 작성의 <strong>설계도</strong>입니다.</p>
<table>
<thead><tr><th>배점 패턴</th><th>의미</th><th>전략</th></tr></thead>
<tbody>
<tr><td>기술 70 : 가격 30</td><td>기술 중시</td><td>기능명세서, 아키텍처에 집중</td></tr>
<tr><td>기술 60 : 가격 40</td><td>균형형</td><td>기술 + 가격 모두 최적화</td></tr>
<tr><td>기술 50 : 가격 50</td><td>가격 중시</td><td>적정 기술 수준 + 공격적 가격</td></tr>
</tbody>
</table>
<p><strong>핵심:</strong> 기술 배점이 높으면 제안서 품질에, 가격 배점이 높으면 원가 분석에 시간을 투자하세요.</p>
<h2>포인트 4: 제안요청서(RFP) 첨부파일 꼼꼼히 보기</h2>
<p>많은 업체가 공고문 본문만 보고 RFP 첨부파일을 대충 넘깁니다. 하지만 <strong>진짜 요구사항은 RFP에 있습니다.</strong></p>
<ul>
<li><strong>기능 요구사항 목록</strong>: 제안서에 빠짐없이 반영해야 할 체크리스트</li>
<li><strong>기술 환경</strong>: 기존 시스템과의 연동 요구사항 (호환성 이슈)</li>
<li><strong>산출물 목록</strong>: 납품해야 할 문서 리스트 (설계서, 매뉴얼, 소스코드 등)</li>
<li><strong>일정 계획</strong>: 착수 → 중간보고 → 검수 일정 (납기 압박 여부 확인)</li>
</ul>
<h2>포인트 5: 질의응답 기간을 적극 활용하기</h2>
<p>입찰 공고 후 <strong>질의응답 기간</strong>이 있습니다. 이때 전략적 질문을 하면 경쟁사보다 유리한 정보를 얻을 수 있습니다.</p>
<ul>
<li><strong>요구사항 명확화</strong>: "RFP 3.2항의 '실시간 연동'은 동기 방식인지 비동기 방식인지?"</li>
<li><strong>범위 확인</strong>: "데이터 마이그레이션 대상 테이블 수와 예상 데이터량?"</li>
<li><strong>기존 환경 확인</strong>: "현재 운영 중인 서버 사양과 OS 버전?"</li>
</ul>
<p>질의응답 결과는 <strong>모든 참여 업체에 공개</strong>되므로, 너무 노골적인 질문은 피하되 실질적인 정보를 얻는 질문을 하세요.</p>
<h2>프리세일즈 활용 팁</h2>
<p>프리세일즈의 <strong>입찰 분석 컨설팅</strong>을 이용하면 전문가가 공고 분석부터 제안 전략 수립까지 함께합니다. 처음 공공조달에 참여하는 기업이라면, 한 번의 컨설팅이 수주 확률을 크게 높여줍니다.</p>`
    }
  ];

  let success = 0;
  for (const post of posts) {
    const res = await fetch(BASE + "/rest/v1/blog_posts", {
      method: "POST",
      headers: {
        apikey: ANON,
        Authorization: "Bearer " + access_token,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(post)
    });
    const data = await res.json();
    if (res.status === 201) {
      console.log("OK:", data[0].title.substring(0, 35) + "... (id:" + data[0].id + ")");
      success++;
    } else {
      console.log("FAIL:", res.status, JSON.stringify(data).substring(0, 200));
    }
  }
  console.log("\n" + success + "/3 posts created");
}
createPosts();
