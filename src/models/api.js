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

export const api = {
  health: () => edge('/health'),
  categories: () => edge('/categories'),
  products: (params = {}) => edge(`/products?${new URLSearchParams(params)}`),
  product: (slug) => edge(`/products/${encodeURIComponent(slug)}`),
  productReviews: async (slug) => {
    try {
      return await edge(`/products/${encodeURIComponent(slug)}/reviews`)
    } catch (err) {
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
    }
  },
  submitProductReview: (slug, body) =>
    edge(`/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body }),
  search: (q) => edge(`/search?q=${encodeURIComponent(q)}`),
  settings: () => edge('/settings'),

  cart: () => edge('/cart'),
  addToCart: (productId, quantity = 1) => edge('/cart', { method: 'POST', body: { productId, quantity } }),
  updateCart: (id, quantity) => edge(`/cart/${id}`, { method: 'PUT', body: { quantity } }),
  removeCart: (id) => edge(`/cart/${id}`, { method: 'DELETE' }),

  checkout: async (payload) => {
    const result = await edge('/checkout', { method: 'POST', body: payload })
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
        const { data } = await supabase.auth.getSession()
        if (!data?.session?.access_token) return null
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
  adminOrder: (id) => edge(`/admin/orders/${id}`),
  adminUpdateOrder: (id, body) => edge(`/admin/orders/${id}`, { method: 'PUT', body }),
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
  adminReviews: (params = {}) => edge(`/admin/reviews?${new URLSearchParams(params)}`),
  adminApproveReview: (id) => edge(`/admin/reviews/${id}/approve`, { method: 'POST', body: {} }),
  adminRejectReview: (id) => edge(`/admin/reviews/${id}/reject`, { method: 'POST', body: {} }),
  adminDeleteReview: (id) => edge(`/admin/reviews/${id}`, { method: 'DELETE' }),

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
