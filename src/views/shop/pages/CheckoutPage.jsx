import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { PAYMENT_METHODS } from '../../../config/paymentMethods'
import { ShieldCheck, Truck, CreditCard, ChevronRight, CheckCircle2, Lock } from 'lucide-react'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
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
    paymentMethod: '',
  })

  useEffect(() => {
    api.cart().then((data) => {
      setCart(data)
      const allowed = data.allowedPaymentMethods || []
      setForm((f) => ({
        ...f,
        paymentMethod: allowed.includes(f.paymentMethod) ? f.paymentMethod : allowed[0] || 'RAZORPAY',
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
      .catch(() => {})
  }, [])

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

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
      <main className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Securing checkout session…</p>
      </main>
    )
  }

  const items = cart.cart?.items || []
  const totals = cart.totals || {}

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
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

          {/* Payment Method Card */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="text-[#f97316]" size={18} />
              <span>Select Payment Method</span>
            </h2>

            <div className="space-y-2.5">
              {(cart.allowedPaymentMethods || []).map((mid) => {
                const isSelected = form.paymentMethod === mid
                return (
                  <label
                    key={mid}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#f97316] bg-orange-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={mid}
                        checked={isSelected}
                        onChange={set('paymentMethod')}
                        className="text-[#f97316] focus:ring-[#f97316]"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {PAYMENT_METHODS[mid]?.label || mid}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {mid === 'RAZORPAY' && 'UPI (GPay/PhonePe), Credit/Debit Cards, NetBanking'}
                          {mid === 'UPI' && 'Instant scan & pay via any UPI app'}
                          {mid === 'COD' && 'Cash on delivery available at selected pin codes'}
                          {mid === 'BANK' && 'Direct NEFT / IMPS business bank transfer'}
                        </div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="text-[#f97316]" />}
                  </label>
                )
              })}
            </div>
          </div>

          {err && <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="btn-shop-primary w-full py-4 text-sm font-extrabold gap-2 shadow-xl shadow-orange-950/20"
          >
            <Lock size={16} />
            <span>{busy ? 'Processing Order…' : `Pay & Place Order • ${inr(totals.total)}`}</span>
          </button>
        </form>

        {/* Right Summary Column */}
        <aside className="lg:col-span-5 space-y-5 sticky top-36">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
              Order Summary ({items.length} items)
            </h3>

            {/* Item list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
              {items.map((i) => (
                <div key={i.id} className="py-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {i.quantity}×
                    </span>
                    <span className="font-medium text-slate-800 line-clamp-1">{i.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {inr(i.lineTotal || i.unitPrice * i.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{inr(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount</span>
                  <span>-{inr(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>
                  {totals.shipping > 0 ? inr(totals.shipping) : <strong className="text-emerald-600">FREE</strong>}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span>{inr(totals.tax)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-black text-slate-900 text-base">
                <span>Grand Total</span>
                <span className="text-xl text-[#f97316]">{inr(totals.total)}</span>
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
