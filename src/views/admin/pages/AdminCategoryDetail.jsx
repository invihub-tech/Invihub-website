import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'

export default function AdminCategoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cat, setCat] = useState(null)
  const [products, setProducts] = useState([])
  const [assignId, setAssignId] = useState('')
  const [err, setErr] = useState('')

  const load = () => {
    api.adminCategories().then((list) => setCat(list.find((c) => c.id === id) || null))
    api.adminProducts().then(setProducts)
  }
  useEffect(() => {
    load()
  }, [id])

  if (!cat) return <p>Loading…</p>

  const save = async (e) => {
    e.preventDefault()
    try {
      await api.adminSaveCategory(
        {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          status: cat.status,
          isFeatured: cat.isFeatured,
        },
        cat.id,
      )
      navigate(`${adminBase}/categories`)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const others = products.filter((p) => p.category?.id !== cat.id && p.status !== 'ARCHIVED')

  return (
    <form onSubmit={save} className="max-w-3xl space-y-4">
      <Link to={`${adminBase}/categories`} className="text-sm text-white/45">
        ← Categories
      </Link>
      <h1 className="font-serif text-4xl">{cat.name}</h1>
      <label className="block text-xs uppercase text-white/40">
        Name
        <input className="field-input mt-2" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} />
      </label>
      <label className="block text-xs uppercase text-white/40">
        Description
        <textarea className="field-input mt-2 h-28 py-3" value={cat.description || ''} onChange={(e) => setCat({ ...cat, description: e.target.value })} />
      </label>
      <div>
        <div className="text-xs uppercase text-white/40">Category image</div>
        <input
          type="file"
          className="mt-2 text-sm"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const url = await api.upload(file)
            setCat({ ...cat, imageUrl: url })
          }}
        />
        {cat.imageUrl && <img src={cat.imageUrl} alt="" className="mt-2 h-24 w-24 object-cover" />}
      </div>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={cat.status === 'ACTIVE'} onChange={(e) => setCat({ ...cat, status: e.target.checked ? 'ACTIVE' : 'ARCHIVED' })} /> Active
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={!!cat.isFeatured} onChange={(e) => setCat({ ...cat, isFeatured: e.target.checked })} /> Featured category
      </label>
      <div>
        <h2 className="font-serif text-2xl">Products in this category</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {(cat.products || []).map((p) => (
            <li key={p.id}>
              {p.name} <span className="text-white/40">{p.sku}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <select className="field-input bg-black" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
            <option value="">Assign product…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-gold w-auto"
            onClick={async () => {
              if (!assignId) return
              await api.adminAssignProduct(cat.id, assignId)
              setAssignId('')
              load()
            }}
          >
            Assign
          </button>
        </div>
      </div>
      {err && <p className="text-red-400">{err}</p>}
      <button className="btn-gold w-auto" type="submit">
        Save Changes
      </button>
    </form>
  )
}
