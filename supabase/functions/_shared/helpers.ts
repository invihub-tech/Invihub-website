import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const DEFAULT_ALLOWED_ORIGINS = [
  'https://invihub.com',
  'https://www.invihub.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
  'http://localhost:3000',
]

function isPermittedOrigin(origin: string, envAllowed: string[]): boolean {
  if (!origin) return true
  if (DEFAULT_ALLOWED_ORIGINS.includes(origin)) return true
  if (envAllowed.includes(origin)) return true
  try {
    const u = new URL(origin)
    const host = u.hostname.toLowerCase()
    if (host === 'invihub.com' || host.endsWith('.invihub.com')) return true
    if (host === 'localhost' || host === '127.0.0.1') return true
    if (
      host === 'invihub.pages.dev' ||
      host.endsWith('.invihub.pages.dev') ||
      host === 'invihub-web.invihub.workers.dev' ||
      host.endsWith('.invihub.workers.dev')
    ) {
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function originAllowed(req: Request) {
  const allowed = String(Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('Origin') || ''
  return isPermittedOrigin(origin, allowed)
}

export function corsHeaders(req: Request) {
  const allowed = String(Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('Origin') || ''
  const ok = isPermittedOrigin(origin, allowed)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cart-token, x-order-access-token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
    Vary: 'Origin',
  }
  if (ok && origin) {
    headers['Access-Control-Allow-Origin'] = origin
  } else if (!origin) {
    headers['Access-Control-Allow-Origin'] = '*'
  }
  return headers
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

export function err(req: Request, message: string, status = 400) {
  return json(req, { error: message }, status)
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function userClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const auth = req.headers.get('Authorization') || ''
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export const DEFAULT_SETTINGS = {
  storeName: 'INVIHUB Shop',
  email: 'invihub@gmail.com',
  phone: '7022149521',
  shippingCharge: 100,
  freeShippingThreshold: 5000,
  taxRate: 18,
  estimatedDeliveryDaysMin: 5,
  estimatedDeliveryDaysMax: 10,
  maintenance: false,
}

export const ONLINE_METHODS = new Set(['RAZORPAY', 'UPI'])
export const ALL_PAYMENT_METHODS = ['RAZORPAY', 'UPI', 'BANK']
export const DEFAULT_PAYMENT_METHODS = ['RAZORPAY']

export function parsePaymentMethods(json: string | null | undefined) {
  try {
    const list = JSON.parse(json || '[]')
    const allowed = new Set(ALL_PAYMENT_METHODS)
    const clean = (Array.isArray(list) ? list : []).filter((id: string) => allowed.has(id))
    return clean.length ? clean : [...DEFAULT_PAYMENT_METHODS]
  } catch {
    return [...DEFAULT_PAYMENT_METHODS]
  }
}

export function intersectPaymentMethods(products: { payment_methods_json?: string }[]) {
  if (!products?.length) return []
  return products.reduce((acc: string[], p) => {
    const methods = new Set(parsePaymentMethods(p.payment_methods_json))
    return acc.filter((id) => methods.has(id))
  }, parsePaymentMethods(products[0].payment_methods_json))
}

export function computeCartTotals(
  items: { quantity: number; product: { id?: string; price: number; category_id?: string; category_ids_json?: any } }[],
  settings: typeof DEFAULT_SETTINGS,
  coupon?: any,
) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.product.price) || 0) * (Number(i.quantity) || 1), 0))
  let discount = 0
  let eligibleSubtotal = 0

  if (coupon) {
    const appliesTo = coupon.applies_to || coupon.appliesTo || 'ALL'
    const productIds: string[] = Array.isArray(coupon.product_ids_json || coupon.productIds)
      ? (coupon.product_ids_json || coupon.productIds)
      : []
    const categoryIds: string[] = Array.isArray(coupon.category_ids_json || coupon.categoryIds)
      ? (coupon.category_ids_json || coupon.categoryIds)
      : []
    const evalMode = coupon.evaluation_mode || coupon.evaluationMode || 'OR'

    for (const item of items) {
      const p = item.product || {}
      const pid = p.id
      const pCats: string[] = []
      if (p.category_id) pCats.push(p.category_id)
      try {
        const parsed = typeof p.category_ids_json === 'string' ? JSON.parse(p.category_ids_json) : p.category_ids_json
        if (Array.isArray(parsed)) pCats.push(...parsed)
      } catch {}

      let isEligible = false
      if (appliesTo === 'ALL') {
        isEligible = true
      } else if (appliesTo === 'PRODUCTS') {
        isEligible = Boolean(pid && productIds.includes(pid))
      } else if (appliesTo === 'CATEGORIES') {
        isEligible = pCats.some((c) => categoryIds.includes(c))
      } else if (appliesTo === 'COMBINED') {
        const prodMatch = Boolean(pid && productIds.includes(pid))
        const catMatch = pCats.some((c) => categoryIds.includes(c))
        isEligible = evalMode === 'AND' ? (prodMatch && catMatch) : (prodMatch || catMatch)
      }

      if (isEligible) {
        eligibleSubtotal += (Number(p.price) || 0) * (Number(item.quantity) || 1)
      }
    }

    eligibleSubtotal = round2(eligibleSubtotal)

    if (eligibleSubtotal > 0) {
      const discountType = String(coupon.discount_type || coupon.discountType || '').toUpperCase()
      const discountVal = Number(coupon.discount_value || coupon.discountValue || 0)

      if (discountType === 'PERCENTAGE') {
        let calc = round2((eligibleSubtotal * discountVal) / 100)
        const maxCap = Number(coupon.max_discount_amount || coupon.maxDiscountAmount || 0)
        if (maxCap > 0 && calc > maxCap) calc = maxCap
        discount = Math.min(eligibleSubtotal, calc)
      } else if (discountType === 'FIXED') {
        discount = Math.min(eligibleSubtotal, discountVal)
      }
    }
  }

  discount = round2(discount)
  const afterDiscount = Math.max(0, subtotal - discount)
  const shipping = afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingCharge

  // Reverse-GST Calculation (entered product MRP is GST-inclusive at 18%):
  // Base Price = MRP / 1.18
  // Product 18% GST = MRP - Base Price (split equally: 9% CGST + 9% SGST)
  const productBase = round2(afterDiscount / 1.18)
  const productTax = round2(afterDiscount - productBase)
  const productCgst = round2(productTax / 2)
  const productSgst = round2(productTax - productCgst)

  // Delivery GST (5%) split into CGST (2.5%) and SGST (2.5%)
  const deliveryCgst = shipping > 0 ? round2(shipping * 0.025) : 0
  const deliverySgst = shipping > 0 ? round2(shipping * 0.025) : 0
  const deliveryTax = round2(deliveryCgst + deliverySgst)

  const cgst = round2(productCgst + deliveryCgst)
  const sgst = round2(productSgst + deliverySgst)
  const tax = round2(cgst + sgst)
  // Grand Total = MRP (which already includes product GST) + shipping + delivery GST
  const total = round2(afterDiscount + shipping + deliveryTax)

  return {
    subtotal,
    discount,
    shipping,
    productBase,
    productCgst,
    productSgst,
    productTax,
    deliveryCgst,
    deliverySgst,
    deliveryTax,
    cgst,
    sgst,
    tax,
    total,
    eligibleSubtotal,
  }
}

export function serializeProduct(p: any) {
  if (!p) return null
  const images = (p.product_images || p.images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)
  const specs = p.product_specifications || p.specifications || []
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    shortDescription: p.short_description,
    description: p.description,
    features: JSON.parse(p.features_json || '[]'),
    tags: JSON.parse(p.tags_json || '[]'),
    price: p.price,
    mrp: p.mrp,
    discount: p.discount,
    taxRate: p.tax_rate,
    stock: p.stock,
    lowStockThreshold: p.low_stock_threshold,
    status: p.status,
    isFeatured: p.is_featured,
    isNew: p.is_new,
    isBestSeller: p.is_best_seller,
    allowCustomization: Boolean(p.allow_customization),
    paymentMethods: parsePaymentMethods(p.payment_methods_json),
    ratingAverage: Number(p.rating_average || 0),
    ratingCount: Number(p.rating_count || 0),
    category: p.categories
      ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
      : p.category
        ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
        : null,
    categoryIds: (() => {
      try {
        const arr = typeof p.category_ids_json === 'string' ? JSON.parse(p.category_ids_json) : (p.category_ids_json || [])
        if (Array.isArray(arr) && arr.length > 0) return arr
      } catch {}
      return p.category_id ? [p.category_id] : []
    })(),
    images: images.map((i: any) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      isPrimary: i.is_primary,
    })),
    specifications: specs.map((s: any) => ({ id: s.id, name: s.name, value: s.value })),
    parts: (() => {
      try {
        return typeof p.parts_json === 'string' ? JSON.parse(p.parts_json) : (p.parts_json || [])
      } catch {
        return []
      }
    })(),
    trustBadges: (() => {
      try {
        if (p.trust_badges_json) {
          const arr = typeof p.trust_badges_json === 'string' ? JSON.parse(p.trust_badges_json) : p.trust_badges_json
          if (Array.isArray(arr)) return arr
        }
      } catch {}
      try {
        const tags = typeof p.tags_json === 'string' ? JSON.parse(p.tags_json) : (p.tags_json || [])
        const badgeTags = (tags || [])
          .filter((t: string) => typeof t === 'string' && t.startsWith('badge:'))
          .map((t: string) => t.slice(6))
        if (badgeTags.length > 0) return badgeTags
      } catch {}
      return []
    })(),
    inStock: p.stock > 0,
  }
}

export function serializeCart(cart: any) {
  return {
    id: cart.id,
    items: (cart.cart_items || []).map((item: any) => {
      const prodRaw = item.products || item.product || {}
      const product = serializeProduct(prodRaw)
      const unitPrice = Number(product.price ?? prodRaw.price ?? 0)
      const quantity = Number(item.quantity || 1)
      const lineTotal = unitPrice * quantity
      return {
        id: item.id,
        productId: product.id || prodRaw.id || item.product_id,
        name: product.name || prodRaw.name || 'Product',
        unitPrice,
        lineTotal,
        imageUrl: product.images?.[0]?.url || '',
        quantity,
        product,
      }
    }),
  }
}

export function publicOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    createdAt: order.created_at,
    shippingName: order.shipping_name,
    shippingCity: order.shipping_city,
    shippingState: order.shipping_state,
    items: (order.order_items || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
  }
}

export function mockPaymentsAllowed() {
  const mode = Deno.env.get('PAYMENT_MODE') || 'mock'
  if (mode === 'live') return false
  if (Deno.env.get('NODE_ENV') === 'production') {
    return Deno.env.get('ALLOW_MOCK_PAYMENTS') === 'true'
  }
  return true
}

export async function getSettings(sb: ReturnType<typeof serviceClient>) {
  const { data } = await sb.from('store_settings').select('json').eq('id', 'default').maybeSingle()
  if (!data?.json) return { ...DEFAULT_SETTINGS }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data.json) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function getAuthUser(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const sb = userClient(req)
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function requireAdmin(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return { error: err(req, 'Unauthorized', 401) }
  const sb = serviceClient()
  const { data } = await sb.from('admin_roles').select('*').eq('user_id', user.id).maybeSingle()
  if (!data) return { error: err(req, 'Unauthorized', 401) }
  return { user, admin: data, sb }
}

export async function requireCustomer(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return { error: err(req, 'Unauthorized', 401) }
  const sb = serviceClient()
  const { data } = await sb.from('customers').select('*').eq('id', user.id).maybeSingle()
  if (!data) return { error: err(req, 'Unauthorized', 401) }
  return { user, customer: data, sb }
}

/** Order access token TTL: 365 days (revisit without relying on email delivery). */
export const ORDER_ACCESS_TTL_MS = 365 * 24 * 60 * 60 * 1000

export function nextOrderNumber() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const r = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `INV-${y}${m}${day}-${r}`
}

export async function sendMockEmail(event: string, payload: Record<string, unknown>) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
  if (resendApiKey) {
    try {
      const toEmail = String(payload.to || '')
      const orderNumber = String(payload.orderNumber || payload.requestNumber || '')
      if (toEmail) {
        const fromEmail = Deno.env.get('EMAIL_FROM') || 'INVIHUB <orders@invihub.com>'
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            reply_to: ['invihub@gmail.com'],
            subject:
              event === 'order_confirmation'
                ? `Order Confirmation - ${orderNumber}`
                : `INVIHUB Notification - ${orderNumber}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <h2 style="color: #ea580c;">INVIHUB Order Update</h2>
                <p>Hello,</p>
                <p>Thank you for your order. We have received confirmation for your reference: <strong>${orderNumber}</strong>.</p>
                <p>You can track the progress of your order or custom print request anytime directly in your INVIHUB account or order tracking page.</p>
                <p style="margin-top: 24px; font-size: 12px; color: #64748b;">INVIHUB — Interact, Innovate, Inspire</p>
              </div>
            `,
          }),
        })
        if (res.ok) {
          const resData = await res.json()
          console.log('[email:resend]', event, resData.id)
          return { ok: true, provider: 'resend', id: resData.id }
        }
      }
    } catch (e: any) {
      console.error('[email:resend:error]', e?.message)
    }
  }

  console.log('[email:mock]', event, JSON.stringify(payload))
  return { ok: true, provider: 'mock' }
}
