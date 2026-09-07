import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Copy, Archive } from 'lucide-react'
import { api, inr } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminProducts() {
  const [rows, setRows] = useState([])
  const [tab, setTab] = useState('ALL')
  const [q, setQ] = useState('')
  const load = () => api.adminProducts().then(setRows)
  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      if (tab === 'ACTIVE' && p.status !== 'ACTIVE') return false
      if (tab === 'INACTIVE' && p.status === 'ACTIVE') return false
      if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, tab, q])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">Products</h1>
        <Link to={`${adminBase}/products/new`} className="btn-gold w-auto">
          + Add Product
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {['ALL', 'ACTIVE', 'INACTIVE'].map((t) => (
          <button
            key={t}
            type="button"
            className={`text-sm ${tab === t ? 'text-[#c5a059]' : 'text-white/45'}`}
            onClick={() => setTab(t)}
          >
            {t === 'ALL' ? 'All' : t === 'ACTIVE' ? 'Active' : 'Inactive'}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="field-input ml-auto h-10 max-w-xs" />
      </div>
      <div className="mt-6 overflow-x-auto text-sm">
        <table className="w-full">
          <thead className="text-left text-white/40">
            <tr>
              <th className="py-2">Image</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="py-3">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-md bg-[#111]" />
                  )}
                </td>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category?.name}</td>
                <td>{inr(p.price)}</td>
                <td>{p.stock}</td>
                <td>
                  <StatusBadge value={p.status} />
                </td>
                <td className="space-x-3 text-[#c5a059]">
                  <Link to={`${adminBase}/products/${p.id}/edit`} aria-label="Edit">
                    <Pencil size={14} className="inline" />
                  </Link>
                  <button type="button" aria-label="Duplicate" onClick={() => api.adminDuplicate(p.id).then(load)}>
                    <Copy size={14} className="inline" />
                  </button>
                  {p.status === 'ACTIVE' ? (
                    <button type="button" aria-label="Archive" onClick={() => api.adminArchive(p.id).then(load)}>
                      <Archive size={14} className="inline" />
                    </button>
                  ) : (
                    <button type="button" className="text-sm" onClick={() => api.adminRestore(p.id).then(load)}>
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
