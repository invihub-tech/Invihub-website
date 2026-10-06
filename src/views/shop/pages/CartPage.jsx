import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, ChevronRight } from 'lucide-react'

const FREE_SHIPPING_THRESHOLD = 999

export default function CartPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.cart()
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const ping = async () => {
    await load()
    window.dispatchEvent(new Event('invi-cart'))
  }

  const handleUpdate = async (itemId, quantity) => {
    setUpdatingId(itemId)
    try {
      if (quantity <= 0) {
        await api.removeCart(itemId)
      } else {
        await api.updateCart(itemId, quantity)
      }
      await ping()
    } catch {
      /* ignore */
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading your cart items…</p>
      </main>
    )
  }

  const items = data?.cart?.items || []
  const totals = data?.totals || {}
  const subtotal = totals.subtotal || items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0)
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link to="/shop" className="hover:text-slate-900 transition-colors">
          Shop
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        <span className="font-semibold text-slate-900">Shopping Cart</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShoppingBag className="text-[#f97316]" size={28} />
          <span>Shopping Cart</span>
          {items.length > 0 && (
            <span className="text-sm font-semibold text-slate-400 font-normal">
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          )}
        </h1>
        <Link
          to="/shop/products"
          className="text-xs font-semibold text-[#f97316] hover:text-[#ea580c] flex items-center gap-1"
        >
          <span>Continue Shopping</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-20 h-20 rounded-full bg-orange-50 text-[#f97316] flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Your shopping cart is empty</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Browse our precision 3D printers, engineering filaments, and electronics components to build your next project.
          </p>
          <Link to="/shop/products" className="btn-shop-primary mt-6 text-xs px-6 py-3">
            Explore Catalogue Now →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Items Column */}
          <div className="lg:col-span-8 space-y-4">
            {/* Free Shipping Alert Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-slate-800 font-semibold">
                  <Truck size={16} className="text-[#f97316]" />
                  {amountToFreeShipping > 0 ? (
                    <span>
                      Add <strong className="text-[#f97316]">{inr(amountToFreeShipping)}</strong> more to get{' '}
                      <strong>FREE Delivery</strong>!
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">Awesome! You have unlocked FREE Express Delivery!</span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-slate-500">{shippingProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    shippingProgress >= 100 ? 'bg-emerald-500' : 'bg-[#f97316]'
                  }`}
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>

            {/* Item Rows */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {items.map((item) => {
                const product = item.product || {}
                const imgUrl = product.images?.[0]?.url || item.imageUrl
                const isUpdating = updatingId === item.id

                return (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-2">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <span className="text-xs text-slate-300">No img</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {product.brand || 'INVIHUB'}
                      </div>
                      <Link
                        to={`/shop/product/${product.slug || item.productId}`}
                        className="font-bold text-sm text-slate-900 hover:text-[#f97316] line-clamp-1 transition-colors"
                      >
                        {item.name}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Unit Price: <span className="font-semibold text-slate-800">{inr(item.unitPrice)}</span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-inner">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdate(item.id, item.quantity - 1)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs disabled:opacity-40 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-900 min-w-8 text-center bg-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdate(item.id, item.quantity + 1)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs disabled:opacity-40 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdate(item.id, 0)}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove from cart"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right sm:min-w-24">
                      <span className="text-sm font-black text-slate-900 block">
                        {inr(item.lineTotal || item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Price Details Summary */}
          <aside className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 sticky top-36">
            <h2 className="text-base font-extrabold text-slate-900 pb-3 border-b border-slate-100 uppercase tracking-wide">
              Price Details
            </h2>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Price ({items.length} items)</span>
                <span className="font-semibold text-slate-800">{inr(totals.subtotal || subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount</span>
                  <span>-{inr(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span>
                  {totals.shipping > 0 ? inr(totals.shipping) : <strong className="text-emerald-600">FREE</strong>}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Applicable GST (18%)</span>
                <span>{inr(totals.tax || Math.round(subtotal * 0.18))}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-slate-900 font-black text-base">
                <span>Total Amount</span>
                <span className="text-xl text-[#f97316]">{inr(totals.total || subtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/shop/checkout')}
              className="btn-shop-primary w-full py-3 text-xs font-bold gap-2 shadow-lg shadow-orange-950/20"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Safe & Secure 256-bit SSL Checkout</span>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
