// 마감일 값이 "2026-08-06" 또는 "2026-08-06T15:00:00.000Z"(레거시) 둘 다 들어올 수 있어
// 화면 표시용으로는 항상 날짜 부분만 보여준다
export function dateOnly(value) {
  if (!value) return value
  return String(value).slice(0, 10)
}
