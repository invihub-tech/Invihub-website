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
  const headers = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    'x-cart-token': getCartToken(),
  }
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    headers.Authorization = `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
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
  if (!res.ok) throw new ApiError(data.error || res.statusText, res.status)
  return data
}

function rememberAccess(result, email) {
  if (result?.orderNumber && result?.accessToken) {
    saveOrderAccess(result.orderNumber, {
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
      // If project still requires email confirm, session may be null
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

  customerMe: () => edge('/customers/me'),
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
  adminSaveProduct: (body, id) =>
    edge(id ? `/admin/products/${id}` : '/admin/products', { method: id ? 'PUT' : 'POST', body }),
  adminArchive: (id) => edge(`/admin/products/${id}/archive`, { method: 'POST', body: {} }),
  adminRestore: (id) => edge(`/admin/products/${id}/restore`, { method: 'POST', body: {} }),
  adminDuplicate: (id) => edge(`/admin/products/${id}/duplicate`, { method: 'POST', body: {} }),
  adminDeleteProductImage: (productId, body) =>
    edge(`/admin/products/${productId}/images`, { method: 'DELETE', body }),
  adminOrders: () => edge('/admin/orders'),
  adminOrder: (id) => edge(`/admin/orders/${id}`),
  adminUpdateOrder: (id, body) => edge(`/admin/orders/${id}`, { method: 'PUT', body }),
  adminInventory: (params = {}) => edge(`/admin/inventory?${new URLSearchParams(params)}`),
  adminInventoryHistory: (id) => edge(`/admin/inventory/${id}/history`),
  adminAdjustStock: (id, delta, reason, notes = '') =>
    edge(`/admin/inventory/${id}`, { method: 'POST', body: { delta, reason, notes } }),

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
