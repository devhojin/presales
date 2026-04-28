export function getAuthErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'oauth':
      return 'Google 인증에 실패했습니다. 다시 시도해주세요.'
    case 'deleted':
      return '탈퇴 처리된 계정입니다. 고객지원으로 문의해주세요.'
    case 'callback':
      return '인증 세션을 확인하지 못했습니다. 다시 로그인해주세요.'
    default:
      return ''
  }
}
