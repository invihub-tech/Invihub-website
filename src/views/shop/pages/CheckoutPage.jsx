import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { PAYMENT_METHODS } from '../../../config/paymentMethods'

const steps = ['Cart', 'Details', 'Payment', 'Review']

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
      setForm((f) => ({ ...f, paymentMethod: allowed.includes(f.paymentMethod) ? f.paymentMethod : allowed[0] || '' }))
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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const pay = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const created = await api.checkout(form)
      if (created.requiresOnlineConfirm) {
        await api.confirmPay(created.orderId)
      }
      window.dispatchEvent(new Event('invi-cart'))
      const access = created.accessToken ? `&access=${encodeURIComponent(created.accessToken)}` : ''
      const emailQ = form.email ? `&email=${encodeURIComponent(form.email)}` : ''
      navigate(
        `/shop/order-success?order=${encodeURIComponent(created.orderNumber)}&pay=${encodeURIComponent(created.paymentMethod)}${access}${emailQ}`,
      )
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  if (!cart) return <main className="p-10">Loading…</main>

  const labels = { name: 'Full Name', email: 'Email', phone: 'Phone', line1: 'Address', line2: 'Address line 2', city: 'City', state: 'State', pinCode: 'PIN Code' }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-wrap gap-3 text-xs uppercase tracking-wider">
        {steps.map((s, i) => (
          <span key={s} className={i === 1 ? 'text-[#c5a059]' : 'text-white/35'}>
            {i + 1}. {s}
            {i < 3 ? ' →' : ''}
          </span>
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <form onSubmit={pay} className="space-y-4">
          <h1 className="font-serif text-4xl">Shipping details</h1>
          {Object.keys(labels).map((k) => (
            <label key={k} className="block text-xs uppercase tracking-wider text-white/40">
              {labels[k]}
              <input required={k !== 'line2'} className="field-input mt-2" value={form[k]} onChange={set(k)} />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={form.billingSame} onChange={set('billingSame')} /> Billing address same as shipping
          </label>
          <fieldset className="space-y-2">
            <legend className="font-serif text-2xl">Payment method</legend>
            {!(cart.allowedPaymentMethods || []).length && (
              <p className="text-red-400">These products cannot be paid for together. Remove items that do not share a payment method.</p>
            )}
            <div className="grid gap-2">
              {(cart.allowedPaymentMethods || []).map((id) => {
                const meta = PAYMENT_METHODS.find((m) => m.id === id)
                const on = form.paymentMethod === id
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm ${
                      on ? 'border-[#c5a059] bg-[#c5a059]/10 text-white' : 'border-white/15 text-white/70'
                    }`}
                  >
                    <input type="radio" name="paymentMethod" value={id} checked={on} onChange={set('paymentMethod')} className="sr-only" required />
                    <span className={`h-3 w-3 shrink-0 rounded-full border ${on ? 'border-[#c5a059] bg-[#c5a059]' : 'border-white/30'}`} />
                    {meta?.label || id}
                  </label>
                )
              })}
            </div>
          </fieldset>
          {err && <p className="text-red-400">{err}</p>}
          <button type="submit" className="btn-gold w-full" disabled={busy || !cart.cart.items.length || !form.paymentMethod}>
            {busy ? 'Processing…' : `Place order → ${inr(cart.totals.total)}`}
          </button>
          <p className="text-center text-xs text-white/40">Online payments use Razorpay (TEST / mock). COD and bank transfer stay pending until paid.</p>
        </form>
        <aside className="h-fit rounded-md border border-white/10 p-6">
          <h2 className="font-serif text-2xl">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.cart.items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>
                  {i.product.name} × {i.quantity}
                </span>
                <span>{inr(i.product.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-1 text-sm text-white/60">
            <div className="flex justify-between"><span>Shipping</span><span>{inr(cart.totals.shipping)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{inr(cart.totals.tax)}</span></div>
            <div className="flex justify-between text-lg text-white"><span>Total</span><span>{inr(cart.totals.total)}</span></div>
          </div>
          <Link to="/shop/cart" className="mt-4 inline-block text-sm text-[#c5a059]">
            ← Back to cart
          </Link>
        </aside>
      </div>
    </main>
  )
}
