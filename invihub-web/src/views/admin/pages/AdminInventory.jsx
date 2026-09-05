import { useEffect, useState } from 'react'
import { api, inr } from '../../../models/api'

export default function AdminInventory() {
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [history, setHistory] = useState([])
  const [viewId, setViewId] = useState(null)
  const [adj, setAdj] = useState({ sign: 1, qty: 10, reason: 'New manufacturing batch', notes: '' })

  const load = () => api.adminInventory({ q, filter }).then(setData)
  useEffect(() => {
    load()
  }, [q, filter])

  const openAdjust = (row, restock = false) => {
    setModal(row)
    setAdj({ sign: restock || row.status === 'Out' ? 1 : 1, qty: 10, reason: restock ? 'Restock' : 'New manufacturing batch', notes: '' })
  }

  const submit = async (e) => {
    e.preventDefault()
    const delta = Math.abs(Number(adj.qty) || 0) * (Number(adj.sign) || 1)
    await api.adminAdjustStock(modal.id, delta, adj.reason, adj.notes)
    setModal(null)
    load()
    if (viewId === modal.id) api.adminInventoryHistory(modal.id).then(setHistory)
  }

  if (!data) return <p>Loading…</p>
  const { kpis, products } = data

  return (
    <div>
      <h1 className="font-serif text-4xl">Inventory</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total Stock', kpis.totalUnits],
          ['Low Stock', kpis.lowCount],
          ['Out of Stock', kpis.outCount],
          ['Stock Value', inr(kpis.stockValue)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-white/10 bg-[#111] p-5">
            <div className="text-xs uppercase tracking-widest text-white/40">{k}</div>
            <div className="mt-2 font-serif text-3xl">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="field-input h-10 max-w-xs" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field-input h-10 w-auto bg-black">
          <option value="all">All</option>
          <option value="healthy">Healthy</option>
          <option value="low">Low</option>
          <option value="out">Out</option>
        </select>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-white/40">
          <tr>
            <th className="py-2">Product</th>
            <th>SKU</th>
            <th>Stock</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-white/10">
              <td className="py-3">{p.name}</td>
              <td>{p.sku}</td>
              <td>{p.stock}</td>
              <td>
                <span className={p.status === 'Healthy' ? 'text-emerald-400' : p.status === 'Low' ? 'text-amber-300' : 'text-red-400'}>● {p.status}</span>
              </td>
              <td className="space-x-3 text-[#c5a059]">
                <button
                  type="button"
                  onClick={() => {
                    setViewId(p.id)
                    api.adminInventoryHistory(p.id).then(setHistory)
                  }}
                >
                  View
                </button>
                <button type="button" onClick={() => openAdjust(p)}>
                  Adjust
                </button>
                <button type="button" onClick={() => openAdjust(p, true)}>
                  Restock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {viewId && (
        <div className="mt-10">
          <h2 className="font-serif text-2xl">Stock History</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-white/40">
              <tr>
                <th className="py-2">Date</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-white/10">
                  <td className="py-2">{new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td className={h.delta < 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {h.delta > 0 ? '+' : ''}
                    {h.delta}
                  </td>
                  <td>
                    {h.reason}
                    {h.notes ? ` — ${h.notes}` : ''}
                  </td>
                  <td>{h.adminName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-md border border-white/10 bg-[#111] p-6">
            <h2 className="font-serif text-2xl">Adjust inventory</h2>
            <p className="text-white/50">Current stock: {modal.stock}</p>
            <label className="block text-xs uppercase text-white/40">
              Adjustment
              <select className="field-input mt-2 bg-black" value={adj.sign} onChange={(e) => setAdj((a) => ({ ...a, sign: Number(e.target.value) }))}>
                <option value={1}>+</option>
                <option value={-1}>-</option>
              </select>
            </label>
            <label className="block text-xs uppercase text-white/40">
              Quantity
              <input type="number" min="1" className="field-input mt-2" value={adj.qty} onChange={(e) => setAdj((a) => ({ ...a, qty: e.target.value }))} />
            </label>
            <label className="block text-xs uppercase text-white/40">
              Reason
              <input className="field-input mt-2" value={adj.reason} onChange={(e) => setAdj((a) => ({ ...a, reason: e.target.value }))} />
            </label>
            <label className="block text-xs uppercase text-white/40">
              Notes
              <textarea className="field-input mt-2 h-20 py-3" value={adj.notes} onChange={(e) => setAdj((a) => ({ ...a, notes: e.target.value }))} />
            </label>
            <div className="flex gap-2">
              <button className="btn-gold w-auto" type="submit">
                Update Stock
              </button>
              <button type="button" className="btn-outline-white w-auto" onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
