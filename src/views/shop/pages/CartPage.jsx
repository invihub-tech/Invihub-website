import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck, ChevronRight, Tag, X, CheckCircle2, AlertCircle } from 'lucide-react'

const FREE_SHIPPING_THRESHOLD = 999

export default function CartPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState(null)
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

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      const res = await api.applyCoupon(couponCode.trim())
      setData(res)
      setCouponFeedback({ type: 'success', message: `Coupon "${couponCode.trim().toUpperCase()}" applied!` })
      setCouponCode('')
      window.dispatchEvent(new Event('invi-cart'))
    } catch (err) {
      setCouponFeedback({ type: 'error', message: err.message || 'Failed to apply coupon' })
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = async () => {
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      const res = await api.removeCoupon()
      setData(res)
      setCouponFeedback({ type: 'success', message: 'Coupon removed' })
      window.dispatchEvent(new Event('invi-cart'))
    } catch (err) {
      setCouponFeedback({ type: 'error', message: err.message || 'Failed to remove coupon' })
    } finally {
      setCouponLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <main className="w-full px-4 sm:px-6 lg:px-8 py-20 text-center">
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

  // Reverse-GST calculations (MRP entered is GST-inclusive @ 18%)
  const discount = totals.discount || 0
  const afterDiscount = Math.max(0, subtotal - discount)
  const shippingCharge = Number(totals.shipping || 0)

  // Base price (MRP excl. 18% GST) = MRP / 1.18
  const productBase = totals.productBase ?? Math.round((afterDiscount / 1.18) * 100) / 100
  // Product 18% GST = MRP - Base Price (split equally into 9% CGST and 9% SGST)
  const productTax = totals.productTax ?? Math.round((afterDiscount - productBase) * 100) / 100
  const productCgst = totals.productCgst ?? Math.round((productTax / 2) * 100) / 100
  const productSgst = totals.productSgst ?? Math.round((productTax - productCgst) * 100) / 100

  // Delivery 5% GST split: 2.5% CGST + 2.5% SGST
  const deliveryCgst = totals.deliveryCgst ?? (shippingCharge > 0 ? Math.round(shippingCharge * 0.025 * 100) / 100 : 0)
  const deliverySgst = totals.deliverySgst ?? (shippingCharge > 0 ? Math.round(shippingCharge * 0.025 * 100) / 100 : 0)
  const deliveryTax = Math.round((deliveryCgst + deliverySgst) * 100) / 100

  const totalCgst = Math.round((productCgst + deliveryCgst) * 100) / 100
  const totalSgst = Math.round((productSgst + deliverySgst) * 100) / 100
  const totalTax = Math.round((totalCgst + totalSgst) * 100) / 100
  // Grand Total = MRP (which already includes product GST) + Delivery + Delivery GST
  const grandTotal = Math.round((afterDiscount + shippingCharge + deliveryTax) * 100) / 100

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
                  className={`h-full transition-all duration-500 rounded-full ${shippingProgress >= 100 ? 'bg-emerald-500' : 'bg-[#f97316]'
                    }`}
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>

            {/* Item Rows */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {items.map((item) => {
                const product = item.product || {}
                const name = item.name || product.name || 'Product'
                const unitPrice = Number(item.unitPrice ?? product.price ?? 0)
                const qty = Number(item.quantity || 1)
                const lineTotal = Number(item.lineTotal ?? (unitPrice * qty))
                const imgUrl = product.images?.[0]?.url || item.imageUrl
                const isUpdating = updatingId === item.id

                return (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-2">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={name}
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
                        {name}
                      </Link>
                      {(() => {
                        let itemVar = null
                        try {
                          const vars = JSON.parse(localStorage.getItem('invihub_cart_variations') || '{}')
                          itemVar = vars[item.productId || product.id]
                        } catch (_) {}
                        if (!itemVar) return null
                        return (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-slate-300 shadow-inner shrink-0"
                              style={{ backgroundColor: itemVar.colorHex || '#000000' }}
                            />
                            <span className="font-semibold text-slate-800">{itemVar.material} · {itemVar.colorName}</span>
                            <span className="text-slate-400">
                              ({itemVar.diameter}mm, {itemVar.weightGrams >= 1000 ? `${itemVar.weightGrams / 1000}kg` : `${itemVar.weightGrams}g`})
                            </span>
                          </div>
                        )
                      })()}
                      <div className="text-xs text-slate-500 mt-0.5">
                        Unit Price: <span className="font-semibold text-slate-800">{inr(unitPrice)}</span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden shadow-inner">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdate(item.id, qty - 1)}
                          className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 text-xs disabled:opacity-40 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-900 min-w-8 text-center bg-white">
                          {qty}
                        </span>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdate(item.id, qty + 1)}
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
                        {inr(lineTotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Price Details Summary */}
          <aside className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 sticky top-36">
            {/* Coupon Code Section */}
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Tag size={14} className="text-[#f97316]" />
                <span>Apply Discount Coupon</span>
              </label>

              {data?.coupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-mono font-bold tracking-wider">{data.coupon.code}</span>
                      <span className="text-[11px] text-emerald-600 block">
                        Saved {inr(totals.discount)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={couponLoading}
                    className="p-1 rounded hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 transition-colors"
                    title="Remove coupon"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 px-3 py-2 text-xs uppercase font-mono rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:border-[#f97316] placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? 'Checking…' : 'Apply'}
                  </button>
                </form>
              )}

              {couponFeedback && (
                <div
                  className={`text-[11px] p-2 rounded flex items-center gap-1.5 ${
                    couponFeedback.type === 'success'
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                      : 'text-red-600 bg-red-50 border border-red-100'
                  }`}
                >
                  {couponFeedback.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{couponFeedback.message}</span>
                </div>
              )}
            </div>

            <h2 className="text-base font-extrabold text-slate-900 pb-3 border-b border-slate-100 uppercase tracking-wide">
              Price Details
            </h2>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Base Price ({items.length} items, excl. GST)</span>
                <span className="font-semibold text-slate-800">{inr(productBase, 2)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <span>Discount</span>
                    {data?.coupon?.code && (
                      <span className="font-mono text-[10px] bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">
                        ({data.coupon.code})
                      </span>
                    )}
                  </span>
                  <span>-{inr(totals.discount, 2)}</span>
                </div>
              )}

              {/* Product GST split (18%: 9% CGST + 9% SGST) */}
              <div className="flex justify-between text-slate-500 text-[11px] pl-2 border-l-2 border-orange-200">
                <span>Product CGST (9%)</span>
                <span>{inr(productCgst, 2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pl-2 border-l-2 border-orange-200">
                <span>Product SGST (9%)</span>
                <span>{inr(productSgst, 2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span>
                  {shippingCharge > 0 ? inr(shippingCharge, 2) : <strong className="text-emerald-600">FREE</strong>}
                </span>
              </div>

              {/* Delivery GST split (5%: 2.5% CGST + 2.5% SGST) */}
              {shippingCharge > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 text-[11px] pl-2 border-l-2 border-slate-300">
                    <span>Delivery CGST (2.5%)</span>
                    <span>{inr(deliveryCgst, 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px] pl-2 border-l-2 border-slate-300">
                    <span>Delivery SGST (2.5%)</span>
                    <span>{inr(deliverySgst, 2)}</span>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline text-slate-900 font-black text-base">
                <span>Total Amount</span>
                <span className="text-xl text-[#f97316]">{inr(grandTotal, 2)}</span>
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
