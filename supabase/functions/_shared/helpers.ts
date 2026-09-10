import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function originAllowed(req: Request) {
  const allowed = String(Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('Origin') || ''
  // Non-browser / same-origin function invokes may omit Origin
  if (!origin) return true
  if (!allowed.length) return true
  return allowed.includes(origin)
}

export function corsHeaders(req: Request) {
  const allowed = String(Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req.headers.get('Origin') || ''
  const ok = !origin || !allowed.length || allowed.includes(origin)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cart-token, x-order-access-token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    Vary: 'Origin',
  }
  if (ok && origin) {
    headers['Access-Control-Allow-Origin'] = origin
  } else if (ok && !origin) {
    headers['Access-Control-Allow-Origin'] = '*'
  }
  // Do not reflect disallowed origins
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
export const ALL_PAYMENT_METHODS = ['RAZORPAY', 'UPI', 'COD', 'BANK']
export const DEFAULT_PAYMENT_METHODS = ['RAZORPAY', 'COD']

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
  items: { quantity: number; product: { price: number } }[],
  settings: typeof DEFAULT_SETTINGS,
) {
  const subtotal = round2(items.reduce((s, i) => s + i.product.price * i.quantity, 0))
  const discount = 0
  const afterDiscount = Math.max(0, subtotal - discount)
  const shipping = afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingCharge
  const tax = round2(afterDiscount * (settings.taxRate / 100))
  const total = round2(afterDiscount + shipping + tax)
  return { subtotal, discount, shipping, tax, total }
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
    paymentMethods: parsePaymentMethods(p.payment_methods_json),
    category: p.categories
      ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug }
      : p.category
        ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
        : null,
    images: images.map((i: any) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      isPrimary: i.is_primary,
    })),
    specifications: specs.map((s: any) => ({ id: s.id, name: s.name, value: s.value })),
    inStock: p.stock > 0,
  }
}

export function serializeCart(cart: any) {
  return {
    id: cart.id,
    items: (cart.cart_items || []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      product: serializeProduct(item.products || item.product),
    })),
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
  console.log('[email:mock]', event, JSON.stringify(payload))
  return { ok: true, provider: 'mock' }
}
