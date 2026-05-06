const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export function getKstStartOfDayIso(baseDate = new Date()) {
  const kstDate = new Date(baseDate.getTime() + KST_OFFSET_MS)
  const year = kstDate.getUTCFullYear()
  const month = kstDate.getUTCMonth()
  const date = kstDate.getUTCDate()

  return new Date(Date.UTC(year, month, date) - KST_OFFSET_MS).toISOString()
}

export function isOnOrAfterKstStartOfToday(value: string, baseDate = new Date()) {
  const targetTime = new Date(value).getTime()
  if (!Number.isFinite(targetTime)) return false

  const todayStartTime = new Date(getKstStartOfDayIso(baseDate)).getTime()
  return targetTime >= todayStartTime
}
