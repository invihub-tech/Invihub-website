import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminOrderDetail() {
  const { id } = useParams()
  const [o, setO] = useState(null)
  useEffect(() => {
    api.adminOrder(id).then(setO)
  }, [id])
  if (!o) return <p>Loading…</p>
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-serif text-4xl">{o.orderNumber}</h1>
      <p className="text-sm text-white/50">Account: {o.accountType || (o.customer?.registered ? 'Registered' : 'Guest')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={o.paymentStatus} />
        <StatusBadge value={o.orderStatus} />
        {o.payments?.[0]?.method ? <StatusBadge value={o.payments[0].method} /> : null}
      </div>
      <p>
        {o.shippingName} · {o.shippingEmail} · {o.shippingPhone}
      </p>
      <p className="text-white/50">
        {o.shippingLine1}, {o.shippingCity}, {o.shippingState} {o.shippingPin}
      </p>
      <ul className="rounded-md border border-white/10 p-4">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between py-1 text-sm">
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{inr(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg">Total {inr(o.total)}</p>
    </div>
  )
}
