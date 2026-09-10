import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminCategories() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', imageUrl: '' })
  const load = () => api.adminCategories().then(setRows)
  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () => rows.filter((c) => `${c.name} ${c.slug}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  )

  const onDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
  }
  const onDrop = async (e, targetId) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return
    const ids = rows.map((c) => c.id)
    const from = ids.indexOf(sourceId)
    const to = ids.indexOf(targetId)
    ids.splice(from, 1)
    ids.splice(to, 0, sourceId)
    await api.adminReorderCategories(ids)
    load()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">Categories</h1>
        <button type="button" className="btn-gold w-auto" onClick={() => setOpen(true)}>
          + Add Category
        </button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" className="field-input mt-6 h-10 max-w-xs" />
      {open && (
        <form
          className="mt-6 max-w-lg space-y-3 rounded-md border border-white/10 p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            await api.adminSaveCategory({
              name: form.name.trim(),
              slug: (form.slug || form.name).trim().toLowerCase().replace(/\s+/g, '-'),
              description: form.description,
              imageUrl: form.imageUrl,
            })
            setForm({ name: '', slug: '', description: '', imageUrl: '' })
            setOpen(false)
            load()
          }}
        >
          <input className="field-input" placeholder="Name" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className="field-input" placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <textarea className="field-input h-24 py-3" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const url = await api.upload(file)
              setForm((f) => ({ ...f, imageUrl: url }))
            }}
          />
          {form.imageUrl && <img src={form.imageUrl} alt="" className="h-16 w-16 object-cover" />}
          <div className="flex gap-2">
            <button className="btn-gold w-auto" type="submit">
              Save
            </button>
            <button type="button" className="btn-outline-white w-auto" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="mt-6 overflow-x-auto text-sm">
        <table className="w-full">
          <thead className="text-left text-white/40">
            <tr>
              <th className="py-2">Image</th>
              <th>Category</th>
              <th>Products</th>
              <th>Status</th>
              <th>Order</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                draggable
                onDragStart={(e) => onDragStart(e, c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, c.id)}
                className="border-t border-white/10"
              >
                <td className="py-3">
                  <img src={c.imageUrl || '/images/hero-product.png'} alt="" className="h-10 w-10 rounded-md object-cover" />
                </td>
                <td>
                  <Link className="text-[#c5a059]" to={`${adminBase}/categories/${c.id}`}>
                    {c.name}
                  </Link>
                </td>
                <td>{c.productCount}</td>
                <td>
                  <StatusBadge value={c.status} />
                </td>
                <td>{c.sortOrder}</td>
                <td className="space-x-3">
                  {c.status === 'ACTIVE' ? (
                    <button type="button" onClick={() => api.adminArchiveCategory(c.id).then(load)}>
                      Archive
                    </button>
                  ) : (
                    <button type="button" className="text-[#c5a059]" onClick={() => api.adminRestoreCategory(c.id).then(load)}>
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-white/35">Drag rows to change display order.</p>
    </div>
  )
}
