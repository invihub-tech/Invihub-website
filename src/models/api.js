const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function req(path, options = {}) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
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

export const api = {
  health: () => req('/api/health'),
  categories: () => req('/api/categories'),
  products: (params = {}) => req(`/api/products?${new URLSearchParams(params)}`),
  product: (slug) => req(`/api/products/${slug}`),
  search: (q) => req(`/api/search?q=${encodeURIComponent(q)}`),
  settings: () => req('/api/settings'),
  cart: () => req('/api/cart'),
  addToCart: (productId, quantity = 1) => req('/api/cart', { method: 'POST', body: { productId, quantity } }),
  updateCart: (id, quantity) => req(`/api/cart/${id}`, { method: 'PUT', body: { quantity } }),
  removeCart: (id) => req(`/api/cart/${id}`, { method: 'DELETE' }),
  checkout: (payload) => req('/api/checkout', { method: 'POST', body: payload }),
  confirmPay: (orderId) => req('/api/checkout/confirm', { method: 'POST', body: { orderId } }),
  createPayment: (orderId) => req('/api/payments/create', { method: 'POST', body: { orderId } }),
  order: (id) => req(`/api/checkout/orders/${id}`),
  lookupOrders: (email, orderNumber) => req('/api/orders/lookup', { method: 'POST', body: { email, orderNumber } }),
  guestOrder: (id, email) => req(`/api/orders/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`),
  customerRegister: (body) => req('/api/customers/register', { method: 'POST', body }),
  customerLogin: (email, password) => req('/api/customers/login', { method: 'POST', body: { email, password } }),
  customerLogout: () => req('/api/customers/logout', { method: 'POST', body: {} }),
  customerMe: () => req('/api/customers/me'),
  customerUpdate: (body) => req('/api/customers/me', { method: 'PUT', body }),
  customerAddAddress: (body) => req('/api/customers/addresses', { method: 'POST', body }),
  customerDeleteAddress: (id) => req(`/api/customers/addresses/${id}`, { method: 'DELETE' }),
  wishlist: () => req('/api/customers/wishlist'),
  wishlistAdd: (productId) => req('/api/customers/wishlist', { method: 'POST', body: { productId } }),
  wishlistRemove: (productId) => req(`/api/customers/wishlist/${productId}`, { method: 'DELETE' }),
  adminLogin: (email, password) => req('/api/admin/login', { method: 'POST', body: { email, password } }),
  adminLogout: () => req('/api/admin/logout', { method: 'POST', body: {} }),
  adminMe: () => req('/api/admin/me'),
  adminDashboard: () => req('/api/admin/dashboard'),
  adminCategories: () => req('/api/admin/categories'),
  adminSaveCategory: (body, id) => req(id ? `/api/admin/categories/${id}` : '/api/admin/categories', { method: id ? 'PUT' : 'POST', body }),
  adminReorderCategories: (ids) => req('/api/admin/categories/reorder', { method: 'PUT', body: { ids } }),
  adminArchiveCategory: (id) => req(`/api/admin/categories/${id}/archive`, { method: 'POST', body: {} }),
  adminRestoreCategory: (id) => req(`/api/admin/categories/${id}/restore`, { method: 'POST', body: {} }),
  adminAssignProduct: (categoryId, productId) => req(`/api/admin/categories/${categoryId}/assign`, { method: 'POST', body: { productId } }),
  adminProducts: () => req('/api/admin/products'),
  adminSaveProduct: (body, id) => req(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body }),
  adminArchive: (id) => req(`/api/admin/products/${id}/archive`, { method: 'POST', body: {} }),
  adminRestore: (id) => req(`/api/admin/products/${id}/restore`, { method: 'POST', body: {} }),
  adminDuplicate: (id) => req(`/api/admin/products/${id}/duplicate`, { method: 'POST', body: {} }),
  adminDeleteProductImage: (productId, body) => req(`/api/admin/products/${productId}/images`, { method: 'DELETE', body }),
  adminOrders: () => req('/api/admin/orders'),
  adminOrder: (id) => req(`/api/admin/orders/${id}`),
  adminUpdateOrder: (id, body) => req(`/api/admin/orders/${id}`, { method: 'PUT', body }),
  adminInventory: (params = {}) => req(`/api/admin/inventory?${new URLSearchParams(params)}`),
  adminInventoryHistory: (id) => req(`/api/admin/inventory/${id}/history`),
  adminAdjustStock: (id, delta, reason, notes = '') => req(`/api/admin/inventory/${id}`, { method: 'POST', body: { delta, reason, notes } }),
  upload: async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/api/admin/upload`, { method: 'POST', credentials: 'include', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(data.error || 'Upload failed', res.status)
    return data.url
  },
  deleteUpload: (url) => req('/api/admin/upload', { method: 'DELETE', body: { url } }),
}

export function inr(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
}
