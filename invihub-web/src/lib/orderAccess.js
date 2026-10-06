/** Guest order access tokens — plaintext only in localStorage; server stores hash. */
const KEY = 'invi_order_access'

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/** @param {string} orderNumber @param {{ token: string, email?: string, expiresAt?: string }} data */
export function saveOrderAccess(orderNumber, data) {
  if (!orderNumber || !data?.token) return
  const map = readMap()
  map[orderNumber] = {
    token: data.token,
    email: data.email || map[orderNumber]?.email || '',
    expiresAt: data.expiresAt || null,
    savedAt: new Date().toISOString(),
  }
  writeMap(map)
}

export function getOrderAccess(orderNumber) {
  if (!orderNumber) return null
  return readMap()[orderNumber] || null
}

export function findOrderAccessToken(orderNumber) {
  return getOrderAccess(orderNumber)?.token || ''
}
