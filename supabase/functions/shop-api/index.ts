import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  corsHeaders,
  originAllowed,
  json,
  err,
  serviceClient,
  sha256Hex,
  randomToken,
  ONLINE_METHODS,
  ALL_PAYMENT_METHODS,
  intersectPaymentMethods,
  computeCartTotals,
  serializeProduct,
  serializeCart,
  publicOrder,
  mockPaymentsAllowed,
  getSettings,
  getAuthUser,
  requireAdmin,
  requireCustomer,
  ORDER_ACCESS_TTL_MS,
  sendMockEmail,
} from '../_shared/helpers.ts'

const PRODUCT_EMBED =
  '*, product_images(*), product_specifications(*), categories(*)'
const CART_EMBED =
  `*, cart_items(*, products(${PRODUCT_EMBED}))`
const ORDER_EMBED = '*, order_items(*), payments(*)'

const lookupAttempts = new Map<string, { count: number; first: number }>()
const adminLoginAttempts = new Map<string, { count: number; first: number }>()

function parsePath(pathname: string) {
  let p = pathname
  for (const prefix of ['/functions/v1/shop-api', '/shop-api']) {
    if (p === prefix || p.startsWith(prefix + '/')) {
      p = p.slice(prefix.length) || '/'
      break
    }
  }
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p
}

function match(
  method: string,
  path: string,
  wantMethod: string,
  pattern: string,
): Record<string, string> | null {
  if (method !== wantMethod) return null
  const want = pattern.split('/').filter(Boolean)
  const got = path.split('/').filter(Boolean)
  if (want.length !== got.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(got[i])
    else if (want[i] !== got[i]) return null
  }
  return params
}

async function readBody(req: Request) {
  try {
    const text = await req.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return null
  }
}

function cartToken(req: Request) {
  return String(req.headers.get('x-cart-token') || '').trim()
}

function publicCustomer(c: any) {
  if (!c) return null
  return { id: c.id, name: c.name, email: c.email, phone: c.phone, registered: true }
}

function serializeAddress(a: any) {
  if (!a) return null
  return {
    id: a.id,
    customerId: a.customer_id,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pinCode: a.pin_code,
    isDefault: a.is_default,
  }
}

function serializeCategory(c: any, productCount?: number) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.image_url,
    sortOrder: c.sort_order,
    status: c.status,
    isFeatured: c.is_featured,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    productCount: productCount ?? c.productCount ?? 0,
    products: (c.products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      status: p.status,
    })),
  }
}

function serializeOrderAdmin(o: any) {
  const customer = o.customers || o.customer
  return {
    id: o.id,
    orderNumber: o.order_number,
    customerId: o.customer_id,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    tax: o.tax,
    total: o.total,
    paymentStatus: o.payment_status,
    orderStatus: o.order_status,
    shippingName: o.shipping_name,
    shippingEmail: o.shipping_email,
    shippingPhone: o.shipping_phone,
    shippingLine1: o.shipping_line1,
    shippingLine2: o.shipping_line2,
    shippingCity: o.shipping_city,
    shippingState: o.shipping_state,
    shippingPin: o.shipping_pin,
    stockReserved: o.stock_reserved,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items: (o.order_items || o.items || []).map((i: any) => ({
      id: i.id,
      productId: i.product_id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
    payments: (o.payments || []).map((p: any) => ({
      id: p.id,
      orderId: p.order_id,
      gateway: p.gateway,
      method: p.method,
      status: p.status,
      amount: p.amount,
      gatewayOrderId: p.gateway_order_id,
      gatewayPaymentId: p.gateway_payment_id,
      rawJson: p.raw_json,
      createdAt: p.created_at,
    })),
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          registered: true,
        }
      : null,
    accountType: customer ? 'Registered' : 'Guest',
  }
}

function productData(body: any) {
  return {
    name: body.name,
    slug: body.slug,
    sku: body.sku,
    category_id: body.categoryId,
    brand: body.brand || 'INVIHUB',
    short_description: body.shortDescription || '',
    description: body.description || '',
    features_json: JSON.stringify(body.features || []),
    tags_json: JSON.stringify(body.tags || []),
    price: Number(body.price),
    mrp: Number(body.mrp || body.price || 0),
    discount: Number(body.discount || 0),
    tax_rate: Number(body.taxRate || 18),
    stock: Number(body.stock || 0),
    low_stock_threshold: Number(body.lowStockThreshold || 5),
    allow_backorders: Boolean(body.allowBackorders),
    weight: Number(body.weight || 0),
    length: Number(body.length || 0),
    width: Number(body.width || 0),
    height: Number(body.height || 0),
    status: body.status || 'ACTIVE',
    is_featured: Boolean(body.isFeatured),
    is_new: Boolean(body.isNew),
    is_best_seller: Boolean(body.isBestSeller),
    payment_methods_json: JSON.stringify(body.paymentMethods),
  }
}

function parsedPaymentMethods(body: any) {
  const allowed = new Set(ALL_PAYMENT_METHODS)
  return [
    ...new Set(
      (Array.isArray(body.paymentMethods) ? body.paymentMethods : []).filter((id: string) =>
        allowed.has(id),
      ),
    ),
  ]
}

function assertRateLimit(
  map: Map<string, { count: number; first: number }>,
  key: string,
  max = 8,
  windowMs = 15 * 60 * 1000,
) {
  const rec = map.get(key)
  if (rec && rec.count >= max && Date.now() - rec.first < windowMs) {
    return false
  }
  return true
}

function recordRateLimit(
  map: Map<string, { count: number; first: number }>,
  key: string,
  windowMs = 15 * 60 * 1000,
) {
  const rec = map.get(key) || { count: 0, first: Date.now() }
  if (Date.now() - rec.first > windowMs) {
    rec.count = 0
    rec.first = Date.now()
  }
  rec.count += 1
  map.set(key, rec)
}

async function loadCartByToken(sb: ReturnType<typeof serviceClient>, token: string) {
  const token_hash = await sha256Hex(token)
  let { data: cart } = await sb.from('carts').select(CART_EMBED).eq('token_hash', token_hash).maybeSingle()
  if (!cart) {
    const { data: created, error } = await sb
      .from('carts')
      .insert({ token_hash })
      .select(CART_EMBED)
      .single()
    if (error) throw error
    cart = created
  }
  return cart
}

async function requireCart(req: Request, sb: ReturnType<typeof serviceClient>) {
  const token = cartToken(req)
  if (!token) {
    return { error: err(req, 'Cart token required. Mint a UUID in localStorage and send x-cart-token.', 400) }
  }
  const cart = await loadCartByToken(sb, token)
  return { cart, token }
}

async function cartPayload(req: Request, sb: ReturnType<typeof serviceClient>, cart: any) {
  const settings = await getSettings(sb)
  const items = (cart.cart_items || []).map((i: any) => ({
    quantity: i.quantity,
    product: i.products,
  }))
  const totals = computeCartTotals(items, settings)
  const count = items.reduce((s: number, i: any) => s + i.quantity, 0)
  const allowedPaymentMethods = intersectPaymentMethods(items.map((i: any) => i.product))
  return { cart: serializeCart(cart), totals, count, allowedPaymentMethods }
}

async function reloadCart(sb: ReturnType<typeof serviceClient>, cartId: string) {
  const { data } = await sb.from('carts').select(CART_EMBED).eq('id', cartId).single()
  return data
}

async function attachCartToCustomer(
  req: Request,
  sb: ReturnType<typeof serviceClient>,
  customerId: string,
) {
  const token = cartToken(req)
  if (!token) return
  const cart = await loadCartByToken(sb, token)
  await sb.from('carts').update({ customer_id: customerId }).eq('id', cart.id)
}

async function orderOwnedByRequest(req: Request, order: any) {
  const token = cartToken(req)
  if (token && order.checkout_token_hash) {
    const hash = await sha256Hex(token)
    if (hash === order.checkout_token_hash) return true
  }
  const user = await getAuthUser(req)
  if (user && order.customer_id && user.id === order.customer_id) return true
  return false
}

async function verifyOrderAccess(order: any, email: string, accessToken: string) {
  if (!order) return false
  if (String(order.shipping_email || '').toLowerCase() !== email.toLowerCase()) return false
  if (!accessToken || !order.access_token_hash) return false
  const hash = await sha256Hex(accessToken)
  if (hash !== order.access_token_hash) return false
  if (order.access_token_expires_at && new Date(order.access_token_expires_at).getTime() < Date.now()) {
    return false
  }
  return true
}

async function createPaymentForOrder(order: any) {
  const mode = Deno.env.get('PAYMENT_MODE') || 'mock'
  if (mode === 'live') {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID') || ''
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET') || ''
    if (!keyId || keyId.startsWith('dummy')) {
      const e: any = new Error('Razorpay live keys not configured')
      e.status = 503
      throw e
    }
    const auth = btoa(`${keyId}:${secret}`)
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(order.total * 100),
        currency: 'INR',
        receipt: order.order_number,
        notes: { orderId: order.id },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const e: any = new Error(data.error?.description || 'Razorpay error')
      e.status = 502
      throw e
    }
    return {
      provider: 'razorpay',
      status: 'CREATED',
      gatewayOrderId: data.id,
      client: {
        mode: 'razorpay',
        keyId,
        razorpayOrderId: data.id,
        amount: data.amount,
        currency: data.currency,
      },
    }
  }
  if (Deno.env.get('PAYMENT_MOCK_FAIL') === 'true') {
    return { provider: 'mock', status: 'FAILED', gatewayOrderId: '', client: { mode: 'mock', fail: true } }
  }
  return {
    provider: 'mock',
    status: 'CREATED',
    gatewayOrderId: `mock_${order.id}`,
    client: { mode: 'mock', orderId: order.id, amount: order.total },
  }
}

async function clearCartItems(sb: ReturnType<typeof serviceClient>, cartId: string) {
  await sb.from('cart_items').delete().eq('cart_id', cartId)
}

async function fulfillPaid(
  sb: ReturnType<typeof serviceClient>,
  order: any,
  gatewayPaymentId = '',
) {
  const { data, error } = await sb.rpc('fulfill_paid_order', {
    p_order_id: order.id,
    p_gateway_payment_id: gatewayPaymentId || `pay_mock_${order.id}`,
  })
  if (error) throw error
  return data
}

async function loadProduct(sb: ReturnType<typeof serviceClient>, id: string) {
  const { data } = await sb.from('products').select(PRODUCT_EMBED).eq('id', id).maybeSingle()
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    if (!originAllowed(req)) return new Response(null, { status: 403 })
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (!originAllowed(req)) {
    return err(req, 'Origin not allowed', 403)
  }

  const url = new URL(req.url)
  const path = parsePath(url.pathname)
  const method = req.method.toUpperCase()
  const sb = serviceClient()
  const q = Object.fromEntries(url.searchParams.entries())

  try {
    // Health (always allowed)
    if (match(method, path, 'GET', '/health')) {
      const settings = await getSettings(sb)
      return json(req, { ok: true, maintenance: Boolean(settings.maintenance) })
    }

    const settings = await getSettings(sb)
    if (settings.maintenance) {
      return json(req, { error: 'Store is under maintenance', maintenance: true }, 503)
    }

    // ---------- PUBLIC ----------
    if (match(method, path, 'GET', '/categories')) {
      const { data: rows } = await sb
        .from('categories')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('sort_order', { ascending: true })
      const list = (rows || []).filter((c: any) => c.name?.trim() && c.slug?.trim())
      const withCounts = await Promise.all(
        list.map(async (c: any) => {
          const { count } = await sb
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', c.id)
            .eq('status', 'ACTIVE')
          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            imageUrl: c.image_url,
            productCount: count || 0,
          }
        }),
      )
      return json(req, withCounts)
    }

    if (match(method, path, 'GET', '/products')) {
      let query = sb.from('products').select(`${PRODUCT_EMBED}, order_items(quantity)`).eq('status', 'ACTIVE')
      if (q.category) {
        const { data: cat } = await sb.from('categories').select('id').eq('slug', q.category).maybeSingle()
        if (cat) query = query.eq('category_id', cat.id)
        else query = query.eq('category_id', '__none__')
      }
      if (q.minPrice) query = query.gte('price', Number(q.minPrice))
      if (q.maxPrice) query = query.lte('price', Number(q.maxPrice))
      if (q.stock === 'in') query = query.gt('stock', 0)
      if (q.stock === 'out') query = query.lte('stock', 0)
      if (q.featured === '1') query = query.eq('is_featured', true)
      if (q.isNew === '1') query = query.eq('is_new', true)
      if (q.q) {
        const term = String(q.q).replace(/[%(),]/g, ' ').trim()
        if (term) {
          query = query.or(
            `name.ilike.%${term}%,sku.ilike.%${term}%,short_description.ilike.%${term}%,description.ilike.%${term}%,tags_json.ilike.%${term}%`,
          )
        }
      }
      if (q.sort === 'price_asc') query = query.order('price', { ascending: true })
      else if (q.sort === 'price_desc') query = query.order('price', { ascending: false })
      else if (q.sort === 'featured') query = query.order('is_featured', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      const { data: products, error } = await query
      if (error) return err(req, error.message, 500)
      let list = (products || []).map((p: any) => {
        const sold = (p.order_items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0)
        const { order_items: _oi, ...rest } = p
        return { ...serializeProduct(rest), sold }
      })
      if (q.sort === 'best') list = list.sort((a: any, b: any) => b.sold - a.sold)
      return json(req, list)
    }

    {
      const m = match(method, path, 'GET', '/products/:slug')
      if (m) {
        const { data: p } = await sb
          .from('products')
          .select(PRODUCT_EMBED)
          .eq('slug', m.slug)
          .maybeSingle()
        if (!p || p.status !== 'ACTIVE') return err(req, 'Not found', 404)
        const { data: related } = await sb
          .from('products')
          .select(PRODUCT_EMBED)
          .eq('status', 'ACTIVE')
          .eq('category_id', p.category_id)
          .neq('id', p.id)
          .limit(3)
        return json(req, {
          product: serializeProduct(p),
          related: (related || []).map(serializeProduct),
        })
      }
    }

    if (match(method, path, 'GET', '/search')) {
      const term = String(q.q || '').replace(/[%(),]/g, ' ').trim()
      if (!term) return json(req, [])
      const { data: products } = await sb
        .from('products')
        .select(PRODUCT_EMBED)
        .eq('status', 'ACTIVE')
        .or(
          `name.ilike.%${term}%,sku.ilike.%${term}%,short_description.ilike.%${term}%,description.ilike.%${term}%,tags_json.ilike.%${term}%`,
        )
        .limit(24)
      const { data: cats } = await sb
        .from('categories')
        .select('id')
        .ilike('name', `%${term}%`)
      let byCat: any[] = []
      if (cats?.length) {
        const { data } = await sb
          .from('products')
          .select(PRODUCT_EMBED)
          .eq('status', 'ACTIVE')
          .in(
            'category_id',
            cats.map((c: any) => c.id),
          )
          .limit(24)
        byCat = data || []
      }
      const map = new Map<string, any>()
      for (const p of [...(products || []), ...byCat]) map.set(p.id, p)
      return json(req, [...map.values()].slice(0, 24).map(serializeProduct))
    }

    if (match(method, path, 'GET', '/settings')) {
      return json(req, settings)
    }

    // ---------- CART ----------
    if (match(method, path, 'GET', '/cart')) {
      const loaded = await requireCart(req, sb)
      if ('error' in loaded && loaded.error) return loaded.error
      return json(req, await cartPayload(req, sb, loaded.cart))
    }

    if (match(method, path, 'POST', '/cart')) {
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const loaded = await requireCart(req, sb)
      if ('error' in loaded && loaded.error) return loaded.error
      const { productId, quantity = 1 } = body
      const product = await loadProduct(sb, productId)
      if (!product || product.status !== 'ACTIVE') return err(req, 'Product not found', 404)
      const qty = Math.max(1, Number(quantity) || 1)
      if (product.stock < qty && !product.allow_backorders) {
        return err(req, 'Insufficient stock')
      }
      const existing = (loaded.cart.cart_items || []).find((i: any) => i.product_id === productId)
      if (existing) {
        await sb.from('cart_items').update({ quantity: existing.quantity + qty }).eq('id', existing.id)
      } else {
        await sb.from('cart_items').insert({
          cart_id: loaded.cart.id,
          product_id: productId,
          quantity: qty,
        })
      }
      const cart = await reloadCart(sb, loaded.cart.id)
      return json(req, await cartPayload(req, sb, cart))
    }

    {
      const m = match(method, path, 'PUT', '/cart/:id')
      if (m) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const loaded = await requireCart(req, sb)
        if ('error' in loaded && loaded.error) return loaded.error
        const item = (loaded.cart.cart_items || []).find((i: any) => i.id === m.id)
        if (!item) return err(req, 'Item not found', 404)
        const quantity = Math.max(0, Number(body.quantity) || 0)
        if (quantity === 0) await sb.from('cart_items').delete().eq('id', item.id)
        else await sb.from('cart_items').update({ quantity }).eq('id', item.id)
        const cart = await reloadCart(sb, loaded.cart.id)
        return json(req, await cartPayload(req, sb, cart))
      }
    }

    {
      const m = match(method, path, 'DELETE', '/cart/:id')
      if (m) {
        const loaded = await requireCart(req, sb)
        if ('error' in loaded && loaded.error) return loaded.error
        const item = (loaded.cart.cart_items || []).find((i: any) => i.id === m.id)
        if (item) await sb.from('cart_items').delete().eq('id', item.id)
        const cart = await reloadCart(sb, loaded.cart.id)
        return json(req, await cartPayload(req, sb, cart))
      }
    }

    // ---------- CHECKOUT ----------
    if (match(method, path, 'POST', '/checkout')) {
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const name = String(body.name || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const phone = String(body.phone || '').trim()
      const line1 = String(body.line1 || '').trim()
      const line2 = String(body.line2 || '').trim()
      const city = String(body.city || '').trim()
      const state = String(body.state || '').trim()
      const pinCode = String(body.pinCode || '').trim()
      const paymentMethod = String(body.paymentMethod || '')
      if (name.length < 2) return err(req, 'Name is required')
      if (!email.includes('@')) return err(req, 'Valid email is required')
      if (phone.length < 8) return err(req, 'Phone is required')
      if (line1.length < 3) return err(req, 'Address is required')
      if (city.length < 2 || state.length < 2 || pinCode.length < 4) {
        return err(req, 'City, state, and PIN are required')
      }
      if (!ALL_PAYMENT_METHODS.includes(paymentMethod)) {
        return err(req, 'Invalid payment method')
      }

      const loaded = await requireCart(req, sb)
      if ('error' in loaded && loaded.error) return loaded.error
      const cart = loaded.cart
      const items = cart.cart_items || []
      if (!items.length) return err(req, 'Cart is empty')
      for (const item of items) {
        const p = item.products
        if (p.stock < item.quantity && !p.allow_backorders) {
          return err(req, `${p.name} is out of stock`)
        }
      }
      const allowed = intersectPaymentMethods(items.map((i: any) => i.products))
      if (!allowed.includes(paymentMethod)) {
        return err(
          req,
          allowed.length
            ? 'That payment method is not available for items in this cart'
            : 'No shared payment method for these products',
        )
      }

      let customerId: string | null = null
      const user = await getAuthUser(req)
      if (user) {
        const { data: cust } = await sb.from('customers').select('id').eq('id', user.id).maybeSingle()
        if (cust) customerId = cust.id
      }

      const online = ONLINE_METHODS.has(paymentMethod)
      if (online && Deno.env.get('PAYMENT_MOCK_FAIL') === 'true' && mockPaymentsAllowed()) {
        return json(req, { error: 'Payment failed (TEST)' }, 402)
      }

      // Authoritative totals + stock lock happen inside checkout_create_order RPC.
      // Build payment client payload after we know order id (mock/live).
      const accessToken = randomToken()
      const access_token_hash = await sha256Hex(accessToken)
      const access_token_expires_at = new Date(Date.now() + ORDER_ACCESS_TTL_MS).toISOString()
      const checkout_token_hash = await sha256Hex(loaded.token)

      const provisionalGateway = online
        ? mockPaymentsAllowed() || (Deno.env.get('PAYMENT_MODE') || 'mock') !== 'live'
          ? 'mock'
          : 'razorpay'
        : paymentMethod === 'COD'
          ? 'cod'
          : 'bank'

      const { data: created, error: checkoutErr } = await sb.rpc('checkout_create_order', {
        p_cart_id: cart.id,
        p_customer_id: customerId,
        p_checkout_token_hash: checkout_token_hash,
        p_access_token_hash: access_token_hash,
        p_access_token_expires_at: access_token_expires_at,
        p_shipping: {
          name,
          email,
          phone,
          line1,
          line2,
          city,
          state,
          pinCode,
        },
        p_payment_method: paymentMethod,
        p_payment_gateway: provisionalGateway,
        p_payment_status: 'PENDING',
        p_gateway_order_id: '',
        p_payment_client_json: '{}',
      })
      if (checkoutErr) {
        const msg = checkoutErr.message || 'Checkout failed'
        const status = /out of stock|empty|unavailable|Invalid/i.test(msg) ? 400 : 500
        return err(req, msg, status)
      }

      const orderId = created.orderId as string
      const orderNumber = created.orderNumber as string
      const totals = created.totals

      let payClient: any = { mode: paymentMethod.toLowerCase() }
      if (online) {
        try {
          const pay = await createPaymentForOrder({
            id: orderId,
            order_number: orderNumber,
            total: totals.total,
          })
          payClient = pay.client
          await sb
            .from('payments')
            .update({
              gateway: pay.provider,
              status: pay.status === 'FAILED' ? 'FAILED' : 'PENDING',
              gateway_order_id: pay.gatewayOrderId || '',
              raw_json: JSON.stringify(pay.client || {}),
            })
            .eq('order_id', orderId)
          if (pay.status === 'FAILED') {
            return json(req, { error: 'Payment failed (TEST)', orderId }, 402)
          }
        } catch (e: any) {
          return err(req, e.message || 'Payment error', e.status || 500)
        }
      }

      return json(req, {
        orderId,
        orderNumber,
        totals,
        payment: payClient,
        paymentMethod,
        requiresOnlineConfirm: online,
        accessToken,
        accessTokenExpiresAt: access_token_expires_at,
      })
    }

    if (match(method, path, 'POST', '/checkout/confirm')) {
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const { orderId } = body
      const { data: order } = await sb
        .from('orders')
        .select(ORDER_EMBED)
        .eq('id', orderId)
        .maybeSingle()
      if (!order) return err(req, 'Order not found', 404)
      if (!(await orderOwnedByRequest(req, order))) return err(req, 'Forbidden', 403)
      if (order.payment_status === 'PAID') {
        return json(req, { orderNumber: order.order_number, alreadyPaid: true })
      }
      const methodPay = order.payments?.[0]?.method
      if (!ONLINE_METHODS.has(methodPay)) {
        return err(req, 'This order does not require online confirmation')
      }
      if (!mockPaymentsAllowed()) {
        return err(req, 'Online confirm is only available in mock mode', 503)
      }
      const fulfilled = await fulfillPaid(sb, order)
      const token = cartToken(req)
      if (token) {
        const cart = await loadCartByToken(sb, token)
        await clearCartItems(sb, cart.id)
      }
      await sendMockEmail('order_confirmation', {
        to: order.shipping_email,
        orderNumber: order.order_number,
      })
      return json(req, fulfilled)
    }

    {
      const m = match(method, path, 'GET', '/checkout/orders/:id')
      if (m) {
        const { data: byId } = await sb.from('orders').select(ORDER_EMBED).eq('id', m.id).maybeSingle()
        const { data: byNum } = byId
          ? { data: null }
          : await sb.from('orders').select(ORDER_EMBED).eq('order_number', m.id).maybeSingle()
        const order = byId || byNum
        if (!order) return err(req, 'Not found', 404)
        if (!(await orderOwnedByRequest(req, order))) return err(req, 'Forbidden', 403)
        return json(req, serializeOrderAdmin(order))
      }
    }

    // ---------- PAYMENTS ----------
    if (match(method, path, 'POST', '/payments/create')) {
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const { orderId } = body
      const { data: order } = await sb
        .from('orders')
        .select(ORDER_EMBED)
        .eq('id', orderId)
        .maybeSingle()
      if (!order) return err(req, 'Order not found', 404)
      if (!(await orderOwnedByRequest(req, order))) return err(req, 'Forbidden', 403)
      if (order.payment_status === 'PAID') {
        return json(req, {
          orderId: order.id,
          orderNumber: order.order_number,
          alreadyPaid: true,
        })
      }
      let pay: any
      try {
        pay = await createPaymentForOrder(order)
      } catch (e: any) {
        return err(req, e.message || 'Payment error', e.status || 500)
      }
      if (!order.payments?.length) {
        await sb.from('payments').insert({
          order_id: order.id,
          gateway: pay.provider,
          method: pay.client?.mode === 'mock' ? 'TEST' : 'RAZORPAY',
          status: pay.status === 'FAILED' ? 'FAILED' : 'PENDING',
          amount: order.total,
          gateway_order_id: pay.gatewayOrderId || '',
          raw_json: JSON.stringify(pay.client || {}),
        })
      }
      if (pay.status === 'FAILED') {
        return json(req, { error: 'Payment failed (TEST)', orderId: order.id }, 402)
      }
      return json(req, {
        orderId: order.id,
        orderNumber: order.order_number,
        payment: pay.client,
      })
    }

    // ---------- ORDERS ----------
    if (match(method, path, 'POST', '/orders/lookup')) {
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const email = String(body.email || '').trim().toLowerCase()
      const orderNumber = String(body.orderNumber || '').trim()
      const accessToken = String(body.accessToken || '').trim()
      const ip = req.headers.get('x-forwarded-for') || 'unknown'
      const key = `${ip}|${email}`
      if (!assertRateLimit(lookupAttempts, key)) {
        return err(req, 'Too many lookups. Try again later.', 429)
      }
      recordRateLimit(lookupAttempts, key)
      if (!email.includes('@') || !orderNumber || !accessToken) {
        return err(req, 'Email, order number, and access token are required')
      }
      const { data: order } = await sb
        .from('orders')
        .select('*, order_items(*)')
        .eq('shipping_email', email)
        .eq('order_number', orderNumber)
        .maybeSingle()
      if (!order || !(await verifyOrderAccess(order, email, accessToken))) {
        return err(req, 'Order not found', 404)
      }
      return json(req, publicOrder(order))
    }

    {
      const m = match(method, path, 'GET', '/orders/:id')
      if (m) {
        const email = String(q.email || '').trim().toLowerCase()
        const accessToken = String(q.accessToken || '').trim()
        const ip = req.headers.get('x-forwarded-for') || 'unknown'
        const key = `${ip}|${email}`
        if (!assertRateLimit(lookupAttempts, key)) {
          return err(req, 'Too many lookups. Try again later.', 429)
        }
        recordRateLimit(lookupAttempts, key)
        if (!email.includes('@') || !accessToken) {
          return err(req, 'Email and access token are required')
        }
        const { data: byId } = await sb
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', m.id)
          .eq('shipping_email', email)
          .maybeSingle()
        const { data: byNum } = byId
          ? { data: null }
          : await sb
              .from('orders')
              .select('*, order_items(*)')
              .eq('order_number', m.id)
              .eq('shipping_email', email)
              .maybeSingle()
        const order = byId || byNum
        if (!order || !(await verifyOrderAccess(order, email, accessToken))) {
          return err(req, 'Order not found', 404)
        }
        return json(req, publicOrder(order))
      }
    }

    // ---------- CUSTOMERS ----------
    if (match(method, path, 'POST', '/customers/ensure')) {
      const user = await getAuthUser(req)
      if (!user) return err(req, 'Unauthorized', 401)
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const name = String(body.name || user.user_metadata?.name || '').trim() || 'Customer'
      const phone = String(body.phone || user.user_metadata?.phone || '').trim()
      const email = String(user.email || '').toLowerCase()
      if (!email) return err(req, 'Auth user has no email', 400)
      const { data: existing } = await sb.from('customers').select('*').eq('id', user.id).maybeSingle()
      let customer = existing
      if (existing) {
        const { data } = await sb
          .from('customers')
          .update({ name: name || existing.name, phone: phone || existing.phone })
          .eq('id', user.id)
          .select('*')
          .single()
        customer = data
      } else {
        const { data, error } = await sb
          .from('customers')
          .insert({ id: user.id, email, name, phone })
          .select('*')
          .single()
        if (error) return err(req, error.message, 500)
        customer = data
      }
      await attachCartToCustomer(req, sb, user.id)
      return json(req, { customer: publicCustomer(customer) })
    }

    if (match(method, path, 'POST', '/customers/attach-cart')) {
      const auth = await requireCustomer(req)
      if ('error' in auth && auth.error) return auth.error
      await attachCartToCustomer(req, auth.sb, auth.customer.id)
      return json(req, { ok: true })
    }

    if (match(method, path, 'GET', '/customers/me')) {
      const auth = await requireCustomer(req)
      if ('error' in auth && auth.error) return auth.error
      const { data: customer } = await auth.sb
        .from('customers')
        .select('*')
        .eq('id', auth.customer.id)
        .single()
      const { data: addresses } = await auth.sb
        .from('addresses')
        .select('*')
        .eq('customer_id', auth.customer.id)
      const { data: orders } = await auth.sb
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', auth.customer.id)
        .order('created_at', { ascending: false })
        .limit(50)
      return json(req, {
        customer: publicCustomer(customer),
        addresses: (addresses || []).map(serializeAddress),
        orders: (orders || []).map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          total: o.total,
          paymentStatus: o.payment_status,
          orderStatus: o.order_status,
          createdAt: o.created_at,
          items: (o.order_items || []).map((i: any) => ({
            id: i.id,
            productId: i.product_id,
            name: i.name,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            lineTotal: i.line_total,
          })),
        })),
      })
    }

    if (match(method, path, 'PUT', '/customers/me')) {
      const auth = await requireCustomer(req)
      if ('error' in auth && auth.error) return auth.error
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const name = String(body.name || '').trim()
      const phone = String(body.phone || '').trim()
      const { data: customer } = await auth.sb
        .from('customers')
        .update({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        })
        .eq('id', auth.customer.id)
        .select('*')
        .single()
      return json(req, { customer: publicCustomer(customer) })
    }

    if (match(method, path, 'POST', '/customers/addresses')) {
      const auth = await requireCustomer(req)
      if ('error' in auth && auth.error) return auth.error
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const { line1, line2 = '', city, state, pinCode, isDefault = false } = body
      if (!line1 || !city || !state || !pinCode) return err(req, 'Address fields required')
      if (isDefault) {
        await auth.sb
          .from('addresses')
          .update({ is_default: false })
          .eq('customer_id', auth.customer.id)
      }
      const { data: row, error } = await auth.sb
        .from('addresses')
        .insert({
          customer_id: auth.customer.id,
          line1,
          line2,
          city,
          state,
          pin_code: pinCode,
          is_default: Boolean(isDefault),
        })
        .select('*')
        .single()
      if (error) return err(req, error.message, 500)
      return json(req, serializeAddress(row))
    }

    {
      const m = match(method, path, 'DELETE', '/customers/addresses/:id')
      if (m) {
        const auth = await requireCustomer(req)
        if ('error' in auth && auth.error) return auth.error
        await auth.sb
          .from('addresses')
          .delete()
          .eq('id', m.id)
          .eq('customer_id', auth.customer.id)
        return json(req, { ok: true })
      }
    }

    if (match(method, path, 'GET', '/customers/wishlist')) {
      const auth = await requireCustomer(req)
      if ('error' in auth && auth.error) return auth.error
      const { data: rows } = await auth.sb
        .from('wishlist_items')
        .select(`id, products(${PRODUCT_EMBED})`)
        .eq('customer_id', auth.customer.id)
        .order('created_at', { ascending: false })
      return json(
        req,
        (rows || []).map((r: any) => ({ id: r.id, product: serializeProduct(r.products) })),
      )
    }

    if (match(method, path, 'POST', '/customers/wishlist')) {
      const auth = await requireCustomer(req)
      if ('error' in auth && auth.error) return auth.error
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const productId = body.productId
      if (!productId) return err(req, 'productId required')
      const { data: existing } = await auth.sb
        .from('wishlist_items')
        .select('*')
        .eq('customer_id', auth.customer.id)
        .eq('product_id', productId)
        .maybeSingle()
      if (existing) return json(req, existing)
      const { data: row, error } = await auth.sb
        .from('wishlist_items')
        .insert({ customer_id: auth.customer.id, product_id: productId })
        .select('*')
        .single()
      if (error) return err(req, error.message, 500)
      return json(req, row)
    }

    {
      const m = match(method, path, 'DELETE', '/customers/wishlist/:productId')
      if (m) {
        const auth = await requireCustomer(req)
        if ('error' in auth && auth.error) return auth.error
        await auth.sb
          .from('wishlist_items')
          .delete()
          .eq('customer_id', auth.customer.id)
          .eq('product_id', m.productId)
        return json(req, { ok: true })
      }
    }

    if (match(method, path, 'POST', '/customers/logout')) {
      return json(req, { ok: true })
    }

    // ---------- ADMIN ----------
    if (match(method, path, 'POST', '/admin/login')) {
      const body = await readBody(req)
      if (body === null) return err(req, 'Invalid JSON')
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const key = `${req.headers.get('x-forwarded-for') || 'unknown'}|${email}`
      if (!assertRateLimit(adminLoginAttempts, key, 10)) {
        return err(req, 'Too many login attempts. Try again later.', 429)
      }
      recordRateLimit(adminLoginAttempts, key)
      const urlEnv = Deno.env.get('SUPABASE_URL')!
      const anon = Deno.env.get('SUPABASE_ANON_KEY')!
      const anonClient = createClient(urlEnv, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: signed, error: signErr } = await anonClient.auth.signInWithPassword({
        email,
        password,
      })
      if (signErr || !signed.session || !signed.user) {
        return err(req, 'Invalid credentials', 401)
      }
      const { data: role } = await sb
        .from('admin_roles')
        .select('*')
        .eq('user_id', signed.user.id)
        .maybeSingle()
      if (!role) {
        await anonClient.auth.signOut()
        return err(req, 'Unauthorized', 401)
      }
      return json(req, {
        admin: { id: role.user_id, email: role.email, name: role.name },
        session: {
          access_token: signed.session.access_token,
          refresh_token: signed.session.refresh_token,
        },
      })
    }

    if (match(method, path, 'POST', '/admin/logout')) {
      return json(req, { ok: true })
    }

    if (match(method, path, 'GET', '/admin/me')) {
      const auth = await requireAdmin(req)
      if ('error' in auth && auth.error) return auth.error
      return json(req, {
        id: auth.admin.user_id,
        email: auth.admin.email,
        name: auth.admin.name,
      })
    }

    // All remaining /admin/* require admin
    if (path.startsWith('/admin/')) {
      const auth = await requireAdmin(req)
      if ('error' in auth && auth.error) return auth.error
      const asb = auth.sb

      if (match(method, path, 'GET', '/admin/dashboard')) {
        const [
          { count: products },
          { count: orders },
          { count: customers },
          { data: paid },
          { data: recent },
          { data: lowAll },
        ] = await Promise.all([
          asb.from('products').select('id', { count: 'exact', head: true }),
          asb.from('orders').select('id', { count: 'exact', head: true }),
          asb.from('customers').select('id', { count: 'exact', head: true }),
          asb.from('orders').select('*').eq('payment_status', 'PAID'),
          asb
            .from('orders')
            .select('*, customers(*)')
            .order('created_at', { ascending: false })
            .limit(8),
          asb.from('products').select('*').neq('status', 'ARCHIVED'),
        ])
        const paidRows = paid || []
        const revenue = paidRows.reduce((s: number, o: any) => s + o.total, 0)
        const lowStock = (lowAll || [])
          .filter((p: any) => p.stock <= p.low_stock_threshold)
          .slice(0, 8)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            threshold: p.low_stock_threshold,
          }))
        const salesByDay = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setHours(0, 0, 0, 0)
          d.setDate(d.getDate() - (6 - i))
          const next = new Date(d)
          next.setDate(d.getDate() + 1)
          const total = paidRows
            .filter((o: any) => {
              const t = new Date(o.created_at)
              return t >= d && t < next
            })
            .reduce((s: number, o: any) => s + o.total, 0)
          return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total }
        })
        return json(req, {
          products: products || 0,
          orders: orders || 0,
          customers: customers || 0,
          revenue,
          recent: (recent || []).map(serializeOrderAdmin),
          salesByDay,
          lowStock,
        })
      }

      if (match(method, path, 'GET', '/admin/categories')) {
        const { data: rows } = await asb
          .from('categories')
          .select('*, products(id, name, sku, status)')
          .order('sort_order', { ascending: true })
        return json(
          req,
          (rows || []).map((c: any) =>
            serializeCategory(c, (c.products || []).length),
          ),
        )
      }

      if (match(method, path, 'POST', '/admin/categories')) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const name = String(body.name || '').trim()
        if (name.length < 2) return err(req, 'Category name is required')
        const nextSlug = String(body.slug || name)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
        if (!nextSlug) return err(req, 'Category slug is required')
        const { data: row, error } = await asb
          .from('categories')
          .insert({
            name,
            slug: nextSlug,
            description: body.description || '',
            image_url: body.imageUrl || '',
            sort_order: Number(body.sortOrder) || 0,
            status: body.status || 'ACTIVE',
            is_featured: Boolean(body.isFeatured),
          })
          .select('*')
          .single()
        if (error) return err(req, error.message, 500)
        return json(req, serializeCategory(row, 0))
      }

      if (match(method, path, 'PUT', '/admin/categories/reorder')) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const ids = Array.isArray(body.ids) ? body.ids : []
        for (let i = 0; i < ids.length; i++) {
          await asb.from('categories').update({ sort_order: i }).eq('id', ids[i])
        }
        return json(req, { ok: true })
      }

      {
        const m = match(method, path, 'PUT', '/admin/categories/:id')
        if (m) {
          const body = await readBody(req)
          if (body === null) return err(req, 'Invalid JSON')
          if (body.name != null && !String(body.name).trim()) {
            return err(req, 'Category name is required')
          }
          const patch: Record<string, unknown> = {}
          if (body.name != null) patch.name = String(body.name).trim()
          if (body.slug != null) patch.slug = String(body.slug).trim()
          if (body.description != null) patch.description = body.description
          if (body.imageUrl != null) patch.image_url = body.imageUrl
          if (body.status != null) patch.status = body.status
          if (body.isFeatured != null) patch.is_featured = Boolean(body.isFeatured)
          if (body.sortOrder != null) patch.sort_order = Number(body.sortOrder)
          const { data: row, error } = await asb
            .from('categories')
            .update(patch)
            .eq('id', m.id)
            .select('*')
            .single()
          if (error) return err(req, error.message, 500)
          return json(req, serializeCategory(row))
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/categories/:id/archive')
        if (m) {
          const { data: row } = await asb
            .from('categories')
            .update({ status: 'ARCHIVED' })
            .eq('id', m.id)
            .select('*')
            .single()
          return json(req, serializeCategory(row))
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/categories/:id/restore')
        if (m) {
          const { data: row } = await asb
            .from('categories')
            .update({ status: 'ACTIVE' })
            .eq('id', m.id)
            .select('*')
            .single()
          return json(req, serializeCategory(row))
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/categories/:id/assign')
        if (m) {
          const body = await readBody(req)
          if (body === null) return err(req, 'Invalid JSON')
          if (!body.productId) return err(req, 'productId required')
          const { data: product, error } = await asb
            .from('products')
            .update({ category_id: m.id })
            .eq('id', body.productId)
            .select(PRODUCT_EMBED)
            .single()
          if (error) return err(req, error.message, 500)
          return json(req, serializeProduct(product))
        }
      }

      if (match(method, path, 'POST', '/admin/upload')) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const fileName = String(body.fileName || body.filename || 'image.jpg')
        const contentType = String(body.contentType || 'image/jpeg')
        const base64 = String(body.base64 || body.dataBase64 || '')
        const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
        if (!allowed.has(contentType)) return err(req, 'Only JPG, PNG, WEBP')
        if (!base64) return err(req, 'No file')
        const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        if (binary.byteLength > 5 * 1024 * 1024) return err(req, 'File too large')
        const ext =
          contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
        const pathName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await asb.storage
          .from('product-images')
          .upload(pathName, binary, { contentType, upsert: false })
        if (upErr) return err(req, upErr.message, 500)
        const { data: pub } = asb.storage.from('product-images').getPublicUrl(pathName)
        return json(req, { url: pub.publicUrl })
      }

      if (match(method, path, 'DELETE', '/admin/upload')) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const urlStr = String(body.url || '')
        const marker = '/product-images/'
        const idx = urlStr.indexOf(marker)
        if (idx >= 0) {
          const objectPath = urlStr.slice(idx + marker.length).split('?')[0]
          if (objectPath && !objectPath.includes('..')) {
            await asb.storage.from('product-images').remove([objectPath])
          }
        }
        return json(req, { ok: true })
      }

      if (match(method, path, 'GET', '/admin/products')) {
        const { data: rows } = await asb
          .from('products')
          .select(PRODUCT_EMBED)
          .order('updated_at', { ascending: false })
        return json(req, (rows || []).map(serializeProduct))
      }

      if (match(method, path, 'POST', '/admin/products')) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const paymentMethods = parsedPaymentMethods(body)
        if (!paymentMethods.length) return err(req, 'Select at least one payment method')
        const data = productData({ ...body, paymentMethods })
        const { data: product, error } = await asb
          .from('products')
          .insert(data)
          .select('*')
          .single()
        if (error || !product) return err(req, error?.message || 'Create failed', 500)
        const images = (body.images || []).map((img: any, i: number) => ({
          product_id: product.id,
          url: img.url,
          alt: img.alt || data.name,
          sort_order: i,
          is_primary: i === 0,
        }))
        const specs = (body.specifications || []).map((s: any, i: number) => ({
          product_id: product.id,
          name: s.name,
          value: s.value,
          sort_order: i,
        }))
        if (images.length) await asb.from('product_images').insert(images)
        if (specs.length) await asb.from('product_specifications').insert(specs)
        const full = await loadProduct(asb, product.id)
        return json(req, serializeProduct(full))
      }

      {
        const m = match(method, path, 'PUT', '/admin/products/:id')
        if (m) {
          const body = await readBody(req)
          if (body === null) return err(req, 'Invalid JSON')
          const paymentMethods = parsedPaymentMethods(body)
          if (!paymentMethods.length) return err(req, 'Select at least one payment method')
          const data = productData({ ...body, paymentMethods })
          await asb.from('product_images').delete().eq('product_id', m.id)
          await asb.from('product_specifications').delete().eq('product_id', m.id)
          const { error } = await asb.from('products').update(data).eq('id', m.id)
          if (error) return err(req, error.message, 500)
          const images = (body.images || []).map((img: any, i: number) => ({
            product_id: m.id,
            url: img.url,
            alt: img.alt || data.name,
            sort_order: i,
            is_primary: i === 0,
          }))
          const specs = (body.specifications || []).map((s: any, i: number) => ({
            product_id: m.id,
            name: s.name,
            value: s.value,
            sort_order: i,
          }))
          if (images.length) await asb.from('product_images').insert(images)
          if (specs.length) await asb.from('product_specifications').insert(specs)
          const full = await loadProduct(asb, m.id)
          return json(req, serializeProduct(full))
        }
      }

      {
        const m = match(method, path, 'DELETE', '/admin/products/:id/images')
        if (m) {
          const body = await readBody(req)
          if (body === null) return err(req, 'Invalid JSON')
          const imageId = body?.imageId
          const urlStr = String(body?.url || '')
          let row: any = null
          if (imageId) {
            const { data } = await asb
              .from('product_images')
              .select('*')
              .eq('id', String(imageId))
              .eq('product_id', m.id)
              .maybeSingle()
            row = data
          } else if (urlStr) {
            const { data } = await asb
              .from('product_images')
              .select('*')
              .eq('product_id', m.id)
              .eq('url', urlStr)
              .maybeSingle()
            row = data
          }
          if (row) {
            await asb.from('product_images').delete().eq('id', row.id)
            const marker = '/product-images/'
            const idx = String(row.url).indexOf(marker)
            if (idx >= 0) {
              const objectPath = String(row.url).slice(idx + marker.length).split('?')[0]
              if (objectPath) await asb.storage.from('product-images').remove([objectPath])
            }
          } else if (urlStr) {
            const marker = '/product-images/'
            const idx = urlStr.indexOf(marker)
            if (idx >= 0) {
              const objectPath = urlStr.slice(idx + marker.length).split('?')[0]
              if (objectPath) await asb.storage.from('product-images').remove([objectPath])
            }
          }
          return json(req, { ok: true })
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/products/:id/archive')
        if (m) {
          const { data } = await asb
            .from('products')
            .update({ status: 'ARCHIVED' })
            .eq('id', m.id)
            .select('*')
            .single()
          return json(req, data)
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/products/:id/restore')
        if (m) {
          const { data } = await asb
            .from('products')
            .update({ status: 'ACTIVE' })
            .eq('id', m.id)
            .select('*')
            .single()
          return json(req, data)
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/products/:id/duplicate')
        if (m) {
          const src = await loadProduct(asb, m.id)
          if (!src) return err(req, 'Not found', 404)
          const { data: copy, error } = await asb
            .from('products')
            .insert({
              name: `${src.name} (copy)`,
              slug: `${src.slug}-copy-${Date.now().toString(36)}`,
              sku: `${src.sku}-COPY`,
              category_id: src.category_id,
              brand: src.brand,
              short_description: src.short_description,
              description: src.description,
              features_json: src.features_json,
              tags_json: src.tags_json,
              payment_methods_json: src.payment_methods_json,
              price: src.price,
              mrp: src.mrp,
              discount: src.discount,
              tax_rate: src.tax_rate,
              stock: src.stock,
              low_stock_threshold: src.low_stock_threshold,
              status: 'INACTIVE',
            })
            .select('*')
            .single()
          if (error || !copy) return err(req, error?.message || 'Duplicate failed', 500)
          const images = (src.product_images || []).map((i: any) => ({
            product_id: copy.id,
            url: i.url,
            alt: i.alt,
            sort_order: i.sort_order,
            is_primary: i.is_primary,
          }))
          const specs = (src.product_specifications || []).map((s: any) => ({
            product_id: copy.id,
            name: s.name,
            value: s.value,
            sort_order: s.sort_order,
          }))
          if (images.length) await asb.from('product_images').insert(images)
          if (specs.length) await asb.from('product_specifications').insert(specs)
          const full = await loadProduct(asb, copy.id)
          return json(req, serializeProduct(full))
        }
      }

      if (match(method, path, 'GET', '/admin/orders')) {
        let query = asb
          .from('orders')
          .select('*, customers(*), order_items(*), payments(*)')
          .order('created_at', { ascending: false })
        if (q.status) query = query.eq('order_status', q.status)
        const { data: rows } = await query
        return json(req, (rows || []).map(serializeOrderAdmin))
      }

      {
        const m = match(method, path, 'GET', '/admin/orders/:id')
        if (m) {
          const { data: byId } = await asb
            .from('orders')
            .select('*, customers(*), order_items(*), payments(*)')
            .eq('id', m.id)
            .maybeSingle()
          const { data: byNum } = byId
            ? { data: null }
            : await asb
                .from('orders')
                .select('*, customers(*), order_items(*), payments(*)')
                .eq('order_number', m.id)
                .maybeSingle()
          const row = byId || byNum
          if (!row) return err(req, 'Not found', 404)
          return json(req, serializeOrderAdmin(row))
        }
      }

      {
        const m = match(method, path, 'PUT', '/admin/orders/:id')
        if (m) {
          const body = await readBody(req)
          if (body === null) return err(req, 'Invalid JSON')
          const allowed = new Set(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
          const orderStatus = String(body.orderStatus || '')
          if (!allowed.has(orderStatus)) return err(req, 'Invalid order status')
          const { data: row, error } = await asb
            .from('orders')
            .update({ order_status: orderStatus })
            .eq('id', m.id)
            .select('*')
            .single()
          if (error) return err(req, error.message, 500)
          return json(req, serializeOrderAdmin({ ...row, order_items: [], payments: [] }))
        }
      }

      if (match(method, path, 'GET', '/admin/inventory')) {
        const term = String(q.q || '').trim().toLowerCase()
        const filter = String(q.filter || 'all')
        const { data: products } = await asb
          .from('products')
          .select('*')
          .neq('status', 'ARCHIVED')
          .order('name', { ascending: true })
        const rows = (products || []).map((p: any) => {
          const health = p.stock <= 0 ? 'Out' : p.stock <= p.low_stock_threshold ? 'Low' : 'Healthy'
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            stock: p.stock,
            threshold: p.low_stock_threshold,
            status: health,
          }
        })
        let list = rows
        if (term) list = list.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(term))
        if (filter === 'low') list = list.filter((p) => p.status === 'Low')
        if (filter === 'out') list = list.filter((p) => p.status === 'Out')
        if (filter === 'healthy') list = list.filter((p) => p.status === 'Healthy')
        const kpis = {
          totalUnits: rows.reduce((s, p) => s + p.stock, 0),
          lowCount: rows.filter((p) => p.status === 'Low').length,
          outCount: rows.filter((p) => p.status === 'Out').length,
          stockValue: rows.reduce((s, p) => s + p.stock * p.price, 0),
        }
        return json(req, { kpis, products: list })
      }

      {
        const m = match(method, path, 'GET', '/admin/inventory/:id/history')
        if (m) {
          const { data: moves } = await asb
            .from('inventory_movements')
            .select('*')
            .eq('product_id', m.id)
            .order('created_at', { ascending: false })
            .limit(100)
          return json(
            req,
            (moves || []).map((mv: any) => ({
              id: mv.id,
              productId: mv.product_id,
              delta: mv.delta,
              reason: mv.reason,
              notes: mv.notes,
              adminName: mv.admin_name,
              createdAt: mv.created_at,
            })),
          )
        }
      }

      {
        const m = match(method, path, 'POST', '/admin/inventory/:id')
        if (m) {
          const body = await readBody(req)
          if (body === null) return err(req, 'Invalid JSON')
          const delta = Number(body.delta)
          if (!delta) return err(req, 'Quantity required')
          const reason = String(body.reason || 'Manual adjustment')
          const notes = String(body.notes || '')
          const { data: product } = await asb.from('products').select('*').eq('id', m.id).single()
          if (!product) return err(req, 'Not found', 404)
          const { data: updated, error } = await asb
            .from('products')
            .update({ stock: product.stock + delta })
            .eq('id', m.id)
            .select('*')
            .single()
          if (error) return err(req, error.message, 500)
          await asb.from('inventory_movements').insert({
            product_id: m.id,
            delta,
            reason,
            notes,
            admin_name: auth.admin.name || auth.admin.email || 'Admin',
          })
          return json(req, updated)
        }
      }

      if (match(method, path, 'GET', '/admin/payments')) {
        const { data: rows } = await asb
          .from('payments')
          .select('*, orders(*, customers(*))')
          .order('created_at', { ascending: false })
        return json(
          req,
          (rows || []).map((p: any) => ({
            id: p.id,
            orderId: p.order_id,
            gateway: p.gateway,
            method: p.method,
            status: p.status,
            amount: p.amount,
            gatewayOrderId: p.gateway_order_id,
            gatewayPaymentId: p.gateway_payment_id,
            rawJson: p.raw_json,
            createdAt: p.created_at,
            order: p.orders ? serializeOrderAdmin(p.orders) : null,
          })),
        )
      }

      if (match(method, path, 'GET', '/admin/settings')) {
        return json(req, await getSettings(asb))
      }

      if (match(method, path, 'PUT', '/admin/settings')) {
        const body = await readBody(req)
        if (body === null) return err(req, 'Invalid JSON')
        const next = { ...(await getSettings(asb)), ...body }
        await asb
          .from('store_settings')
          .upsert({ id: 'default', json: JSON.stringify(next) })
        return json(req, next)
      }

      return err(req, 'Not found', 404)
    }

    return err(req, 'Not found', 404)
  } catch (e: any) {
    console.error(e)
    return err(req, e?.message || 'Server error', 500)
  }
})
