import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, ChevronDown, Check, X } from 'lucide-react'
import { api } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import { PAYMENT_METHODS } from '../../../config/paymentMethods'
import { TRUST_BADGES } from '../../../config/trustBadges'

const empty = {
  name: '',
  slug: '',
  sku: '',
  categoryId: '',
  categoryIds: [],
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
  trustBadges: [],
}

export default function AdminProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cats, setCats] = useState([])
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const catDropdownRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setCatDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    api.adminCategories().then(setCats)
    if (id) {
      api.adminProducts().then((rows) => {
        const p = rows.find((r) => r.id === id)
        if (!p) return
        const catIds = Array.isArray(p.categoryIds) && p.categoryIds.length > 0
          ? p.categoryIds
          : p.category?.id
          ? [p.category.id]
          : []
        setForm({
          ...empty,
          ...p,
          categoryId: catIds[0] || '',
          categoryIds: catIds,
          features: p.features?.length ? p.features : [''],
          paymentMethods: p.paymentMethods?.length ? p.paymentMethods : ['RAZORPAY', 'COD'],
          specifications: p.specifications?.length ? p.specifications : [{ name: '', value: '' }],
          parts: Array.isArray(p.parts) ? p.parts : [],
          trustBadges: Array.isArray(p.trustBadges) ? p.trustBadges : [],
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
    const catIds = form.categoryIds?.length
      ? form.categoryIds
      : form.categoryId
      ? [form.categoryId]
      : []
    if (!catIds.length) {
      setErr('Please select at least one category')
      return
    }
    try {
      const payload = {
        ...form,
        categoryId: catIds[0],
        categoryIds: catIds,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
        features: (form.features || []).filter(Boolean),
        specifications: (form.specifications || []).filter((s) => s.name && s.value),
        trustBadges: Array.isArray(form.trustBadges) ? form.trustBadges : [],
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
          <div className="space-y-1.5" ref={catDropdownRef}>
            <div className="flex items-center justify-between">
              <span className="block text-xs uppercase text-white/40">
                Categories <span className="text-[#c5a059] font-normal lowercase">(select multiple in dropdown)</span>
              </span>
              {form.categoryIds?.length > 0 && (
                <span className="text-xs text-[#c5a059] font-medium">
                  {form.categoryIds.length} {form.categoryIds.length === 1 ? 'category selected' : 'categories selected'}
                </span>
              )}
            </div>

            {/* Custom Multi-Select Dropdown Field */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCatDropdownOpen((prev) => !prev)}
                className={`field-input !h-auto min-h-[44px] w-full bg-black/60 text-left flex items-center justify-between gap-2 py-2 cursor-pointer transition-all ${
                  catDropdownOpen ? 'border-[#c5a059]/60 ring-1 ring-[#c5a059]/40' : ''
                }`}
              >
                {form.categoryIds && form.categoryIds.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {form.categoryIds.map((id) => {
                      const cat = cats.find((c) => c.id === id)
                      if (!cat) return null
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#c5a059]/15 border border-[#c5a059]/30 px-2 py-0.5 text-xs text-[#c5a059] font-medium"
                        >
                          {cat.name}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              const next = form.categoryIds.filter((cid) => cid !== id)
                              setForm((f) => ({
                                ...f,
                                categoryIds: next,
                                categoryId: next[0] || '',
                              }))
                            }}
                            className="hover:text-white text-[#c5a059]/60 cursor-pointer"
                            title="Remove category"
                          >
                            <X size={12} />
                          </span>
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-white/40">Select one or more categories…</span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-white/40 shrink-0 transition-transform duration-200 ${
                    catDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Popover Dropdown Menu */}
              {catDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-white/15 bg-[#141414] p-1.5 shadow-2xl backdrop-blur-md max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-white/40 border-b border-white/5 mb-1">
                    <span>Click to check/uncheck categories</span>
                    {form.categoryIds?.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            categoryIds: [],
                            categoryId: '',
                          }))
                        }
                        className="text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {cats.map((c) => {
                    const isSelected = (form.categoryIds || []).includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const current = form.categoryIds || []
                          const next = isSelected
                            ? current.filter((id) => id !== c.id)
                            : [...current, c.id]
                          setForm((f) => ({
                            ...f,
                            categoryIds: next,
                            categoryId: next[0] || '',
                          }))
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#c5a059]/15 text-[#c5a059]'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-[#c5a059] bg-[#c5a059] text-black'
                                : 'border-white/20 bg-black/40'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span>{c.name}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-mono text-[#c5a059] tracking-wider">
                            Selected
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {cats.length === 0 && (
                    <div className="p-3 text-xs text-white/40 text-center italic">No categories available.</div>
                  )}
                </div>
              )}
            </div>

            {(!form.categoryIds || form.categoryIds.length === 0) && (
              <p className="text-[11px] text-amber-400/80">Please select at least one category.</p>
            )}
          </div>
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
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
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
                  <Trash2 size={12} /> Delete
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

      {/* Product Badges Section */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#c5a059] font-bold">Product Badges</div>
            <p className="text-[11px] text-white/50 mt-0.5">
              Select trust guarantee badges to display on this product's detail page. All options are optional.
            </p>
          </div>
          {form.trustBadges?.length > 0 && (
            <span className="text-xs text-[#c5a059] font-medium bg-[#c5a059]/10 px-2.5 py-0.5 rounded border border-[#c5a059]/30">
              {form.trustBadges.length} {form.trustBadges.length === 1 ? 'badge selected' : 'badges selected'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {TRUST_BADGES.map((badge) => {
            const isChecked =
              (form.trustBadges || []).includes(badge.id) ||
              (form.trustBadges || []).includes(badge.label)
            return (
              <label
                key={badge.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-[#c5a059]/15 border-[#c5a059] text-white shadow-sm'
                    : 'bg-black/40 border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const cur = form.trustBadges || []
                    const next = e.target.checked
                      ? [...cur.filter((x) => x !== badge.id && x !== badge.label), badge.id]
                      : cur.filter((x) => x !== badge.id && x !== badge.label)
                    set('trustBadges', next)
                  }}
                  className="rounded border-white/20 bg-black/40 text-[#c5a059] focus:ring-[#c5a059] focus:ring-offset-0"
                />
                <span className="text-xs font-semibold">{badge.label}</span>
              </label>
            )
          })}
        </div>
      </div>
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
                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                onClick={() => {
                  const next = (form.parts || []).filter((_, idx) => idx !== i)
                  set('parts', next)
                }}
                title="Remove part"
              >
                <Trash2 size={12} /> Remove
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
