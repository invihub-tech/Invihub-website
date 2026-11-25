import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Trash2, ChevronDown, Check, X, Disc, Plus, Layers, AlertCircle } from 'lucide-react'
import { api, inr } from '../../../models/api'
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

  // Filament Variations
  const [allFilaments, setAllFilaments] = useState([])
  const [filamentVariations, setFilamentVariations] = useState([])
  const [selectedFilamentToAdd, setSelectedFilamentToAdd] = useState('')

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
    api.adminFilaments().then((res) => setAllFilaments(res?.filaments || [])).catch(() => {})
    if (id) {
      api.adminProductFilamentVariations(id).then((vars) => setFilamentVariations(vars || [])).catch(() => {})
      api.adminProducts().then((rows) => {
        const p = rows.find((r) => r.id === id || r.slug === id)
        if (!p) return
        if (p.id && p.id !== id) {
          api.adminProductFilamentVariations(p.id).then((vars) => setFilamentVariations(vars || [])).catch(() => {})
        }
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

  const addFilamentVariation = () => {
    if (!selectedFilamentToAdd) return
    const fil = allFilaments.find((f) => f.id === selectedFilamentToAdd)
    if (!fil) return
    if (filamentVariations.some((v) => (v.filamentId || v.filament_id) === fil.id)) {
      alert('This filament variation is already assigned to this product.')
      return
    }
    setFilamentVariations((prev) => [
      ...prev,
      {
        filamentId: fil.id,
        priceAdjustment: 0,
        isAvailable: true,
        filament: fil,
      },
    ])
    setSelectedFilamentToAdd('')
  }

  const removeFilamentVariation = (targetFilamentId) => {
    setFilamentVariations((prev) =>
      prev.filter((v) => (v.filamentId || v.filament_id) !== targetFilamentId)
    )
  }

  const updateFilamentVariation = (targetFilamentId, field, val) => {
    setFilamentVariations((prev) =>
      prev.map((v) =>
        (v.filamentId || v.filament_id) === targetFilamentId ? { ...v, [field]: val } : v
      )
    )
  }

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
      const savedRes = await api.adminSaveProduct(payload, id)
      const targetId = savedRes?.id || savedRes?.product?.id || form?.id || id
      if (targetId) {
        await api.adminSaveProductFilamentVariations(targetId, filamentVariations)
      }
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

      {/* ── FILAMENT VARIATIONS SECTION ── */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#c5a059] font-bold flex items-center gap-2">
              <Disc size={15} /> Filament Variations
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">
              Assign available filament inventory records as selectable variations for this product.
            </p>
          </div>
          <Link
            to={`${adminBase}/filaments`}
            target="_blank"
            className="text-[11px] text-white/40 hover:text-[#c5a059] underline self-start sm:self-auto"
          >
            Manage Filament Inventory →
          </Link>
        </div>

        {/* Add from inventory dropdown */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            value={selectedFilamentToAdd}
            onChange={(e) => setSelectedFilamentToAdd(e.target.value)}
            className="field-input h-9 flex-1 min-w-[240px] bg-black text-xs text-white border-white/20"
          >
            <option value="">-- Choose filament from inventory to assign --</option>
            {allFilaments.map((f) => {
              const already = filamentVariations.some((v) => (v.filamentId || v.filament_id) === f.id)
              return (
                <option key={f.id} value={f.id} disabled={already}>
                  {f.material} - {f.colorName} ({f.diameter}mm, {f.weightGrams >= 1000 ? `${f.weightGrams / 1000}kg` : `${f.weightGrams}g`}) - {f.stockSpools} spools in stock {already ? '(Assigned)' : ''}
                </option>
              )
            })}
          </select>
          <button
            type="button"
            onClick={addFilamentVariation}
            disabled={!selectedFilamentToAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#c5a059] px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#d4b069] disabled:opacity-40 transition-colors"
          >
            <Plus size={14} /> Assign Filament
          </button>
        </div>

        {/* Variations List */}
        {filamentVariations.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-5 text-center text-xs text-white/40">
            No filament variations assigned yet. Select a filament above to assign it to this product, or leave empty if this product does not have filament options.
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {filamentVariations.map((v) => {
              const filId = v.filamentId || v.filament_id
              const fil = v.filament || allFilaments.find((f) => f.id === filId)
              return (
                <div
                  key={filId}
                  className="rounded-lg border border-white/10 bg-black/40 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-5 w-5 rounded-full border border-white/20 shrink-0 shadow-inner"
                      style={{ backgroundColor: fil?.colorHex || '#000000' }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>{fil?.name || 'Filament'}</span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-[#c5a059]">
                          {fil?.material}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 flex flex-wrap items-center gap-2 mt-0.5">
                        <span>Color: <strong>{fil?.colorName}</strong></span>
                        <span>•</span>
                        <span>{fil?.diameter} mm</span>
                        <span>•</span>
                        <span>{fil?.weightGrams >= 1000 ? `${fil.weightGrams / 1000} kg` : `${fil.weightGrams} g`}</span>
                        <span>•</span>
                        <span className={fil?.stockSpools > 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                          {fil?.stockSpools > 0 ? `${fil?.stockSpools} spools in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
                    <div className="flex items-center gap-1.5 text-xs text-white/70">
                      <span className="text-[11px] text-white/40">Price Adj:</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40 text-xs">₹</span>
                        <input
                          type="number"
                          step="10"
                          value={v.priceAdjustment}
                          onChange={(e) => updateFilamentVariation(filId, 'priceAdjustment', Number(e.target.value))}
                          className="field-input h-8 w-24 pl-5 pr-2 text-xs bg-black text-white border-white/15"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.isAvailable}
                        onChange={(e) => updateFilamentVariation(filId, 'isAvailable', e.target.checked)}
                        className="rounded border-white/20 bg-black text-[#c5a059] focus:ring-[#c5a059]"
                      />
                      <span>Active</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeFilamentVariation(filId)}
                      className="rounded border border-red-500/20 bg-red-500/10 p-1.5 text-xs text-red-400 hover:bg-red-500/20"
                      title="Remove variation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
