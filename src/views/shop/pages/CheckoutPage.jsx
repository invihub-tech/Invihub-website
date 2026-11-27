import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { ShieldCheck, Truck, CreditCard, CheckCircle2, Lock, Tag, X, AlertCircle } from 'lucide-react'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pinCode: '',
    billingSame: true,
    paymentMethod: 'RAZORPAY',
  })

  useEffect(() => {
    api.cart().then((data) => {
      setCart(data)
      setForm((f) => ({
        ...f,
        paymentMethod: 'RAZORPAY',
      }))
    })
    api
      .customerMe()
      .then((d) => {
        const addr = d.addresses?.find((a) => a.isDefault) || d.addresses?.[0]
        setForm((f) => ({
          ...f,
          name: d.customer.name || f.name,
          email: d.customer.email || f.email,
          phone: d.customer.phone || f.phone,
          line1: addr?.line1 || f.line1,
          line2: addr?.line2 || f.line2,
          city: addr?.city || f.city,
          state: addr?.state || f.state,
          pinCode: addr?.pinCode || f.pinCode,
        }))
      })
      .catch(() => { })
  }, [])

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      const res = await api.applyCoupon(couponCode.trim())
      setCart(res)
      setCouponFeedback({ type: 'success', message: `Coupon "${couponCode.trim().toUpperCase()}" applied!` })
      setCouponCode('')
      window.dispatchEvent(new Event('invi-cart'))
    } catch (ex) {
      setCouponFeedback({ type: 'error', message: ex.message || 'Failed to apply coupon' })
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = async () => {
    setCouponLoading(true)
    setCouponFeedback(null)
    try {
      const res = await api.removeCoupon()
      setCart(res)
      setCouponFeedback({ type: 'success', message: 'Coupon removed' })
      window.dispatchEvent(new Event('invi-cart'))
    } catch (ex) {
      setCouponFeedback({ type: 'error', message: ex.message || 'Failed to remove coupon' })
    } finally {
      setCouponLoading(false)
    }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const created = await api.checkout(form)
      if (created.requiresOnlineConfirm) {
        await api.confirmPay(created.orderId)
      }
      window.dispatchEvent(new Event('invi-cart'))
      navigate(
        `/shop/order-success?order=${encodeURIComponent(created.orderNumber)}&pay=${encodeURIComponent(
          created.paymentMethod,
        )}`,
      )
    } catch (ex) {
      setErr(ex.message || 'Payment processing failed')
    } finally {
      setBusy(false)
    }
  }

  if (!cart) {
    return (
      <main className="w-full px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Securing checkout session…</p>
      </main>
    )
  }

  const items = cart.cart?.items || []
  const totals = cart.totals || {}

  // Reverse-GST calculations (MRP entered is GST-inclusive @ 18%)
  const subtotal = totals.subtotal || 0
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
      {/* Checkout step progress */}
      <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-bold text-slate-400 py-3 px-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <span className="text-slate-400">① Customer</span>
        <span>→</span>
        <span className="text-[#f97316] flex items-center gap-1">
          <Truck size={13} /> ② Delivery & Payment
        </span>
        <span>→</span>
        <span className="text-slate-400">③ Confirmation</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Delivery Address & Payment */}
        <form onSubmit={handlePay} className="lg:col-span-7 space-y-6">
          {/* Shipping Address Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Truck className="text-[#f97316]" size={18} />
              <span>Delivery Address</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  placeholder="Recipient Name"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                  value={form.name}
                  onChange={set('name')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  required
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (for order updates) *</label>
              <input
                required
                type="email"
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                value={form.email}
                onChange={set('email')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Street Address / Door No. *</label>
              <input
                required
                placeholder="House / Flat / Block / Street"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                value={form.line1}
                onChange={set('line1')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Apartment, suite, landmark (optional)</label>
              <input
                placeholder="Near landmark, sector, floor"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                value={form.line2}
                onChange={set('line2')}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                <input
                  required
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                  value={form.city}
                  onChange={set('city')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                <input
                  required
                  placeholder="State"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                  value={form.state}
                  onChange={set('state')}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code *</label>
                <input
                  required
                  placeholder="PIN"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                  value={form.pinCode}
                  onChange={set('pinCode')}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.billingSame}
                onChange={set('billingSame')}
                className="rounded text-[#f97316] focus:ring-[#f97316]"
              />
              <span>Billing address is same as delivery address</span>
            </label>
          </div>

          {/* Default Online Payment Note */}
          <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="text-[#f97316]" size={18} />
                <span className="text-base font-extrabold text-slate-900">Payment Method</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck size={12} className="text-emerald-600" /> 100% Secure
              </span>
            </div>

            <div className="rounded-xl bg-orange-50/40 border border-orange-200/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#f97316]" />
                  <span className="text-xs font-bold text-slate-900">
                    Online Payment (Default)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#f97316] bg-white px-2 py-0.5 rounded border border-orange-200">
                  Razorpay Secure
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                All orders are processed through secure online checkout. Pay instantly using your preferred method:
              </p>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="rounded-md bg-white px-2 py-1 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs">
                  UPI (GPay / PhonePe / Paytm)
                </span>
                <span className="rounded-md bg-white px-2 py-1 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs">
                  Credit / Debit Cards
                </span>
                <span className="rounded-md bg-white px-2 py-1 border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs">
                  NetBanking
                </span>
              </div>
            </div>
          </div>

          {err && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="btn-shop-primary w-full py-4 text-sm font-extrabold gap-2 shadow-xl shadow-orange-950/20"
          >
            <Lock size={16} />
            <span>{busy ? 'Processing Order…' : `Pay & Place Order • ${inr(grandTotal, 2)}`}</span>
          </button>
        </form>

        {/* Right Summary Column */}
        <aside className="lg:col-span-5 space-y-5 sticky top-36">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
              Order Summary ({items.length} items)
            </h3>

            {/* Item list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
              {items.map((i) => {
                const product = i.product || i.products || {}
                const name = i.name || product.name || 'Product'
                const qty = Number(i.quantity || 1)
                const unitPrice = Number(i.unitPrice ?? product.price ?? 0)
                const lineTotal = Number(i.lineTotal ?? (unitPrice * qty))
                const imgUrl = product.images?.[0]?.url || i.imageUrl || ''

                let itemVar = null
                try {
                  const vars = JSON.parse(localStorage.getItem('invihub_cart_variations') || '{}')
                  itemVar = vars[i.productId || product.id || i.id]
                } catch (_) { }

                return (
                  <div key={i.id} className="py-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={name}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-300">No img</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 line-clamp-1 block">{name}</span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Qty: <strong className="text-slate-700">{qty}</strong></span>
                          {unitPrice > 0 && <span>× {inr(unitPrice)}</span>}
                        </div>
                        {itemVar && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block shadow-2xs shrink-0"
                              style={{ backgroundColor: itemVar.colorHex || '#000000' }}
                            />
                            <span className="truncate">{itemVar.colorName || itemVar.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 block text-xs">
                        {inr(lineTotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Applied Coupon / Coupon Box */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Tag size={13} className="text-[#f97316]" />
                <span>Promo / Coupon Code</span>
              </label>

              {cart?.coupon ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-mono font-bold tracking-wider">{cart.coupon.code}</span>
                      <span className="text-[10px] text-emerald-600 block">
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
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-1.5 text-xs uppercase font-mono rounded-lg border border-slate-300 bg-white text-slate-900 outline-none focus:border-[#f97316] placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}

              {couponFeedback && (
                <div
                  className={`text-[11px] p-2 rounded flex items-center gap-1.5 ${couponFeedback.type === 'success'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                    : 'text-red-600 bg-red-50 border border-red-100'
                    }`}
                >
                  {couponFeedback.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{couponFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Calculations */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Base Price ({items.length} items, excl. GST)</span>
                <span className="font-semibold text-slate-800">{inr(productBase, 2)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <span>Discount</span>
                    {cart?.coupon?.code && (
                      <span className="font-mono text-[10px] bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">
                        ({cart.coupon.code})
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

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-black text-slate-900 text-base">
                <span>Grand Total</span>
                <span className="text-xl text-[#f97316]">{inr(grandTotal, 2)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200/60 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck size={16} className="text-[#f97316]" />
              <span>INVIHUB Quality Promise</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every parcel is shipped with insurance and tracking. 100% replacement warranty on any shipping damage.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
