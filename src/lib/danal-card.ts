import crypto from 'crypto'
import iconv from 'iconv-lite'

export type DanalCardConfig = {
  cpid: string
  cryptoKey: string
  cryptoIv: string
  txUrl: string
  enabled: boolean
}

export type DanalCardResponse = Record<string, string>

const DANAL_CARD_TX_URL = 'https://tx-creditcard.danalpay.com/credit/'
const DANAL_CARD_FIXED_IV = 'd7d02c92cb930b661f107cb92690fc83'

function firstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

function isHex(value: string, length: number) {
  return value.length === length && /^[0-9a-f]+$/i.test(value)
}

export function getDanalCardConfig(): DanalCardConfig {
  const cpid = firstEnv(['DANAL_CARD_CPID', 'DANAL_MERCHANT_ID'])
  const cryptoKey = firstEnv(['DANAL_CARD_CRYPTO_KEY', 'DANAL_AUTH_KEY'])
  const cryptoIv = DANAL_CARD_FIXED_IV
  const enabledFlag = firstEnv(['DANAL_CARD_ENABLED', 'DANAL_ENABLED'])
  const txUrl = firstEnv(['DANAL_CARD_TX_URL']) || DANAL_CARD_TX_URL
  const enabled = enabledFlag !== 'false'
    && /^\d{10}$/.test(cpid)
    && isHex(cryptoKey, 64)
    && isHex(cryptoIv, 32)

  return { cpid, cryptoKey, cryptoIv, txUrl, enabled }
}

function encodeEucKrValue(value: string) {
  const bytes = iconv.encode(value, 'euc-kr')
  let encoded = ''
  for (const byte of bytes) {
    const char = String.fromCharCode(byte)
    if (/^[A-Za-z0-9._~-]$/.test(char)) {
      encoded += char
    } else {
      encoded += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
    }
  }
  return encoded
}

function decodeEucKrValue(value: string) {
  const bytes: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]
    if (char === '%' && i + 2 < value.length && /^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(value.slice(i + 1, i + 3), 16))
      i += 2
    } else if (char === '+') {
      bytes.push(0x20)
    } else {
      bytes.push(char.charCodeAt(0))
    }
  }
  return iconv.decode(Buffer.from(bytes), 'euc-kr')
}

function buildDanalQuery(params: Record<string, string | number | null | undefined>) {
  const pairs: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    pairs.push(`${key}=${encodeEucKrValue(String(value))}`)
  }
  return pairs.join('&')
}

export function parseDanalQuery(query: string): DanalCardResponse {
  const result: DanalCardResponse = {}
  for (const pair of query.split('&')) {
    if (!pair) continue
    const separator = pair.indexOf('=')
    const key = separator >= 0 ? pair.slice(0, separator) : pair
    const value = separator >= 0 ? pair.slice(separator + 1) : ''
    result[key.trim()] = decodeEucKrValue(value.trim())
  }
  return result
}

function encryptDanal(config: DanalCardConfig, plainText: string) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(config.cryptoKey, 'hex'),
    Buffer.from(config.cryptoIv, 'hex'),
  )
  return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]).toString('base64')
}

export function decryptDanal(config: DanalCardConfig, encryptedText: string) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config.cryptoKey, 'hex'),
    Buffer.from(config.cryptoIv, 'hex'),
  )
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('ascii')
}

export function decryptDanalResponse(config: DanalCardConfig, encryptedText: string) {
  return parseDanalQuery(decryptDanal(config, encryptedText))
}

export async function sendDanalCardTx(
  config: DanalCardConfig,
  params: Record<string, string | number | null | undefined>,
) {
  if (!config.enabled) throw new Error('Danal card payment is not configured')

  const encryptedData = encryptDanal(config, buildDanalQuery(params))
  const body = new URLSearchParams({ CPID: config.cpid, DATA: encryptedData }).toString()
  const res = await fetch(config.txUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=euc-kr',
    },
    body,
    cache: 'no-store',
  })
  const text = await res.text()
  const response = new URLSearchParams(text)
  const data = response.get('DATA')
  if (!data) return parseDanalQuery(text)
  return decryptDanalResponse(config, data)
}

export function limitEucKrText(value: string, maxBytes: number) {
  const cleaned = value.replace(/[&'"\\<>|\r\n,+]/g, ' ').replace(/\s+/g, ' ').trim()
  let result = ''
  let length = 0
  for (const char of cleaned) {
    const size = iconv.encode(char, 'euc-kr').length
    if (length + size > maxBytes) break
    result += char
    length += size
  }
  return result || 'presales'
}
