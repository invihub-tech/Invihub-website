/**
 * End-to-end API checks for INVIHUB shop + admin.
 * Usage: node scripts/e2e.mjs
 */
import '../server/src/lib/env.js'

const API = process.env.API_URL || 'http://127.0.0.1:8787'
const WEB = process.env.WEB_URL || 'http://127.0.0.1:5173'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@invihub.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'invihub-admin'

const jar = new Map()

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function storeCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  const list = raw.length ? raw : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  for (const c of list) {
    const [pair] = c.split(';')
    const eq = pair.indexOf('=')
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
  }
}

async function call(path, options = {}, base = API) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      Cookie: cookieHeader(),
      ...(options.headers || {}),
    },
  })
  storeCookies(res)
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  return { res, data }
}

const results = []

async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (err) {
    results.push({ name, ok: false, error: err.message })
    console.log(`FAIL  ${name} — ${err.message}`)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

await check('API health', async () => {
  const { res, data } = await call('/api/health')
  assert(res.ok && data.ok, 'health failed')
})

await check('Marketing homepage HTML', async () => {
  const { res, data } = await call('/', {}, WEB)
  assert(res.ok && String(data.raw || '').includes('root'), 'vite index missing')
})

await check('Shop route HTML', async () => {
  const { res } = await call('/shop', {}, WEB)
  assert(res.ok, 'shop page not 200')
})

await check('Admin login route HTML', async () => {
  const { res } = await call('/invihub/admin/login', {}, WEB)
  assert(res.ok, 'admin login page not 200')
})

let products = []
await check('List categories', async () => {
  const { res, data } = await call('/api/categories')
  assert(res.ok && Array.isArray(data) && data.length >= 4, 'expected seeded categories')
})

await check('List products', async () => {
  const { res, data } = await call('/api/products')
  assert(res.ok && Array.isArray(data) && data.length >= 3, 'expected seeded products')
  products = data
  assert(
    !data.some((p) => (p.images || []).some((im) => String(im.url || '').startsWith('/images/'))),
    'dummy marketing images still on products',
  )
})

await check('Search robotic', async () => {
  const { res, data } = await call('/api/search?q=robotic')
  assert(res.ok && data.some((p) => /robot/i.test(p.name)), 'search missed robotic arm')
})

await check('Product by slug', async () => {
  const slug = products[0].slug
  const { res, data } = await call(`/api/products/${slug}`)
  assert(res.ok && data.product?.slug === slug, 'PDP payload missing')
})

await check('Reject empty checkout', async () => {
  const { res } = await call('/api/checkout', { method: 'POST', body: JSON.stringify({ name: 'A' }) })
  assert(res.status === 400, `expected 400, got ${res.status}`)
})

await check('Invalid admin login', async () => {
  const { res } = await call('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong-password' }),
  })
  assert(res.status === 401, `expected 401, got ${res.status}`)
})

await check('Cart add → checkout → pay', async () => {
  jar.clear()
  const product = products.find((p) => p.stock > 0) || products[0]
  const stockBefore = product.stock
  const add = await call('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  })
  assert(add.res.ok && (add.data.count >= 1 || add.data.cart?.items?.length >= 1), add.data.error || 'add to cart failed')

  const cart = await call('/api/cart')
  assert(cart.data.totals?.total > 0, 'cart totals missing')
  assert(Array.isArray(cart.data.allowedPaymentMethods) && cart.data.allowedPaymentMethods.includes('RAZORPAY'), 'allowedPaymentMethods missing')

  const checkout = await call('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Buyer',
      email: 'e2e@invihub.test',
      phone: '7022149521',
      line1: '402-B ITI HBCS Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560026',
      paymentMethod: 'RAZORPAY',
    }),
  })
  assert(checkout.res.ok && checkout.data.orderId, checkout.data.error || 'checkout failed')

  const payCreate = await call('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({ orderId: checkout.data.orderId }),
  })
  assert(payCreate.res.ok, payCreate.data.error || 'payments/create failed')

  const confirm = await call('/api/checkout/confirm', {
    method: 'POST',
    body: JSON.stringify({ orderId: checkout.data.orderId }),
  })
  assert(confirm.res.ok && confirm.data.orderNumber, confirm.data.error || 'confirm failed')

  const order = await call(`/api/checkout/orders/${checkout.data.orderId}`)
  assert(order.data.paymentStatus === 'PAID', `expected PAID, got ${order.data.paymentStatus}`)

  const lookup = await call('/api/orders/lookup', {
    method: 'POST',
    body: JSON.stringify({ email: 'e2e@invihub.test', orderNumber: confirm.data.orderNumber }),
  })
  assert(lookup.res.ok && lookup.data.orderNumber === confirm.data.orderNumber, 'guest lookup missed order')

  const noNum = await call('/api/orders/lookup', {
    method: 'POST',
    body: JSON.stringify({ email: 'e2e@invihub.test' }),
  })
  assert(noNum.res.status === 400, 'lookup without order number should 400')

  const guest = await call(
    `/api/orders/${encodeURIComponent(confirm.data.orderNumber)}?email=${encodeURIComponent('e2e@invihub.test')}`,
  )
  assert(guest.res.ok && guest.data.total > 0, 'guest order detail failed')

  const after = await call(`/api/products/${product.slug}`)
  assert(after.data.product.stock === stockBefore - 1, `stock ${stockBefore} → ${after.data.product.stock}`)

  const emptyCart = await call('/api/cart')
  assert(emptyCart.data.count === 0, 'cart should clear after pay')
})

await check('COD checkout stays PENDING', async () => {
  jar.clear()
  const listed = await call('/api/products')
  const product = listed.data.find((p) => p.stock > 0) || listed.data[0]
  const add = await call('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
  })
  assert(add.res.ok, add.data.error || 'add to cart failed')
  const checkout = await call('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({
      name: 'COD Buyer',
      email: 'e2e-cod@invihub.test',
      phone: '7022149521',
      line1: '402-B ITI HBCS Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560026',
      paymentMethod: 'COD',
    }),
  })
  assert(checkout.res.ok && checkout.data.requiresOnlineConfirm === false, checkout.data.error || 'COD checkout failed')
  const confirm = await call('/api/checkout/confirm', {
    method: 'POST',
    body: JSON.stringify({ orderId: checkout.data.orderId }),
  })
  assert(confirm.res.status === 400, 'COD should not confirm online')
  const order = await call(`/api/checkout/orders/${checkout.data.orderId}`)
  assert(order.data.paymentStatus === 'PENDING', `expected PENDING, got ${order.data.paymentStatus}`)
  assert(order.data.payments?.[0]?.method === 'COD', 'COD method not stored')
})

await check('Register after guest email + me', async () => {
  jar.clear()
  const email = `acct-${Date.now()}@invihub.test`
  const reg = await call('/api/customers/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Account Buyer', email, phone: '7022149521', password: 'secret12' }),
  })
  assert(reg.res.ok && reg.data.customer?.email === email, reg.data.error || 'register failed')
  const me = await call('/api/customers/me')
  assert(me.res.ok && me.data.customer.registered, 'customer me failed')
})

await check('Admin login + dashboard', async () => {
  jar.clear()
  const login = await call('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  assert(login.res.ok && login.data.admin?.email === ADMIN_EMAIL, login.data.error || 'admin login failed')
  const dash = await call('/api/admin/dashboard')
  assert(dash.res.ok && typeof dash.data.orders === 'number', 'dashboard failed')
  const orders = await call('/api/admin/orders')
  assert(orders.res.ok && Array.isArray(orders.data), 'admin orders failed')
  if (orders.data[0]) {
    const shipped = await call(`/api/admin/orders/${orders.data[0].id}`, {
      method: 'PUT',
      body: JSON.stringify({ orderStatus: 'SHIPPED' }),
    })
    assert(shipped.res.ok && shipped.data.orderStatus === 'SHIPPED', shipped.data.error || 'status update failed')
    const bad = await call(`/api/admin/orders/${orders.data[0].id}`, {
      method: 'PUT',
      body: JSON.stringify({ orderStatus: 'NOPE' }),
    })
    assert(bad.res.status === 400, 'invalid status should 400')
  }
  const inv = await call('/api/admin/inventory')
  assert(inv.res.ok && inv.data.kpis && Array.isArray(inv.data.products), 'inventory payload failed')
  const first = inv.data.products[0]
  const hist = await call(`/api/admin/inventory/${first.id}/history`)
  assert(hist.res.ok && Array.isArray(hist.data), 'inventory history failed')
  const cats = await call('/api/admin/categories')
  assert(cats.res.ok && cats.data[0].productCount >= 0, 'categories list failed')
  const prod = await call('/api/admin/products')
  const target = prod.data.find((p) => p.status === 'ACTIVE')
  const archived = await call(`/api/admin/products/${target.id}/archive`, { method: 'POST', body: '{}' })
  assert(archived.res.ok, 'archive failed')
  const restored = await call(`/api/admin/products/${target.id}/restore`, { method: 'POST', body: '{}' })
  assert(restored.res.ok, 'restore failed')
})

await check('Unauthenticated admin blocked', async () => {
  jar.clear()
  const { res } = await call('/api/admin/dashboard')
  assert(res.status === 401, `expected 401, got ${res.status}`)
})

await check('Customer JWT cannot use admin API', async () => {
  jar.clear()
  const email = `priv-${Date.now()}@invihub.test`
  const reg = await call('/api/customers/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Priv Buyer', email, phone: '7022149521', password: 'secret12' }),
  })
  assert(reg.res.ok, reg.data.error || 'register failed')
  const steal = jar.get('customer_token')
  const { res } = await call('/api/admin/dashboard', { headers: { Authorization: `Bearer ${steal}` } })
  assert(res.status === 401, `expected 401 from customer JWT, got ${res.status}`)
})

await check('Confirm without cart cookie forbidden', async () => {
  jar.clear()
  const listed = await call('/api/products')
  const product = listed.data.find((p) => p.stock > 0) || listed.data[0]
  await call('/api/cart', { method: 'POST', body: JSON.stringify({ productId: product.id, quantity: 1 }) })
  const checkout = await call('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Steal Pay',
      email: 'e2e-steal@invihub.test',
      phone: '7022149521',
      line1: '402-B ITI HBCS Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560026',
      paymentMethod: 'RAZORPAY',
    }),
  })
  assert(checkout.res.ok && checkout.data.orderId, checkout.data.error || 'checkout failed')
  const orderId = checkout.data.orderId
  jar.clear()
  const confirm = await call('/api/checkout/confirm', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  })
  assert(confirm.res.status === 403, `expected 403 confirm, got ${confirm.res.status}`)
  const hook = await call('/api/payments/webhook', { method: 'POST', body: JSON.stringify({ orderId }) })
  assert(hook.res.status === 400, `expected 400 webhook, got ${hook.res.status}`)
})

const passed = results.filter((r) => r.ok).length
const total = results.length
const pct = Math.round((passed / total) * 100)
console.log(`\n${passed}/${total} checks passed (${pct}%)`)
if (passed < total) process.exit(1)
