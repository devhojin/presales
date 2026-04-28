import { sanitizeRedirect } from './safe-redirect'

export type OAuthSource = 'login' | 'signup'

export function buildOAuthCallbackUrl(
  origin: string,
  next: string | null | undefined,
  source: OAuthSource,
): string {
  const callbackUrl = new URL('/auth/callback', origin)
  callbackUrl.searchParams.set('next', sanitizeRedirect(next, '/mypage'))
  callbackUrl.searchParams.set('source', source)
  return callbackUrl.toString()
}
