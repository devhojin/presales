import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeByToken } from '../../../../../morning-brief/lib/subscribe'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  const result = await unsubscribeByToken(token)
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === '토큰이 필요합니다' ? 400 : 404 })
  }
  return NextResponse.json(result)
}
