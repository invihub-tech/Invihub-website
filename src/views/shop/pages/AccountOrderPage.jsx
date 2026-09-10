import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, inr } from '../../../models/api'
import OrderStatusTracker from '../../ui/OrderStatusTracker'
import { ApiStatusScreen } from '../../ui/ApiStatusScreen'

export default function AccountOrderPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [pageStatus, setPageStatus] = useState(null)

  const load = () => {
    setErr('')
    setPageStatus(null)
    setOrder(null)
    if (!email) {
      setErr('Open this page from My Account after looking up your email.')
      return
    }
    api
      .guestOrder(id, email)
      .then(setOrder)
      .catch((e) => {
        if (e.status === 401 || e.status === 403 || e.status === 404 || e.status >= 500 || e.status === 0) {
          setPageStatus(e.status ?? 500)
          return
        }
        setErr(e.message)
      })
  }

  useEffect(() => {
    load()
  }, [id, email])

  if (pageStatus != null) return <ApiStatusScreen status={pageStatus} onRetry={load} />

  if (err) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <p className="text-red-400">{err}</p>
        <Link to="/shop/account" className="mt-6 inline-block text-[#c5a059]">
          Back to account
        </Link>
      </main>
    )
  }

  if (!order) return <main className="p-10">Loading…</main>

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link to="/shop/account" className="text-sm text-white/45 hover:text-white">
        ← Account
      </Link>
      <h1 className="mt-4 font-serif text-4xl">{order.orderNumber}</h1>
      <p className="mt-2 text-white/50">Payment {order.paymentStatus}</p>
      <div className="mt-6">
        <OrderStatusTracker status={order.orderStatus} />
      </div>
      <ul className="mt-8 space-y-3 border-t border-white/10 pt-6">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between text-sm">
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{inr(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-between text-lg">
        <span>Total</span>
        <span className="text-[#c5a059]">{inr(order.total)}</span>
      </div>
    </main>
  )
}
