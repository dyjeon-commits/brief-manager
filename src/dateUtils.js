// 마감일 값이 "2026-08-06" 또는 "2026-08-06T15:00:00.000Z"(레거시) 둘 다 들어올 수 있어
// 구글시트가 날짜 문자열을 셀에 쓸 때 한국시간 자정 기준으로 해석해서 UTC로 저장하기 때문에,
// 시간이 붙은 값은 그대로 잘라내면 하루 전 날짜가 나온다 — 9시간을 더해 한국 날짜로 복원한다
export function dateOnly(value) {
  if (!value) return value
  const str = String(value)
  if (!str.includes('T')) return str.slice(0, 10)
  const d = new Date(str)
  if (isNaN(d.getTime())) return str.slice(0, 10)
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// 정산 월(YYYY-MM) 계산 — approved_at은 UTC ISO 그대로라 자정 근처(한국시간 09시 이전)에
// 승인하면 UTC 날짜가 하루 전일 수 있다. dateOnly와 동일하게 9시간을 보정해 한국 기준 월을 구한다.
export function monthKey(value) {
  const d = value ? new Date(value) : new Date()
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 7)
}
