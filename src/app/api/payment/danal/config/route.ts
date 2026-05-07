import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_METHODS = ['CARD', 'VACCOUNT', 'TRANSFER', 'KAKAO', 'NAVER', 'PAYCO']

function getFirstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

function parseMethods(raw: string) {
  const methods = raw
    .split(',')
    .map((method) => method.trim().toUpperCase())
    .filter(Boolean)
  return methods.length > 0 ? methods : DEFAULT_METHODS
}

function isDanalOneApiClientKey(value: string) {
  return /^CL_/i.test(value)
}

function isDanalOneApiSecretKey(value: string) {
  return /^SK_/i.test(value)
}

export async function GET() {
  const enabledFlag = getFirstEnv(['DANAL_ENABLED', 'NEXT_PUBLIC_DANAL_ENABLED'])
  const clientKey = getFirstEnv(['DANAL_CLIENT_KEY', 'NEXT_PUBLIC_DANAL_CLIENT_KEY'])
  const secretKey = getFirstEnv(['DANAL_SECRET_KEY'])
  const merchantId = getFirstEnv(['DANAL_MERCHANT_ID', 'NEXT_PUBLIC_DANAL_MERCHANT_ID'])
  const methods = parseMethods(getFirstEnv(['DANAL_METHODS', 'NEXT_PUBLIC_DANAL_METHODS']))
  const enabled = enabledFlag !== 'false'
    && isDanalOneApiClientKey(clientKey)
    && isDanalOneApiSecretKey(secretKey)
    && Boolean(merchantId)

  return NextResponse.json(
    {
      enabled,
      clientKey: enabled ? clientKey : '',
      merchantId: enabled ? merchantId : '',
      methods: enabled ? methods : [],
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
