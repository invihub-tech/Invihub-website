import { getCartToken } from '../lib/cartToken'
import { saveOrderAccess, findOrderAccessToken } from '../lib/orderAccess'
import { supabase, functionsBase, isSupabaseConfigured } from '../lib/supabase'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function authHeaders() {
  const usingProxy = Boolean(import.meta.env.VITE_API_URL)
  const headers = {
    'Content-Type': 'application/json',
    'x-cart-token': getCartToken(),
  }
  // Only send the raw apikey from the browser when NOT going through the proxy.
  // In proxy mode the Vite server injects it server-side so it's never visible in DevTools.
  if (!usingProxy) {
    headers.apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      // Logged-in user: send JWT so the backend can identify them
      headers.Authorization = `Bearer ${token}`
    } else if (!usingProxy) {
      // Guest + direct call (no proxy): fall back to anon key
      headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
    }
    // In proxy mode without a session: no Authorization header — the proxy's
    // server-side apikey header is sufficient for unauthenticated calls.
  }
  return headers
}

async function edge(path, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new ApiError('Supabase is not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)', 503)
  }
  let res
  try {
    const headers = await authHeaders()
    res = await fetch(`${functionsBase()}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
      body:
        options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body,
    })
  } catch (e) {
    window.dispatchEvent(new Event('invi-network-error'))
    throw new ApiError(e.message || 'Network error', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 503 || data.maintenance) {
    window.dispatchEvent(new Event('invi-maintenance'))
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname.includes('/admin') && !path.includes('/admin/login')) {
      window.dispatchEvent(new Event('invi-admin-unauthorized'))
    }
    throw new ApiError(data.error || res.statusText, res.status)
  }
  return data
}

function rememberAccess(result, email) {
  const num = result?.orderNumber || result?.requestNumber
  if (num && result?.accessToken) {
    saveOrderAccess(num, {
      token: result.accessToken,
      email: email || '',
      expiresAt: result.accessTokenExpiresAt || null,
    })
  }
  return result
}

function mapCoupon(c) {
  if (!c) return null
  const now = new Date()
  let computedStatus = c.status
  if (c.status !== 'DISABLED' && c.status !== 'DRAFT') {
    const start = new Date(c.start_date)
    const end = new Date(c.end_date)
    if (now < start) computedStatus = 'SCHEDULED'
    else if (now > end) computedStatus = 'EXPIRED'
    else computedStatus = 'ACTIVE'
  }
  return {
    id: c.id,
    code: c.code,
    description: c.description || '',
    discountType: c.discount_type,
    discountValue: Number(c.discount_value),
    startDate: c.start_date,
    endDate: c.end_date,
    minOrderValue: Number(c.min_order_value || 0),
    maxDiscountAmount: c.max_discount_amount != null ? Number(c.max_discount_amount) : null,
    usageLimit: c.usage_limit != null ? Number(c.usage_limit) : null,
    usageCount: Number(c.usage_count || 0),
    perCustomerLimit: Number(c.per_customer_limit || 1),
    appliesTo: c.applies_to,
    productIds: Array.isArray(c.product_ids_json) ? c.product_ids_json : [],
    categoryIds: Array.isArray(c.category_ids_json) ? c.category_ids_json : [],
    evaluationMode: c.evaluation_mode || 'OR',
    status: computedStatus,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

function mapFilament(f) {
  if (!f) return null
  const stockSpools = Number(f.stock_spools || 0)
  const weightGrams = Number(f.weight_grams || 1000)
  const lowThreshold = Number(f.low_stock_threshold || 5)
  let status = 'HEALTHY'
  if (stockSpools <= 0) status = 'OUT_OF_STOCK'
  else if (stockSpools <= lowThreshold) status = 'LOW_STOCK'

  return {
    id: f.id,
    name: f.name,
    material: f.material,
    colorName: f.color_name,
    colorHex: f.color_hex || '#000000',
    diameter: Number(f.diameter || 1.75),
    weightGrams,
    stockSpools,
    totalWeightKg: Math.round(((stockSpools * weightGrams) / 1000) * 100) / 100,
    sku: f.sku || '',
    supplier: f.supplier || '',
    costPerSpool: Number(f.cost_per_spool || 0),
    lowStockThreshold: lowThreshold,
    notes: f.notes || '',
    isActive: Boolean(f.is_active),
    status,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }
}

function calculateCouponDiscount(coupon, items, subtotal) {
  if (!coupon) return 0
  let eligibleSubtotal = 0
  if (coupon.appliesTo === 'ALL' || (!coupon.productIds?.length && !coupon.categoryIds?.length)) {
    eligibleSubtotal = subtotal
  } else {
    for (const item of items) {
      const pId = item.productId || item.product_id || item.id
      const cId = item.categoryId || item.category_id
      const matchesProduct = (coupon.productIds || []).includes(pId)
      const matchesCat = (coupon.categoryIds || []).includes(cId)
      let eligible = false
      if (coupon.appliesTo === 'PRODUCTS') eligible = matchesProduct
      else if (coupon.appliesTo === 'CATEGORIES') eligible = matchesCat
      else if (coupon.appliesTo === 'COMBINED') {
        eligible = coupon.evaluationMode === 'AND' ? (matchesProduct && matchesCat) : (matchesProduct || matchesCat)
      }
      if (eligible) {
        eligibleSubtotal += Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)
      }
    }
  }

  if (eligibleSubtotal <= 0) return 0

  let discount = 0
  if (coupon.discountType === 'PERCENTAGE') {
    discount = Math.round((eligibleSubtotal * coupon.discountValue) / 100)
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount
    }
  } else {
    discount = Math.min(coupon.discountValue, eligibleSubtotal)
  }
  return discount
}

async function resolveProductId(productIdOrSlug) {
  if (!productIdOrSlug) return null
  const str = String(productIdOrSlug).trim()
  if (!supabase) return str
  // If it is already a UUID: 8-4-4-4-12 hex chars
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str
  }

  // Look up by slug first
  try {
    const { data: p } = await supabase
      .from('products')
      .select('id')
      .eq('slug', str)
      .maybeSingle()
    if (p?.id) return p.id
  } catch (_) {}

  // Look up by id (e.g. text-based IDs like seed_prod_arm)
  try {
    const { data: p2 } = await supabase
      .from('products')
      .select('id')
      .eq('id', str)
      .maybeSingle()
    if (p2?.id) return p2.id
  } catch (_) {}

  return str
}

export const api = {
  health: () => edge('/health'),
  categories: () => edge('/categories'),
  products: (params = {}) => edge(`/products?${new URLSearchParams(params)}`),
  product: (slug) => edge(`/products/${encodeURIComponent(slug)}`),
  productReviews: async (slug) => {
    if (supabase) {
      try {
        const { data: p } = await supabase
          .from('products')
          .select('id, name, slug')
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .maybeSingle()
        if (p) {
          const { data: reviews } = await supabase
            .from('product_reviews')
            .select('id, product_id, customer_name, rating, title, comment, verified_purchase, created_at, updated_at')
            .eq('product_id', p.id)
            .eq('status', 'APPROVED')
            .order('created_at', { ascending: false })
          const list = reviews || []
          const totalCount = list.length
          const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          let sum = 0
          for (const r of list) {
            const stars = Math.min(5, Math.max(1, Number(r.rating) || 1))
            distribution[stars] = (distribution[stars] || 0) + 1
            sum += stars
          }
          const average = totalCount > 0 ? Math.round((sum / totalCount) * 10) / 10 : 0
          const percentages = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          if (totalCount > 0) {
            for (let s = 1; s <= 5; s++) {
              percentages[s] = Math.round(((distribution[s] || 0) / totalCount) * 100)
            }
          }
          return {
            ok: true,
            productId: p.id,
            summary: { average, totalCount, distribution, percentages },
            reviews: list.map((r) => ({
              id: r.id,
              customerName: r.customer_name,
              rating: r.rating,
              title: r.title || '',
              comment: r.comment,
              verifiedPurchase: r.verified_purchase,
              createdAt: r.created_at,
            })),
          }
        }
      } catch (_) {}
    }
    return {
      ok: true,
      summary: { average: 0, totalCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
      reviews: [],
    }
  },
  submitProductReview: async (slug, body) => {
    if (supabase) {
      const { data: p } = await supabase
        .from('products')
        .select('id')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle()
      if (!p) throw new ApiError('Product not found', 404)

      const payload = {
        product_id: p.id,
        customer_name: String(body.customerName || body.name || '').trim(),
        customer_email: String(body.customerEmail || body.email || '').trim().toLowerCase(),
        rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
        title: String(body.title || '').trim(),
        comment: String(body.comment || '').trim(),
        status: 'PENDING',
        verified_purchase: Boolean(body.verifiedPurchase),
      }

      const { data, error } = await supabase
        .from('product_reviews')
        .upsert(payload, { onConflict: 'product_id,customer_email' })
        .select()
        .single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, review: data }
    }
    return await edge(`/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body })
  },
  search: (q) => edge(`/search?q=${encodeURIComponent(q)}`),
  settings: () => edge('/settings'),

  // Cart & Coupon
  cart: async () => {
    const res = await edge('/cart')
    try {
      const saved = localStorage.getItem('invihub_applied_coupon')
      if (saved) {
        const coupon = JSON.parse(saved)
        if (coupon && coupon.code) {
          const items = res?.cart?.items || []
          const subtotal = res?.totals?.subtotal || 0
          if (!coupon.minOrderValue || subtotal >= coupon.minOrderValue) {
            const discount = calculateCouponDiscount(coupon, items, subtotal)
            if (discount > 0) {
              res.totals = {
                ...res.totals,
                discount,
                total: Math.max(0, subtotal - discount + (res.totals?.shipping || 0) + (res.totals?.tax || 0)),
              }
              res.coupon = {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount: discount,
              }
            }
          }
        }
      }
    } catch (_) {}
    return res
  },
  addToCart: (productId, quantity = 1) => edge('/cart', { method: 'POST', body: { productId, quantity } }),
  updateCart: (id, quantity) => edge(`/cart/${id}`, { method: 'PUT', body: { quantity } }),
  removeCart: (id) => edge(`/cart/${id}`, { method: 'DELETE' }),
  applyCoupon: async (code) => {
    const trimmed = String(code || '').trim().toUpperCase()
    if (!trimmed) throw new ApiError('Please enter a coupon code', 400)
    if (supabase) {
      const { data: cp, error: cpErr } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', trimmed)
        .maybeSingle()

      if (cpErr || !cp) throw new ApiError('Invalid coupon code', 400)

      const coupon = mapCoupon(cp)
      if (coupon.status === 'DISABLED' || coupon.status === 'DRAFT') {
        throw new ApiError('This coupon is currently inactive', 400)
      }
      const now = new Date()
      if (now < new Date(coupon.startDate)) {
        throw new ApiError('This coupon has not started yet', 400)
      }
      if (now > new Date(coupon.endDate)) {
        throw new ApiError('This coupon has expired', 400)
      }
      if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
        throw new ApiError('This coupon has reached its maximum usage limit', 400)
      }

      const currentCart = await edge('/cart')
      const items = currentCart?.cart?.items || []
      const subtotal = currentCart?.totals?.subtotal || 0

      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        throw new ApiError(`Minimum order value of ${inr(coupon.minOrderValue)} required for this coupon`, 400)
      }

      const discount = calculateCouponDiscount(coupon, items, subtotal)
      if (discount <= 0 && items.length > 0) {
        throw new ApiError('This coupon is not applicable to the items in your cart', 400)
      }

      try {
        localStorage.setItem('invihub_applied_coupon', JSON.stringify({ ...coupon, discountAmount: discount }))
      } catch (_) {}

      const totals = {
        ...currentCart.totals,
        discount,
        total: Math.max(0, subtotal - discount + (currentCart.totals?.shipping || 0) + (currentCart.totals?.tax || 0)),
      }

      return {
        ...currentCart,
        totals,
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: discount,
        },
      }
    }
    return await edge('/cart/coupon', { method: 'POST', body: { code } })
  },
  removeCoupon: async () => {
    try {
      localStorage.removeItem('invihub_applied_coupon')
    } catch (_) {}
    const currentCart = await edge('/cart')
    return {
      ...currentCart,
      coupon: null,
    }
  },

  checkout: async (payload) => {
    let savedCoupon = null
    try {
      savedCoupon = JSON.parse(localStorage.getItem('invihub_applied_coupon') || 'null')
    } catch (_) {}
    const body = {
      ...payload,
      couponCode: savedCoupon?.code || payload?.couponCode || null,
      couponDiscount: savedCoupon?.discountAmount || null,
    }
    const result = await edge('/checkout', { method: 'POST', body })
    try {
      localStorage.removeItem('invihub_applied_coupon')
    } catch (_) {}

    // Deduct filament variation stock if applicable
    if (result?.orderId && supabase) {
      try {
        const storedVars = JSON.parse(localStorage.getItem('invihub_cart_variations') || '{}')
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, product_id, quantity')
          .eq('order_id', result.orderId)

        for (const item of (orderItems || [])) {
          const variation = storedVars[item.product_id]
          if (variation?.filamentId) {
            const qty = Number(item.quantity) || 1
            // Fetch current stock
            const { data: fil } = await supabase
              .from('filaments')
              .select('stock_spools')
              .eq('id', variation.filamentId)
              .single()

            if (fil) {
              const currentStock = Number(fil.stock_spools || 0)
              if (currentStock < qty) {
                throw new ApiError(
                  `Color "${variation.colorName || 'Selected color'}" is currently out of stock. Please update your cart.`,
                  400
                )
              }
              const newStock = Math.max(0, currentStock - qty)
              await supabase
                .from('filaments')
                .update({ stock_spools: newStock, updated_at: new Date().toISOString() })
                .eq('id', variation.filamentId)

              await supabase.from('filament_movements').insert({
                filament_id: variation.filamentId,
                delta_spools: -qty,
                resulting_stock: newStock,
                reason: 'order_deduct',
                notes: `Deducted for confirmed order #${result.orderNumber || result.orderId}`,
                order_id: String(result.orderId),
              })

              await supabase
                .from('order_items')
                .update({
                  filament_id: variation.filamentId,
                  variation_details_json: JSON.stringify(variation),
                })
                .eq('id', item.id)
            }
          }
        }
        localStorage.removeItem('invihub_cart_variations')
      } catch (err) {
        console.error('Non-blocking filament stock deduction error:', err)
      }
    }

    return rememberAccess(result, payload?.email)
  },
  confirmPay: (orderId) => edge('/checkout/confirm', { method: 'POST', body: { orderId } }),
  createPayment: (orderId) => edge('/payments/create', { method: 'POST', body: { orderId } }),
  order: (id) => edge(`/checkout/orders/${encodeURIComponent(id)}`),

  lookupOrders: (email, orderNumber, accessToken) => {
    const token = accessToken || findOrderAccessToken(orderNumber)
    return edge('/orders/lookup', {
      method: 'POST',
      body: { email, orderNumber, accessToken: token },
    }).then((o) => {
      if (token) saveOrderAccess(orderNumber, { token, email })
      return o
    })
  },
  guestOrder: (id, email, accessToken) => {
    const token = accessToken || findOrderAccessToken(id) || ''
    const q = new URLSearchParams({ email: email || '', accessToken: token })
    return edge(`/orders/${encodeURIComponent(id)}?${q}`)
  },

  customerRegister: async (body) => {
    if (!supabase) throw new ApiError('Supabase is not configured', 503)
    const { data, error } = await supabase.auth.signUp({
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || ''),
      options: {
        data: { name: body.name, phone: body.phone || '' },
      },
    })
    if (error) throw new ApiError(error.message, 400)
    if (!data.session) {
      const login = await supabase.auth.signInWithPassword({
        email: String(body.email || '').trim().toLowerCase(),
        password: String(body.password || ''),
      })
      if (login.error) {
        throw new ApiError(
          login.error.message ||
            'Account created but sign-in requires email confirmation. Disable confirmations in Supabase Auth for test setup.',
          400,
        )
      }
    }
    const ensured = await edge('/customers/ensure', {
      method: 'POST',
      body: { name: body.name, phone: body.phone || '' },
    })
    return ensured.customer ? { customer: ensured.customer } : ensured
  },

  customerLogin: async (email, password) => {
    if (!supabase) throw new ApiError('Supabase is not configured', 503)
    const { error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim().toLowerCase(),
      password: String(password || ''),
    })
    if (error) throw new ApiError(error.message || 'Invalid credentials', 401)
    const ensured = await edge('/customers/ensure', { method: 'POST', body: {} })
    return ensured.customer ? { customer: ensured.customer } : ensured
  },

  customerLogout: async () => {
    try {
      await edge('/customers/logout', { method: 'POST', body: {} })
    } catch {
      /* ignore */
    }
    if (supabase) await supabase.auth.signOut()
    return { ok: true }
  },

  customerMe: async () => {
    if (supabase) {
      try {
        const { data: sessData } = await supabase.auth.getSession()
        const user = sessData?.session?.user
        if (!user) return null
        const { data: cust } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('id', user.id)
          .maybeSingle()
        if (!cust) return null
        return { customer: cust, ...cust }
      } catch {
        return null
      }
    }
    try {
      return await edge('/customers/me')
    } catch (err) {
      if (err.status === 401) return null
      throw err
    }
  },
  customerUpdate: (body) => edge('/customers/me', { method: 'PUT', body }),
  customerAddAddress: (body) => edge('/customers/addresses', { method: 'POST', body }),
  customerDeleteAddress: (id) => edge(`/customers/addresses/${id}`, { method: 'DELETE' }),
  wishlist: () => edge('/customers/wishlist'),
  wishlistAdd: (productId) => edge('/customers/wishlist', { method: 'POST', body: { productId } }),
  wishlistRemove: (productId) => edge(`/customers/wishlist/${productId}`, { method: 'DELETE' }),

  adminLogin: async (email, password) => {
    const data = await edge('/admin/login', { method: 'POST', body: { email, password } })
    if (data.session?.access_token && supabase) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    }
    return { admin: data.admin }
  },
  adminLogout: async () => {
    try {
      await edge('/admin/logout', { method: 'POST', body: {} })
    } catch {
      /* ignore */
    }
    if (supabase) await supabase.auth.signOut()
    return { ok: true }
  },
  adminMe: () => edge('/admin/me'),
  adminDashboard: () => edge('/admin/dashboard'),
  adminCategories: () => edge('/admin/categories'),
  adminSaveCategory: (body, id) =>
    edge(id ? `/admin/categories/${id}` : '/admin/categories', { method: id ? 'PUT' : 'POST', body }),
  adminReorderCategories: (ids) => edge('/admin/categories/reorder', { method: 'PUT', body: { ids } }),
  adminArchiveCategory: (id) => edge(`/admin/categories/${id}/archive`, { method: 'POST', body: {} }),
  adminRestoreCategory: (id) => edge(`/admin/categories/${id}/restore`, { method: 'POST', body: {} }),
  adminAssignProduct: (categoryId, productId) =>
    edge(`/admin/categories/${categoryId}/assign`, { method: 'POST', body: { productId } }),
  adminProducts: () => edge('/admin/products'),
  adminProduct: async (id) => {
    try {
      return await edge(`/admin/products/${id}`)
    } catch (err) {
      if (supabase && (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not found'))) {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_images(*), product_specifications(*), categories(*)')
          .eq('id', id)
          .maybeSingle()
        if (error) throw new ApiError(error.message, 400)
        if (data) {
          let trustBadges = []
          try {
            if (data.trust_badges_json) {
              trustBadges = typeof data.trust_badges_json === 'string' ? JSON.parse(data.trust_badges_json) : data.trust_badges_json
            } else if (data.tags_json) {
              const tags = typeof data.tags_json === 'string' ? JSON.parse(data.tags_json) : (data.tags_json || [])
              trustBadges = (tags || []).filter((t) => typeof t === 'string' && t.startsWith('badge:')).map((t) => t.slice(6))
            }
          } catch {}
          return { ...data, trustBadges: Array.isArray(trustBadges) ? trustBadges : [] }
        }
      }
      throw err
    }
  },
  adminSaveProduct: (body, id) =>
    edge(id ? `/admin/products/${id}` : '/admin/products', { method: id ? 'PUT' : 'POST', body }),
  adminArchive: (id) => edge(`/admin/products/${id}/archive`, { method: 'POST', body: {} }),
  adminRestore: (id) => edge(`/admin/products/${id}/restore`, { method: 'POST', body: {} }),
  adminDeleteProduct: async (id) => {
    try {
      return await edge(`/admin/products/${id}`, { method: 'DELETE' })
    } catch (err) {
      // Fallback: If edge function returns 404 (prior to deploying updated shop-api function),
      // perform deletion directly via the authenticated Supabase client.
      if (supabase && (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not found'))) {
        try {
          await supabase.from('order_items').update({ product_id: null }).eq('product_id', id)
        } catch (_) {}
        try {
          await supabase.from('cart_items').delete().eq('product_id', id)
          await supabase.from('inventory_movements').delete().eq('product_id', id)
          await supabase.from('wishlist_items').delete().eq('product_id', id)
          await supabase.from('product_specifications').delete().eq('product_id', id)
          await supabase.from('product_images').delete().eq('product_id', id)
        } catch (_) {}
        const { error: delErr } = await supabase.from('products').delete().eq('id', id)
        if (delErr) throw new ApiError(delErr.message, 400)
        return { ok: true, deletedId: id }
      }
      throw err
    }
  },
  adminDeleteProductImage: (productId, body) =>
    edge(`/admin/products/${productId}/images`, { method: 'DELETE', body }),
  adminOrders: () => edge('/admin/orders'),
  adminOrder: async (id) => {
    try {
      const res = await edge(`/admin/orders/${id}`)
      if (supabase && res?.items) {
        try {
          const { data: dbItems } = await supabase
            .from('order_items')
            .select('id, filament_id, variation_details_json')
            .eq('order_id', res.id || id)
          if (dbItems && dbItems.length > 0) {
            const map = new Map(dbItems.map((di) => [di.id, di]))
            res.items = res.items.map((it) => {
              const extra = map.get(it.id)
              let details = null
              try {
                details = extra?.variation_details_json ? JSON.parse(extra.variation_details_json) : null
              } catch (_) {}
              return { ...it, filamentId: extra?.filament_id, variationDetails: details }
            })
          }
        } catch (_) {}
      }
      return res
    } catch (err) {
      if (supabase) {
        const { data: o, error } = await supabase
          .from('orders')
          .select('*, customers(*), order_items(*), payments(*)')
          .or(`id.eq.${id},order_number.eq.${id}`)
          .maybeSingle()
        if (error) throw new ApiError(error.message, 400)
        if (!o) throw new ApiError('Order not found', 404)
        return {
          id: o.id,
          orderNumber: o.order_number,
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
          items: (o.order_items || []).map((i) => ({
            id: i.id,
            productId: i.product_id,
            name: i.name,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            lineTotal: i.line_total,
            filamentId: i.filament_id,
            variationDetails: i.variation_details_json ? JSON.parse(i.variation_details_json) : null,
          })),
          payments: o.payments || [],
          customer: o.customers,
        }
      }
      throw err
    }
  },
  adminUpdateOrder: async (id, body) => {
    let res
    try {
      res = await edge(`/admin/orders/${id}`, { method: 'PUT', body })
    } catch (err) {
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .update({ order_status: body.orderStatus, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw new ApiError(error.message, 400)
        res = data
      } else {
        throw err
      }
    }

    // If order was cancelled or refunded, restore any associated filament variations
    if (supabase && (body.orderStatus === 'CANCELLED' || body.orderStatus === 'REFUNDED')) {
      try {
        const { data: items } = await supabase
          .from('order_items')
          .select('id, filament_id, quantity')
          .eq('order_id', id)
          .not('filament_id', 'is', null)

        for (const it of (items || [])) {
          if (it.filament_id && it.quantity > 0) {
            // Check if already restored for this order
            const { data: existingRestores } = await supabase
              .from('filament_movements')
              .select('id')
              .eq('order_id', String(id))
              .eq('filament_id', it.filament_id)
              .eq('reason', 'order_restore')

            if (!existingRestores || existingRestores.length === 0) {
              const { data: fil } = await supabase
                .from('filaments')
                .select('stock_spools')
                .eq('id', it.filament_id)
                .single()

              if (fil) {
                const newStock = Number(fil.stock_spools || 0) + Number(it.quantity)
                await supabase
                  .from('filaments')
                  .update({ stock_spools: newStock, updated_at: new Date().toISOString() })
                  .eq('id', it.filament_id)

                await supabase.from('filament_movements').insert({
                  filament_id: it.filament_id,
                  delta_spools: Number(it.quantity),
                  resulting_stock: newStock,
                  reason: 'order_restore',
                  notes: `Restored from cancelled/refunded order #${id}`,
                  order_id: String(id),
                })
              }
            }
          }
        }
      } catch (restoreErr) {
        console.error('Non-blocking filament restore error:', restoreErr)
      }
    }

    return res
  },
  adminInventory: (params = {}) => edge(`/admin/inventory?${new URLSearchParams(params)}`),
  adminInventoryHistory: (id) => edge(`/admin/inventory/${id}/history`),
  adminAdjustStock: (id, delta, reason, notes = '') =>
    edge(`/admin/inventory/${id}`, { method: 'POST', body: { delta, reason, notes } }),

  // Custom requests
  submitCustomRequest: async (body) => {
    const result = await edge('/customizations/submit', { method: 'POST', body })
    return rememberAccess(result, body?.customerEmail || body?.email)
  },
  lookupCustomRequest: (email, requestNumber, accessToken) => {
    const token = accessToken || findOrderAccessToken(requestNumber)
    return edge('/customizations/lookup', {
      method: 'POST',
      body: { email, requestNumber, accessToken: token },
    }).then((o) => {
      if (token) saveOrderAccess(requestNumber, { token, email })
      return o
    })
  },
  adminCustomRequests: () => edge('/admin/custom-requests'),
  adminCustomRequest: (id) => edge(`/admin/custom-requests/${id}`),
  adminUpdateCustomRequest: (id, body) =>
    edge(`/admin/custom-requests/${id}`, { method: 'PATCH', body }),
  adminCleanupExpiredInventory: (timeoutMinutes = 60) =>
    edge('/admin/inventory/cleanup-expired', { method: 'POST', body: { timeoutMinutes } }),

  // Admin Product Reviews
  adminReviews: async (params = {}) => {
    if (supabase) {
      let query = supabase
        .from('product_reviews')
        .select('*, product:products(id, name, slug, sku)')
        .order('created_at', { ascending: false })

      if (params.status && params.status !== 'ALL') {
        query = query.eq('status', params.status)
      }
      if (params.productId && params.productId !== 'ALL') {
        query = query.eq('product_id', params.productId)
      }
      if (params.rating && params.rating !== 'ALL') {
        query = query.eq('rating', Number(params.rating))
      }

      const { data: rows, error: revErr } = await query
      if (revErr) throw new ApiError(revErr.message, 400)

      const list = (rows || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        product: r.product ? { id: r.product.id, name: r.product.name, slug: r.product.slug, sku: r.product.sku } : null,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        rating: r.rating,
        title: r.title || '',
        comment: r.comment,
        status: r.status,
        verifiedPurchase: Boolean(r.verified_purchase),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))

      // Overall stats
      const { data: allReviews } = await supabase.from('product_reviews').select('rating, status')
      const allList = allReviews || []
      const total = allList.length
      const pending = allList.filter((r) => r.status === 'PENDING').length
      const approved = allList.filter((r) => r.status === 'APPROVED').length
      const rejected = allList.filter((r) => r.status === 'REJECTED').length
      const approvedRatings = allList.filter((r) => r.status === 'APPROVED').map((r) => Number(r.rating) || 0)
      const avg = approvedRatings.length > 0
        ? Math.round((approvedRatings.reduce((a, b) => a + b, 0) / approvedRatings.length) * 10) / 10
        : 0

      return {
        reviews: list,
        stats: {
          total,
          pending,
          approved,
          rejected,
          averageRating: avg,
        },
      }
    }
    return await edge(`/admin/reviews?${new URLSearchParams(params)}`)
  },
  adminApproveReview: async (id) => {
    if (supabase) {
      const { data: updated, error } = await supabase
        .from('product_reviews')
        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, product:products(id, name, slug, sku)')
        .single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, review: updated }
    }
    return await edge(`/admin/reviews/${id}/approve`, { method: 'POST', body: {} })
  },
  adminRejectReview: async (id) => {
    if (supabase) {
      const { data: updated, error } = await supabase
        .from('product_reviews')
        .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, product:products(id, name, slug, sku)')
        .single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, review: updated }
    }
    return await edge(`/admin/reviews/${id}/reject`, { method: 'POST', body: {} })
  },
  adminDeleteReview: async (id) => {
    if (supabase) {
      const { error } = await supabase.from('product_reviews').delete().eq('id', id)
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, deleted: true, id }
    }
    return await edge(`/admin/reviews/${id}`, { method: 'DELETE' })
  },

  // Admin Discount Coupons
  adminCoupons: async (params = {}) => {
    if (supabase) {
      let query = supabase.from('coupons').select('*').order('created_at', { ascending: false })
      if (params.status && params.status !== 'ALL') query = query.eq('status', params.status)
      if (params.discountType && params.discountType !== 'ALL') query = query.eq('discount_type', params.discountType)
      const { data, error } = await query
      if (error) throw new ApiError(error.message, 400)
      return { coupons: (data || []).map(mapCoupon) }
    }
    return await edge(`/admin/coupons?${new URLSearchParams(params)}`)
  },
  adminCoupon: async (id) => {
    if (supabase) {
      const { data: c, error } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle()
      if (error) throw new ApiError(error.message, 400)
      if (!c) throw new ApiError('Coupon not found', 404)
      return { coupon: mapCoupon(c) }
    }
    return await edge(`/admin/coupons/${id}`)
  },
  adminCreateCoupon: async (body) => {
    if (supabase) {
      const payload = {
        code: String(body.code || '').trim().toUpperCase(),
        description: String(body.description || '').trim(),
        discount_type: body.discountType,
        discount_value: Number(body.discountValue),
        start_date: body.startDate,
        end_date: body.endDate,
        min_order_value: Number(body.minOrderValue || 0),
        max_discount_amount: body.maxDiscountAmount ? Number(body.maxDiscountAmount) : null,
        usage_limit: body.usageLimit ? Number(body.usageLimit) : null,
        per_customer_limit: body.perCustomerLimit ? Number(body.perCustomerLimit) : 1,
        applies_to: body.appliesTo || 'ALL',
        product_ids_json: body.productIds || [],
        category_ids_json: body.categoryIds || [],
        evaluation_mode: body.evaluationMode || 'OR',
        status: body.status || 'ACTIVE',
      }
      const { data, error } = await supabase.from('coupons').insert(payload).select().single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, coupon: mapCoupon(data) }
    }
    return await edge('/admin/coupons', { method: 'POST', body })
  },
  adminUpdateCoupon: async (id, body) => {
    if (supabase) {
      const payload = {
        code: String(body.code || '').trim().toUpperCase(),
        description: String(body.description || '').trim(),
        discount_type: body.discountType,
        discount_value: Number(body.discountValue),
        start_date: body.startDate,
        end_date: body.endDate,
        min_order_value: Number(body.minOrderValue || 0),
        max_discount_amount: body.maxDiscountAmount ? Number(body.maxDiscountAmount) : null,
        usage_limit: body.usageLimit ? Number(body.usageLimit) : null,
        per_customer_limit: body.perCustomerLimit ? Number(body.perCustomerLimit) : 1,
        applies_to: body.appliesTo || 'ALL',
        product_ids_json: body.productIds || [],
        category_ids_json: body.categoryIds || [],
        evaluation_mode: body.evaluationMode || 'OR',
        status: body.status || 'ACTIVE',
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase.from('coupons').update(payload).eq('id', id).select().single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, coupon: mapCoupon(data) }
    }
    return await edge(`/admin/coupons/${id}`, { method: 'PUT', body })
  },
  adminUpdateCouponStatus: async (id, status) => {
    if (supabase) {
      const { data, error } = await supabase
        .from('coupons')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, coupon: mapCoupon(data) }
    }
    return await edge(`/admin/coupons/${id}/status`, { method: 'PATCH', body: { status } })
  },
  adminDeleteCoupon: async (id) => {
    if (supabase) {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, deleted: true, id }
    }
    return await edge(`/admin/coupons/${id}`, { method: 'DELETE' })
  },

  // ── Filament Inventory & Product Variations ──────────────────────────────
  adminFilaments: async (params = {}) => {
    if (supabase) {
      const { data: allRows, error: allErr } = await supabase
        .from('filaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (allErr) throw new ApiError(allErr.message, 400)

      const all = (allRows || []).map(mapFilament)

      // Compute inventory KPI summary
      const totalTypes = all.length
      const totalSpools = all.reduce((sum, f) => sum + (f.stockSpools || 0), 0)
      const totalWeightKg = Math.round(all.reduce((sum, f) => sum + ((f.stockSpools * f.weightGrams) / 1000), 0) * 10) / 10
      const lowStockCount = all.filter((f) => f.status === 'LOW_STOCK').length
      const outOfStockCount = all.filter((f) => f.status === 'OUT_OF_STOCK').length

      let filtered = all
      if (params.material && params.material !== 'ALL') {
        filtered = filtered.filter((f) => String(f.material || '').toUpperCase() === String(params.material).toUpperCase())
      }
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter((f) => f.status === params.status)
      }
      if (params.q) {
        const query = String(params.q).toLowerCase().trim()
        filtered = filtered.filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            f.material.toLowerCase().includes(query) ||
            f.colorName.toLowerCase().includes(query) ||
            f.sku.toLowerCase().includes(query) ||
            f.supplier.toLowerCase().includes(query)
        )
      }

      return {
        filaments: filtered,
        summary: {
          totalTypes,
          totalSpools,
          totalWeightKg,
          lowStockCount,
          outOfStockCount,
        },
      }
    }
    return await edge(`/admin/filaments?${new URLSearchParams(params)}`)
  },

  adminFilament: async (id) => {
    if (supabase) {
      const { data, error } = await supabase.from('filaments').select('*').eq('id', id).maybeSingle()
      if (error) throw new ApiError(error.message, 400)
      if (!data) throw new ApiError('Filament not found', 404)
      return { filament: mapFilament(data) }
    }
    return await edge(`/admin/filaments/${id}`)
  },

  adminCreateFilament: async (body) => {
    if (supabase) {
      const initialStock = Math.max(0, parseInt(body.stockSpools, 10) || 0)
      const payload = {
        name: String(body.name || '').trim(),
        material: String(body.material || 'PLA').trim().toUpperCase(),
        color_name: String(body.colorName || '').trim(),
        color_hex: String(body.colorHex || '#000000').trim(),
        diameter: Number(body.diameter || 1.75),
        weight_grams: Number(body.weightGrams || 1000),
        stock_spools: initialStock,
        sku: body.sku ? String(body.sku).trim().toUpperCase() : `FIL-${Date.now().toString(36).toUpperCase()}`,
        supplier: body.supplier ? String(body.supplier).trim() : null,
        cost_per_spool: Number(body.costPerSpool || 0),
        low_stock_threshold: Math.max(1, parseInt(body.lowStockThreshold, 10) || 5),
        notes: body.notes ? String(body.notes).trim() : null,
        is_active: body.isActive !== false,
      }

      const { data, error } = await supabase.from('filaments').insert(payload).select().single()
      if (error) throw new ApiError(error.message, 400)

      if (initialStock > 0) {
        try {
          await supabase.from('filament_movements').insert({
            filament_id: data.id,
            delta_spools: initialStock,
            resulting_stock: initialStock,
            reason: 'received',
            notes: 'Initial stock entry on creation',
          })
        } catch (_) {}
      }

      return { ok: true, filament: mapFilament(data) }
    }
    return await edge('/admin/filaments', { method: 'POST', body })
  },

  adminUpdateFilament: async (id, body) => {
    if (supabase) {
      const payload = {
        name: String(body.name || '').trim(),
        material: String(body.material || 'PLA').trim().toUpperCase(),
        color_name: String(body.colorName || '').trim(),
        color_hex: String(body.colorHex || '#000000').trim(),
        diameter: Number(body.diameter || 1.75),
        weight_grams: Number(body.weightGrams || 1000),
        sku: body.sku ? String(body.sku).trim().toUpperCase() : null,
        supplier: body.supplier ? String(body.supplier).trim() : null,
        cost_per_spool: Number(body.costPerSpool || 0),
        low_stock_threshold: Math.max(1, parseInt(body.lowStockThreshold, 10) || 5),
        notes: body.notes ? String(body.notes).trim() : null,
        is_active: body.isActive !== false,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from('filaments').update(payload).eq('id', id).select().single()
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, filament: mapFilament(data) }
    }
    return await edge(`/admin/filaments/${id}`, { method: 'PUT', body })
  },

  adminAdjustFilamentStock: async (id, delta, reason = 'adjustment', notes = '', orderId = null) => {
    if (supabase) {
      const deltaSpools = parseInt(delta, 10) || 0
      if (deltaSpools === 0) throw new ApiError('Adjustment delta cannot be zero', 400)

      const { data: current, error: getErr } = await supabase.from('filaments').select('*').eq('id', id).single()
      if (getErr || !current) throw new ApiError('Filament not found', 404)

      const newStock = Number(current.stock_spools || 0) + deltaSpools
      if (newStock < 0) {
        throw new ApiError(`Cannot adjust stock below 0. Current stock is ${current.stock_spools} spools.`, 400)
      }

      const { data: updated, error: updErr } = await supabase
        .from('filaments')
        .update({ stock_spools: newStock, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (updErr) throw new ApiError(updErr.message, 400)

      await supabase.from('filament_movements').insert({
        filament_id: id,
        delta_spools: deltaSpools,
        resulting_stock: newStock,
        reason: String(reason || 'adjustment'),
        notes: String(notes || ''),
        order_id: orderId ? String(orderId) : null,
      })

      return { ok: true, newStock, filament: mapFilament(updated) }
    }
    return await edge(`/admin/filaments/${id}/adjust`, { method: 'POST', body: { delta, reason, notes, orderId } })
  },

  adminFilamentHistory: async (filamentId) => {
    if (supabase) {
      const { data, error } = await supabase
        .from('filament_movements')
        .select('*')
        .eq('filament_id', filamentId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw new ApiError(error.message, 400)

      const movements = (data || []).map((m) => ({
        id: m.id,
        filamentId: m.filament_id,
        deltaSpools: m.delta_spools,
        resultingStock: m.resulting_stock,
        reason: m.reason,
        notes: m.notes || '',
        orderId: m.order_id || null,
        createdAt: m.created_at,
      }))

      return { movements }
    }
    return await edge(`/admin/filaments/${filamentId}/history`)
  },

  adminDeleteFilament: async (id) => {
    if (supabase) {
      const { error } = await supabase.from('filaments').delete().eq('id', id)
      if (error) throw new ApiError(error.message, 400)
      return { ok: true, deleted: true, id }
    }
    return await edge(`/admin/filaments/${id}`, { method: 'DELETE' })
  },

  adminProductFilamentVariations: async (productIdOrSlug) => {
    if (supabase) {
      const productId = await resolveProductId(productIdOrSlug)
      if (!productId) return []

      const { data, error } = await supabase
        .from('product_filament_variations')
        .select('*, filament:filaments(*)')
        .eq('product_id', productId)
        .order('created_at', { ascending: true })

      if (error) throw new ApiError(error.message, 400)

      return (data || []).map((pv) => ({
        id: pv.id,
        productId: pv.product_id,
        filamentId: pv.filament_id,
        priceAdjustment: Number(pv.price_adjustment || 0),
        isAvailable: Boolean(pv.is_available),
        filament: mapFilament(pv.filament),
      }))
    }
    return await edge(`/admin/products/${productIdOrSlug}/filaments`)
  },

  adminSaveProductFilamentVariations: async (productIdOrSlug, variations = []) => {
    if (supabase) {
      const productId = await resolveProductId(productIdOrSlug)
      if (!productId) throw new ApiError('Product not found to save variations', 400)

      // 1. Deduplicate by filament_id to guarantee no duplicate keys in the batch
      const uniqueMap = new Map()
      for (const v of (variations || [])) {
        const filId = v.filamentId || v.filament_id
        if (filId) {
          uniqueMap.set(filId, {
            product_id: productId,
            filament_id: filId,
            price_adjustment: Number(v.priceAdjustment || v.price_adjustment || 0),
            is_available: v.isAvailable !== false,
          })
        }
      }
      const rows = Array.from(uniqueMap.values())
      const activeFilamentIds = rows.map((r) => r.filament_id)

      // 2. Clear out any variations for this product that are no longer assigned
      try {
        if (activeFilamentIds.length > 0) {
          await supabase
            .from('product_filament_variations')
            .delete()
            .eq('product_id', productId)
            .not('filament_id', 'in', `(${activeFilamentIds.join(',')})`)
        } else {
          await supabase
            .from('product_filament_variations')
            .delete()
            .eq('product_id', productId)
        }
      } catch (_) {}

      // 3. Upsert with onConflict so existing keys update cleanly without 409 Conflict
      if (rows.length > 0) {
        const { error } = await supabase
          .from('product_filament_variations')
          .upsert(rows, { onConflict: 'product_id,filament_id' })
        if (error) throw new ApiError(error.message, 400)
      }
      return { ok: true }
    }
    return await edge(`/admin/products/${productIdOrSlug}/filaments`, { method: 'PUT', body: { variations } })
  },

  productFilamentVariations: async (productIdOrSlug) => {
    if (supabase) {
      const productId = await resolveProductId(productIdOrSlug)
      if (!productId) return []

      const { data, error } = await supabase
        .from('product_filament_variations')
        .select('*, filament:filaments(*)')
        .eq('product_id', productId)
        .order('created_at', { ascending: true })

      if (error) return []

      return (data || [])
        .filter((pv) => pv.filament)
        .map((pv) => ({
          id: pv.id,
          productId: pv.product_id,
          filamentId: pv.filament_id,
          priceAdjustment: Number(pv.price_adjustment || 0),
          isAvailable: Boolean(pv.is_available && pv.filament?.is_active !== false),
          filament: mapFilament(pv.filament),
        }))
    }
    return await edge(`/products/${encodeURIComponent(productIdOrSlug)}/filaments`).catch(() => [])
  },

  upload: async (file) => {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    const data = await edge('/admin/upload', {
      method: 'POST',
      body: {
        fileName: file.name,
        contentType: file.type,
        base64,
      },
    })
    return data.url
  },
  deleteUpload: (url) => edge('/admin/upload', { method: 'DELETE', body: { url } }),
}

export function inr(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
}
