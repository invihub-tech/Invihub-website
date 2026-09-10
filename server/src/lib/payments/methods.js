export const PAYMENT_METHODS = [
  { id: 'RAZORPAY', label: 'Online (Razorpay / card)' },
  { id: 'UPI', label: 'UPI' },
  { id: 'COD', label: 'Cash on delivery' },
  { id: 'BANK', label: 'Bank transfer / NEFT' },
]

export const ONLINE_METHODS = new Set(['RAZORPAY', 'UPI'])

export const DEFAULT_PAYMENT_METHODS = ['RAZORPAY', 'COD']
export const ALL_PAYMENT_METHODS = PAYMENT_METHODS.map((m) => m.id)

export function parsePaymentMethods(json) {
  try {
    const list = JSON.parse(json || '[]')
    const allowed = new Set(ALL_PAYMENT_METHODS)
    const clean = list.filter((id) => allowed.has(id))
    return clean.length ? clean : [...DEFAULT_PAYMENT_METHODS]
  } catch {
    return [...DEFAULT_PAYMENT_METHODS]
  }
}

export function intersectPaymentMethods(products) {
  if (!products?.length) return []
  return products.reduce((acc, p) => {
    const methods = new Set(parsePaymentMethods(p.paymentMethodsJson))
    return acc.filter((id) => methods.has(id))
  }, parsePaymentMethods(products[0].paymentMethodsJson))
}
