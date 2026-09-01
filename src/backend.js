const BASE_URL = 'https://script.google.com/macros/s/AKfycbyxnkXAlr6CUVLibAjn1vj5-Xb76apRadNjrcVrDeXYqnDtvmTkQbzSPlCEkLfwfpdAxw/exec'
const SECRET = import.meta.env.VITE_SHARED_SECRET

// 화면은 바로 바뀌고 저장은 뒤에서 진행되는 구조라, 저장이 끝나기 전에 새로고침/닫기를 하면
// 요청이 중간에 끊겨 실패하고 그 변경 내용이 저장되지 않는다.
// 저장 중인 요청이 있을 때는 브라우저가 나가기 전에 경고하도록 막는다.
const WRITE_ACTIONS = new Set(['insert', 'bulkInsert', 'update', 'delete', 'setJoin'])
let pendingWrites = 0

window.addEventListener('beforeunload', (e) => {
  if (pendingWrites > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
})

export async function call(action, payload = {}) {
  const isWrite = WRITE_ACTIONS.has(action)
  if (isWrite) pendingWrites++
  try {
    const url = new URL(BASE_URL)
    url.searchParams.set('secret', SECRET)
    url.searchParams.set('action', action)
    url.searchParams.set('payload', JSON.stringify(payload))
    const res = await fetch(url.toString())
    const json = await res.json()
    if (json.error) throw new Error(json.error)
    return json.result
  } finally {
    if (isWrite) pendingWrites--
  }
}
