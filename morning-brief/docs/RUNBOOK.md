# 모닝브리프 운영 매뉴얼

## 정상 흐름 (매일)

| 시간 (KST) | 시간 (UTC) | 작업 | 위치 |
|------------|-----------|------|------|
| 06:50 | 21:50 (전날) | Vercel Cron → `/api/cron/morning-brief/collect` | presales |
| 06:50~07:00 | | Google News RSS 5카테고리 수집, dedup, news_items INSERT, briefs ready | presales |
| 07:00 | 22:00 (전날) | Vercel Cron → `/api/cron/morning-brief/send` | presales |
| 07:00~07:05 | | active 구독자 전체에게 메일플러그 SMTP 발송, brief_sends 기록 | presales |

## 장애 시 점검 순서

### 1. 메일이 안 왔다는 신고

```
1. Supabase morning-brief → briefs 테이블에서 오늘 날짜 row 조회
   - 없음     → Cron이 안 돌았음. Vercel 대시보드 cron 로그 확인
   - status=collecting  → collect 단계 실패 가능성. /api/cron/morning-brief/collect 수동 호출 + 로그
   - status=ready       → send 단계 실패. /api/cron/morning-brief/send 수동 호출 + 로그
   - status=sent     → brief_sends에서 해당 구독자 찾아서 status/error 확인
   - status=failed   → briefs.error 필드 확인
2. 메일플러그 SMTP 응답 코드 확인 (5xx면 외부 장애)
```

### 2. 구독자가 안 들어옴

```
1. 사이트 /api/brief/subscribe POST → 200 OK 인지
2. Supabase subscribers 테이블 조회
3. RLS 정책 확인 (anon 키로 INSERT 허용되어 있는지)
4. CORS 에러면 사이트 도메인을 Supabase 프로젝트 settings → API → CORS 에 추가
```

### 3. Vercel Cron이 안 도는 듯

```
1. Vercel 대시보드 → Project → Settings → Cron Jobs 활성 확인
2. MB_CRON_SECRET 환경변수 일치 확인
3. /api/cron/morning-brief/collect 직접 GET (Authorization 헤더와 함께) → 200 확인
```

## 수동 발송 절차 (긴급 / 누락분 복구)

```bash
# 1. 오늘 날짜 수집 다시 실행 (collect route 는 현재 KST 오늘 기준)
curl -X POST "https://presales-zeta.vercel.app/api/cron/morning-brief/collect" \
  -H "Authorization: Bearer $MB_CRON_SECRET"

# 2. 특정 날짜 발송
curl -X POST "https://presales-zeta.vercel.app/api/cron/morning-brief/send?date=2026-04-26" \
  -H "Authorization: Bearer $MB_CRON_SECRET"
```

## 백업

morning-brief 프로젝트도 Supabase 일일 백업 대상에 포함시킨다 (NAS 폐기 후 새 백업 위치 결정 필요).

## 비용 모니터링

- Supabase Pro: morning-brief 추가로 월 +$10
- Claude Haiku (dedup): 메모리에 따라 유료 API 허용된 유일한 용도. 일 사용량 모니터링.
- 메일플러그 SMTP: 발송 건수 기준 요금 (구독자 증가 시 모니터링)
