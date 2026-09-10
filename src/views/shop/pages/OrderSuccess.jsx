import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { saveOrderAccess } from '../../../lib/orderAccess'

const payCopy = {
  RAZORPAY: 'Payment successful',
  UPI: 'Payment successful',
  COD: 'Order placed — pay on delivery',
  BANK: 'Order placed — awaiting bank transfer',
}

export default function OrderSuccess() {
  const [params] = useSearchParams()
  const order = params.get('order')
  const pay = params.get('pay') || 'RAZORPAY'
  const access = params.get('access') || ''
  const email = params.get('email') || ''

  useEffect(() => {
    if (order && access) saveOrderAccess(order, { token: access, email })
  }, [order, access, email])

  const viewQs = new URLSearchParams()
  if (email) viewQs.set('email', email)
  if (access) viewQs.set('access', access)
  const viewHref = order
    ? `/shop/account/orders/${encodeURIComponent(order)}${viewQs.toString() ? `?${viewQs}` : ''}`
    : '/shop/account'

  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="text-4xl text-[#c5a059]">✓</div>
      <h1 className="mt-4 font-serif text-4xl">ORDER PLACED SUCCESSFULLY</h1>
      <p className="mt-4 text-white/55">Thank you for your order.</p>
      <p className="mt-6 text-sm text-white/70">
        Order ID: <strong className="text-white">{order}</strong>
      </p>
      <p className="mt-2 text-sm text-white/70">{payCopy[pay] || 'Order placed'}</p>
      <p className="mt-2 text-sm text-white/50">Estimated delivery: 5–10 working days</p>
      {access ? (
        <p className="mt-4 break-all rounded-md border border-white/10 px-3 py-3 text-left text-xs text-white/55">
          Order access code (saved on this device; keep a copy to reopen this order later):
          <strong className="mt-1 block text-white">{access}</strong>
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to={viewHref} className="btn-gold-outline w-auto">
          View Order
        </Link>
        <Link to="/shop" className="btn-gold w-auto">
          Continue Shopping
        </Link>
      </div>
    </main>
  )
}
