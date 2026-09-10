import {
  corsHeaders,
  json,
  err,
  serviceClient,
  mockPaymentsAllowed,
  getSettings,
  sendMockEmail,
} from '../_shared/helpers.ts'

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || ''
  if (!rawBody || !signature || !secret) return false
  const expected = await hmacSha256Hex(secret, rawBody)
  return timingSafeEqual(expected, String(signature))
}

Deno.serve(async (req) => {
  // Razorpay server webhooks have no browser Origin — do not apply browser CORS gate.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return err(req, 'Method not allowed', 405)
  }

  try {
    const mode = Deno.env.get('PAYMENT_MODE') || 'mock'
    if (mockPaymentsAllowed() || mode !== 'live') {
      return err(req, 'Invalid webhook signature', 400)
    }

    const raw = await req.text()
    const sig = req.headers.get('x-razorpay-signature') || ''
    if (!raw || !(await verifyRazorpayWebhook(raw, sig))) {
      return err(req, 'Invalid webhook signature', 400)
    }

    let body: any = {}
    try {
      body = JSON.parse(raw)
    } catch {
      return err(req, 'Invalid JSON body', 400)
    }

    const orderId =
      body?.orderId ||
      body?.payload?.payment?.entity?.notes?.orderId ||
      body?.payload?.order?.entity?.notes?.orderId
    if (!orderId) return err(req, 'Missing orderId', 400)

    const sb = serviceClient()
    const { data: order } = await sb
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return err(req, 'Order not found', 404)

    const paymentId =
      body?.payload?.payment?.entity?.id || `rzp_${order.id}`

    const { data: fulfilled, error } = await sb.rpc('fulfill_paid_order', {
      p_order_id: order.id,
      p_gateway_payment_id: paymentId,
    })
    if (error) return err(req, error.message, 500)

    if (!fulfilled?.alreadyPaid) {
      await sendMockEmail('order_confirmation', {
        to: order.shipping_email,
        orderNumber: order.order_number,
      })
    }

    const settings = await getSettings(sb)
    return json(req, fulfilled || {
      alreadyPaid: false,
      orderNumber: order.order_number,
      payment: 'Successful',
      estimatedDelivery: {
        min: settings.estimatedDeliveryDaysMin,
        max: settings.estimatedDeliveryDaysMax,
      },
    })
  } catch (e: any) {
    console.error(e)
    return err(req, e?.message || 'Server error', 500)
  }
})
