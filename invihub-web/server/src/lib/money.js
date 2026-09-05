export function round2(n) {
  return Math.round(n * 100) / 100
}

export async function computeCartTotals(items, settings) {
  const subtotal = round2(items.reduce((s, i) => s + i.product.price * i.quantity, 0))
  const discount = 0
  const afterDiscount = Math.max(0, subtotal - discount)
  const shipping = afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingCharge
  const tax = round2(afterDiscount * (settings.taxRate / 100))
  const total = round2(afterDiscount + shipping + tax)
  return { subtotal, discount, shipping, tax, total }
}
