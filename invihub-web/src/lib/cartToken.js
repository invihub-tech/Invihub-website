/** Opaque cart token in localStorage (hash stored server-side). */
const CART_KEY = 'invi_cart_token'

export function getCartToken() {
  try {
    let t = localStorage.getItem(CART_KEY)
    if (!t) {
      t = crypto.randomUUID()
      localStorage.setItem(CART_KEY, t)
    }
    return t
  } catch {
    return crypto.randomUUID()
  }
}

export function clearCartToken() {
  try {
    localStorage.removeItem(CART_KEY)
  } catch {
    /* ignore */
  }
}
