import { useEffect, useState } from 'react'
import { IndianRupee, ShoppingBag, Users, Package } from 'lucide-react'
import { api, inr } from '../../../models/api'
import StatusBadge from '../../ui/StatusBadge'

function Spark({ points }) {
  const vals = points?.length ? points.map((p) => p.total) : [0]
  const max = Math.max(...vals, 1)
  const w = 560
  const h = 180
  const path = vals
    .map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * w
      const y = h - (v / max) * (h - 16) - 8
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
      <path d={area} fill="rgba(197,160,89,0.12)" />
      <path d={path} fill="none" stroke="#c5a059" strokeWidth="2.5" />
    </svg>
  )
}

export default function AdminDashboard() {
  const [d, setD] = useState(null)
  useEffect(() => {
    api.adminDashboard().then(setD)
  }, [])
  if (!d) return <p>Loading…</p>

  const cards = [
    ['Total Sales', inr(d.revenue), IndianRupee],
    ['Total Orders', d.orders, ShoppingBag],
    ['Total Customers', d.customers, Users],
    ['Total Products', d.products, Package],
  ]

  return (
    <div>
      <h1 className="font-serif text-4xl">Dashboard</h1>
      <p className="mt-2 text-white/50">Good morning, Admin</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([k, v, Icon]) => (
          <div key={k} className="rounded-md border border-white/10 bg-[#111] p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-white/40">{k}</div>
              <Icon size={18} className="text-[#c5a059]" />
            </div>
            <div className="mt-2 font-serif text-3xl">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-md border border-white/10 bg-[#111] p-5">
        <h2 className="font-serif text-2xl">Sales Overview</h2>
        <p className="mt-1 text-xs text-white/40">Last 7 days</p>
        <Spark points={d.salesByDay} />
        <div className="mt-2 flex justify-between text-[11px] text-white/35">
          {(d.salesByDay || []).map((p) => (
            <span key={p.label}>{p.label}</span>
          ))}
        </div>
      </div>
      <h2 className="mt-10 font-serif text-2xl">Recent Orders</h2>
      <div className="mt-4 overflow-x-auto text-sm">
        <table className="w-full">
          <thead className="text-left text-white/40">
            <tr>
              <th className="py-2">Order ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {d.recent.map((o) => (
              <tr key={o.id} className="border-t border-white/10">
                <td className="py-3">{o.orderNumber}</td>
                <td>{o.customer?.name || o.customer?.email}</td>
                <td>{inr(o.total)}</td>
                <td>
                  <StatusBadge value={o.paymentStatus === 'PAID' ? 'PAID' : o.orderStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 font-serif text-2xl">Low Stock</h2>
      <ul className="mt-3 space-y-2 text-sm text-white/70">
        {d.lowStock.map((p) => (
          <li key={p.id}>
            {p.name} — {p.stock} (threshold {p.threshold})
          </li>
        ))}
      </ul>
    </div>
  )
}
