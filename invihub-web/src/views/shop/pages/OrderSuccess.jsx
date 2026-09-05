import { Link, useSearchParams } from 'react-router-dom'

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
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/shop/account" className="btn-gold-outline w-auto">
          View Order
        </Link>
        <Link to="/shop" className="btn-gold w-auto">
          Continue Shopping
        </Link>
      </div>
    </main>
  )
}
