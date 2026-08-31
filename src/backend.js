const BASE_URL = 'https://script.google.com/macros/s/AKfycbyxnkXAlr6CUVLibAjn1vj5-Xb76apRadNjrcVrDeXYqnDtvmTkQbzSPlCEkLfwfpdAxw/exec'
const SECRET = 'brief-manager-bc80507e30c938bf4af2f6799ae09540'

export async function call(action, payload = {}) {
  const url = new URL(BASE_URL)
  url.searchParams.set('secret', SECRET)
  url.searchParams.set('action', action)
  url.searchParams.set('payload', JSON.stringify(payload))
  const res = await fetch(url.toString())
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.result
}
