import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import StatusBadge from '../../ui/StatusBadge'
import OrderStatusTracker from '../../ui/OrderStatusTracker'
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../../config/orderStatus'

export default function AdminOrderDetail() {
  const { id } = useParams()
  const [o, setO] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = () => api.adminOrder(id).then(setO)
  useEffect(() => {
    load()
  }, [id])

  const setStatus = async (orderStatus) => {
    setBusy(true)
    setErr('')
    try {
      await api.adminUpdateOrder(o.id, { orderStatus })
      await load()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  if (!o) return <p>Loading…</p>
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-4xl">{o.orderNumber}</h1>
        <p className="mt-2 text-sm text-white/50">Account: {o.accountType || (o.customer?.registered ? 'Registered' : 'Guest')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge value={o.paymentStatus} />
          <StatusBadge value={o.orderStatus} />
          {o.payments?.[0]?.method ? <StatusBadge value={o.payments[0].method} /> : null}
        </div>
      </div>

      <div className="rounded-md border border-white/10 p-5">
        <h2 className="text-xs uppercase tracking-wider text-white/40">Production status</h2>
        <div className="mt-3">
          <OrderStatusTracker status={o.orderStatus} />
        </div>
        <label className="mt-4 block text-xs uppercase text-white/40">
          Update step
          <select
            className="field-input mt-2 bg-black"
            value={o.orderStatus}
            disabled={busy}
            onChange={(e) => setStatus(e.target.value)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      </div>

      <div className="rounded-md border border-white/10 p-5">
        <h2 className="text-xs uppercase tracking-wider text-white/40">Shipping</h2>
        <p className="mt-3">
          {o.shippingName} · {o.shippingEmail} · {o.shippingPhone}
        </p>
        <p className="mt-1 text-white/50">
          {o.shippingLine1}
          {o.shippingLine2 ? `, ${o.shippingLine2}` : ''}, {o.shippingCity}, {o.shippingState} {o.shippingPin}
        </p>
      </div>

      <ul className="rounded-md border border-white/10 p-5">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between border-b border-white/10 py-2 text-sm last:border-0">
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
