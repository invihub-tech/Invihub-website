import crypto from 'node:crypto'

export const RazorpayProvider = {
  name: 'razorpay',
  async createOrder({ order }) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || keyId.startsWith('dummy')) {
      throw Object.assign(new Error('Razorpay live keys not configured'), { status: 503 })
    }
    const auth = Buffer.from(`${keyId}:${secret}`).toString('base64')
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(order.total * 100),
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.id },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw Object.assign(new Error(data.error?.description || 'Razorpay error'), { status: 502 })
    return {
      provider: 'razorpay',
      status: 'CREATED',
      gatewayOrderId: data.id,
      client: { mode: 'razorpay', keyId, razorpayOrderId: data.id, amount: data.amount, currency: data.currency },
    }
  },
  async confirm() {
    throw Object.assign(new Error('Use webhook / signature verify'), { status: 400 })
  },
  verifyWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
    if (!rawBody || !signature || !secret) return false
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const a = Buffer.from(expected)
    const b = Buffer.from(String(signature))
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  },
}
