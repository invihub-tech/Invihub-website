import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Package, ArrowRight, ShieldCheck, Truck } from 'lucide-react'

const payCopy = {
  RAZORPAY: 'Payment verified and confirmed via Razorpay',
  UPI: 'Payment received via instant UPI',
  COD: 'Order confirmed — Cash on Delivery at your doorstep',
  BANK: 'Order recorded — awaiting bank transfer confirmation',
}

export default function OrderSuccess() {
  const [params] = useSearchParams()
  const order = params.get('order') || 'INV-2026-001'
  const pay = params.get('pay') || 'RAZORPAY'

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} strokeWidth={2.5} />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Thank you for your order!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            We have received your order and our engineering team is preparing your package for dispatch.
          </p>
        </div>

        {/* Order Details Badge */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Order Reference:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {order}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Payment Status:</span>
            <span className="font-semibold text-emerald-700">{payCopy[pay] || 'Confirmed'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Estimated Delivery:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Truck size={12} className="text-[#f97316]" />
              <span>3–5 business days</span>
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/shop/account" className="btn-shop-outline w-full sm:w-auto text-xs py-2.5 px-5">
            View Order Status
          </Link>
          <Link to="/shop" className="btn-shop-primary w-full sm:w-auto text-xs py-2.5 px-5 gap-1.5">
            <span>Continue Shopping</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Need help? Contact support at invihub@gmail.com</span>
        </div>
      </div>
    </main>
  )
}
