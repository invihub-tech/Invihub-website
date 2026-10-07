import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import { PAYMENT_METHODS } from '../../../config/paymentMethods'

const empty = {
  name: '',
  slug: '',
  sku: '',
  categoryId: '',
  brand: 'INVIHUB',
  shortDescription: '',
  description: '',
  features: [''],
  tags: [],
  price: 0,
  mrp: 0,
  discount: 0,
  taxRate: 18,
  stock: 0,
  lowStockThreshold: 5,
  status: 'ACTIVE',
  isFeatured: false,
  isNew: false,
  isBestSeller: false,
  allowCustomization: false,
  paymentMethods: ['RAZORPAY', 'COD'],
  images: [],
  specifications: [{ name: '', value: '' }],
  parts: [],
}

export default function AdminProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cats, setCats] = useState([])
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.adminCategories().then(setCats)
    if (id) {
      api.adminProducts().then((rows) => {
        const p = rows.find((r) => r.id === id)
        if (!p) return
        setForm({
          ...empty,
          ...p,
          categoryId: p.category?.id || '',
          features: p.features?.length ? p.features : [''],
          paymentMethods: p.paymentMethods?.length ? p.paymentMethods : ['RAZORPAY', 'COD'],
          specifications: p.specifications?.length ? p.specifications : [{ name: '', value: '' }],
          parts: Array.isArray(p.parts) ? p.parts : [],
        })
      })
    }
  }, [id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.paymentMethods?.length) {
      setErr('Select at least one payment method')
      return
    }
    try {
      const payload = {
        ...form,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
        features: (form.features || []).filter(Boolean),
        specifications: (form.specifications || []).filter((s) => s.name && s.value),
        parts: (form.parts || [])
          .filter((p) => p && p.name && p.name.trim())
          .map((p) => ({
            id: p.id || `part-${Math.random().toString(36).slice(2, 7)}`,
            name: p.name.trim(),
            allowedColors: Array.isArray(p.allowedColors)
              ? p.allowedColors.map((c) => c.trim()).filter(Boolean)
              : typeof p.allowedColors === 'string'
              ? p.allowedColors.split(',').map((c) => c.trim()).filter(Boolean)
              : ['Black', 'White'],
          })),
      }
      await api.adminSaveProduct(payload, id)
      navigate(`${adminBase}/products`)
    } catch (ex) {
      setErr(ex.message)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <h1 className="font-serif text-4xl">{id ? 'Edit Product' : 'Add Product'}</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {['name', 'sku', 'shortDescription'].map((k) => (
            <label key={k} className="block text-xs uppercase text-white/40">
              {k === 'name' ? 'Product Name' : k === 'sku' ? 'SKU' : 'Short Description'}
              <input className="field-input mt-2" value={form[k] || ''} onChange={(e) => set(k, e.target.value)} required />
            </label>
          ))}
          <label className="block text-xs uppercase text-white/40">
            Category
            <select className="field-input mt-2 bg-black" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} required>
              <option value="">Select</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs uppercase text-white/40">
            Description
            <textarea className="field-input mt-2 h-32 py-3" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['price', 'Price'],
              ['mrp', 'MRP'],
              ['discount', 'Discount %'],
              ['stock', 'Stock'],
            ].map(([k, label]) => (
              <label key={k} className="block text-xs uppercase text-white/40">
                {label}
                <input type="number" className="field-input mt-2" value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-white/40">Product Images</div>
          <label className="mt-2 flex h-40 cursor-pointer items-center justify-center rounded-md border border-dashed border-[#c5a059]/50 text-center text-sm text-white/45">
            Upload images
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const files = [...(e.target.files || [])]
                e.target.value = ''
                if (!files.length) return
                const uploaded = []
                for (const file of files) {
                  const url = await api.upload(file)
                  uploaded.push({ url, alt: form.name })
                }
                setForm((f) => ({ ...f, images: [...(f.images || []), ...uploaded] }))
              }}
            />
          </label>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {(form.images || []).map((im, i) => (
              <div key={im.id || im.url + i} className="w-24 shrink-0">
                <img src={im.url} alt="" className="h-20 w-24 rounded-md object-cover" />
                <button
                  type="button"
                  className="mt-1 w-full rounded-md border border-white/20 py-1 text-xs text-red-400"
                  onClick={async () => {
                    try {
                      if (id) {
                        await api.adminDeleteProductImage(id, { imageId: im.id, url: im.url })
                      } else {
                        await api.deleteUpload(im.url)
                      }
                    } catch {
                      /* still drop from form */
                    }
                    setForm((f) => ({
                      ...f,
                      images: (f.images || []).filter((_, idx) => idx !== i),
                    }))
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
          <label className="block text-xs uppercase text-white/40">
            Status
            <select className="field-input mt-2 bg-black" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
        {['isFeatured', 'isNew', 'isBestSeller'].map((k) => (
          <label key={k} className="flex gap-2">
            <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} /> {k}
          </label>
        ))}
        <label className="flex gap-2 text-[#c5a059]">
          <input type="checkbox" checked={!!form.allowCustomization} onChange={(e) => set('allowCustomization', e.target.checked)} />
          allowCustomization
        </label>
      </div>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-xs uppercase text-white/40">Payments accepted</legend>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={(form.paymentMethods || []).includes(m.id)}
                  onChange={(e) => {
                    const cur = form.paymentMethods || []
                    set('paymentMethods', e.target.checked ? [...cur, m.id] : cur.filter((id) => id !== m.id))
                  }}
                />
                {m.label}
              </label>
            ))}
          </fieldset>
      <div>
        <div className="text-xs uppercase text-white/40">Specifications</div>
        {(form.specifications || []).map((s, i) => (
          <div key={i} className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="field-input"
              placeholder="Name"
              value={s.name}
              onChange={(e) => {
                const next = [...form.specifications]
                next[i] = { ...s, name: e.target.value }
                set('specifications', next)
              }}
            />
            <input
              className="field-input"
              placeholder="Value"
              value={s.value}
              onChange={(e) => {
                const next = [...form.specifications]
                next[i] = { ...s, value: e.target.value }
                set('specifications', next)
              }}
            />
          </div>
        ))}
        <button type="button" className="mt-2 text-sm text-[#c5a059]" onClick={() => set('specifications', [...form.specifications, { name: '', value: '' }])}>
          + Add Specification
        </button>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#c5a059] font-bold">Components & Multi-Color Configuration</div>
            <p className="text-[11px] text-white/50 mt-0.5">
              Define separate printable parts (e.g. Main Body, Front Panel, Buttons) and the allowed colors for each part.
            </p>
          </div>
          <button
            type="button"
            className="text-[11px] text-[#c5a059] hover:underline"
            onClick={() => {
              set('parts', [
                { id: 'part-body', name: 'Main Body', allowedColors: ['Black', 'White', 'Grey', 'Orange'] },
                { id: 'part-panel', name: 'Front Panel', allowedColors: ['Orange', 'Blue', 'Black', 'White'] },
                { id: 'part-buttons', name: 'Buttons', allowedColors: ['White', 'Yellow', 'Red', 'Black'] },
                { id: 'part-logo', name: 'Logo / Accent', allowedColors: ['Blue', 'White', 'Orange'] },
              ])
            }}
          >
            + Load Enclosure Preset
          </button>
        </div>

        {(form.parts || []).map((part, i) => (
          <div key={part.id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-black/40 p-2.5 rounded border border-white/5">
            <div className="md:col-span-4">
              <label className="block text-[10px] uppercase text-white/40 mb-1">Part / Component Name</label>
              <input
                className="field-input text-xs"
                placeholder="e.g. Main Body"
                value={part.name || ''}
                onChange={(e) => {
                  const next = [...(form.parts || [])]
                  next[i] = { ...part, name: e.target.value }
                  set('parts', next)
                }}
              />
            </div>
            <div className="md:col-span-7">
              <label className="block text-[10px] uppercase text-white/40 mb-1">Allowed Colors (comma separated)</label>
              <input
                className="field-input text-xs"
                placeholder="e.g. Black, White, Orange, Blue"
                value={Array.isArray(part.allowedColors) ? part.allowedColors.join(', ') : (part.allowedColors || '')}
                onChange={(e) => {
                  const next = [...(form.parts || [])]
                  next[i] = { ...part, allowedColors: e.target.value }
                  set('parts', next)
                }}
              />
            </div>
            <div className="md:col-span-1 flex justify-end pt-3 md:pt-0">
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-300 p-1"
                onClick={() => {
                  const next = (form.parts || []).filter((_, idx) => idx !== i)
                  set('parts', next)
                }}
                title="Remove part"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            className="text-xs text-[#c5a059] font-medium hover:underline"
            onClick={() => {
              set('parts', [
                ...(form.parts || []),
                {
                  id: `part-${Date.now().toString(36)}`,
                  name: '',
                  allowedColors: ['Black', 'White', 'Orange', 'Blue'],
                },
              ])
            }}
          >
            + Add Component / Part
          </button>
        </div>
      </div>

      {err && <p className="text-red-400">{err}</p>}
      <div className="flex gap-3">
        <button type="button" className="btn-outline-white w-auto" onClick={() => navigate(`${adminBase}/products`)}>
          Cancel
        </button>
        <button className="btn-gold w-auto" type="submit">
          Save Product
        </button>
      </div>
    </form>
  )
}
