/**
 * 요청의 실제 클라이언트 IP 를 신뢰할 수 있는 소스에서 뽑아낸다.
 *
 * 공격 벡터:
 *   원시 `x-forwarded-for` 헤더를 그대로 rate-limit key 로 쓰면, 공격자가
 *   임의의 값을 프리펜드해서 매 요청마다 다른 버킷을 받아 rate limit 을
 *   우회할 수 있다 (운영 프록시가 원래 IP 를 헤더 왼쪽 끝에 append 하는 경우
 *   왼쪽 끝 값은 공격자가 조작 가능).
 *
 * 정책:
 *   1) 운영 프록시가 직접 설정하는 `x-real-ip` 를 최우선 사용.
 *   2) 없으면 `x-forwarded-for` 의 *마지막* 항목 (가장 신뢰 가능한 홉) 을 사용.
 *   3) 둘 다 없으면 `'unknown'` — 이 경우 공통 버킷에 몰리므로
 *      개발/로컬 환경에서만 발생하도록 운영에서는 주의.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip')
  if (realIp && realIp.trim() !== '') return realIp.trim()

  const fwd = headers.get('x-forwarded-for')
  if (fwd && fwd.trim() !== '') {
    const parts = fwd.split(',').map((p) => p.trim()).filter(Boolean)
    // 가장 오른쪽 항목 = 운영 프록시에 가장 가까운 홉. 공격자가 직접 주입할 수 없다.
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return 'unknown'
}
