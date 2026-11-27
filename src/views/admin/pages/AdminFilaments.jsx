import { useEffect, useState, useMemo } from 'react'
import {
  Layers,
  Plus,
  Search,
  Sliders,
  History,
  Edit2,
  Trash2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Package,
  PlusCircle,
  MinusCircle,
  X,
  Disc,
  Info,
} from 'lucide-react'
import { api, inr } from '../../../models/api'

const MATERIALS = ['ALL', 'PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'PC', 'Carbon Fiber']
const DIAMETERS = [1.75, 2.85]
const COMMON_SPOOL_WEIGHTS = [
  { label: '1 kg (1000g)', grams: 1000 },
  { label: '500 g', grams: 500 },
  { label: '250 g', grams: 250 },
  { label: '2 kg (2000g)', grams: 2000 },
]

const emptyFilament = {
  name: '',
  material: 'PLA',
  colorName: '',
  colorHex: '#1a1a1a',
  diameter: 1.75,
  weightGrams: 1000,
  stockSpools: 10,
  sku: '',
  supplier: '',
  costPerSpool: 0,
  lowStockThreshold: 5,
  notes: '',
  isActive: true,
}

export default function AdminFilaments() {
  const [data, setData] = useState({ filaments: [], summary: null })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [materialFilter, setMaterialFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyFilament)
  const [formErr, setFormErr] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Stock Adjust Modal
  const [adjustModalItem, setAdjustModalItem] = useState(null)
  const [adjustData, setAdjustData] = useState({
    actionType: 'received', // 'received', 'used', 'adjustment'
    qty: 5,
    notes: '',
  })
  const [adjustErr, setAdjustErr] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  // History Modal
  const [historyItem, setHistoryItem] = useState(null)
  const [historyMovements, setHistoryMovements] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.adminFilaments({
        q,
        material: materialFilter,
        status: statusFilter,
      })
      setData(res || { filaments: [], summary: null })
    } catch (err) {
      console.error('Failed to load filaments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [q, materialFilter, statusFilter])

  // Open Form Modal for Create or Edit
  const openCreateModal = () => {
    setEditItem(null)
    setForm(emptyFilament)
    setFormErr('')
    setFormModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditItem(item)
    setForm({
      name: item.name,
      material: item.material,
      colorName: item.colorName,
      colorHex: item.colorHex,
      diameter: item.diameter,
      weightGrams: item.weightGrams,
      stockSpools: item.stockSpools,
      sku: item.sku,
      supplier: item.supplier,
      costPerSpool: item.costPerSpool,
      lowStockThreshold: item.lowStockThreshold,
      notes: item.notes,
      isActive: item.isActive,
    })
    setFormErr('')
    setFormModalOpen(true)
  }

  const handleSaveFilament = async (e) => {
    e.preventDefault()
    setFormErr('')
    if (!form.name.trim()) return setFormErr('Filament name is required')
    if (!form.colorName.trim()) return setFormErr('Color name is required')

    setFormSaving(true)
    try {
      if (editItem) {
        await api.adminUpdateFilament(editItem.id, form)
      } else {
        await api.adminCreateFilament(form)
      }
      setFormModalOpen(false)
      loadData()
    } catch (ex) {
      setFormErr(ex.message || 'Error saving filament entry')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteFilament = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete filament "${name}"? This will also remove any product assignments.`)) {
      return
    }
    try {
      await api.adminDeleteFilament(id)
      loadData()
    } catch (ex) {
      alert(ex.message || 'Could not delete filament')
    }
  }

  // Stock Adjustment
  const openAdjustModal = (item, defaultType = 'received') => {
    setAdjustModalItem(item)
    setAdjustData({
      actionType: defaultType,
      qty: 1,
      notes: defaultType === 'received' ? 'Stock shipment received' : defaultType === 'used' ? 'Production spool consumed' : 'Physical count reconciliation',
    })
    setAdjustErr('')
  }

  const handleAdjustStock = async (e) => {
    e.preventDefault()
    setAdjustErr('')
    const quantity = Math.abs(parseInt(adjustData.qty, 10) || 0)
    if (quantity <= 0) return setAdjustErr('Quantity must be greater than zero')

    let delta = quantity
    if (adjustData.actionType === 'used') {
      delta = -quantity
    } else if (adjustData.actionType === 'adjustment') {
      // delta is explicit relative adjustment or handled directly
      delta = Number(adjustData.qty)
      if (delta === 0) return setAdjustErr('Delta cannot be 0')
    }

    setAdjustSaving(true)
    try {
      await api.adminAdjustFilamentStock(
        adjustModalItem.id,
        delta,
        adjustData.actionType,
        adjustData.notes
      )
      setAdjustModalItem(null)
      loadData()
    } catch (ex) {
      setAdjustErr(ex.message || 'Error adjusting stock')
    } finally {
      setAdjustSaving(false)
    }
  }

  // History
  const openHistoryModal = async (item) => {
    setHistoryItem(item)
    setHistoryLoading(true)
    try {
      const res = await api.adminFilamentHistory(item.id)
      setHistoryMovements(res.movements || [])
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const summary = data.summary || {
    totalTypes: 0,
    totalSpools: 0,
    totalWeightKg: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl text-white">Filament Entry</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage raw filament inventory, spools, material types, and audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-md bg-[#c5a059] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4b069] transition-colors self-start sm:self-auto"
        >
          <Plus size={16} /> Add Filament Stock
        </button>
      </div>

      {/* KPI Inventory Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-[#111] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
            <span>Total Available Stock</span>
            <Disc size={16} className="text-[#c5a059]" />
          </div>
          <div className="mt-2 font-serif text-3xl text-white">
            {summary.totalSpools} <span className="text-base font-normal text-white/60">spools</span>
          </div>
          <div className="mt-1 text-xs text-[#c5a059]">
            {summary.totalWeightKg} kg total filament weight
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
            <span>Filament Types</span>
            <Layers size={16} className="text-blue-400" />
          </div>
          <div className="mt-2 font-serif text-3xl text-white">
            {summary.totalTypes}
          </div>
          <div className="mt-1 text-xs text-white/40">
            Distinct material & color variations
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
            <span>Low Stock Items</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className={`mt-2 font-serif text-3xl ${summary.lowStockCount > 0 ? 'text-amber-300' : 'text-white'}`}>
            {summary.lowStockCount}
          </div>
          <div className="mt-1 text-xs text-amber-400/80">
            At or below low threshold
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
            <span>Out of Stock</span>
            <XCircle size={16} className="text-red-400" />
          </div>
          <div className={`mt-2 font-serif text-3xl ${summary.outOfStockCount > 0 ? 'text-red-400' : 'text-white'}`}>
            {summary.outOfStockCount}
          </div>
          <div className="mt-1 text-xs text-red-400/80">
            0 spools remaining
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            id="filament-search"
            name="filamentSearch"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search material, color, SKU, supplier..."
            className="field-input h-10 w-full pl-9 pr-3 text-sm bg-black border-white/15 focus:border-[#c5a059]"
            aria-label="Search material, color, SKU, supplier"
          />
        </div>

        <select
          id="filament-material-filter"
          name="filamentMaterialFilter"
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
          className="field-input h-10 w-auto bg-black text-sm border-white/15"
          aria-label="Filter by material"
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m === 'ALL' ? 'All Materials' : m}
            </option>
          ))}
        </select>

        <select
          id="filament-status-filter"
          name="filamentStatusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field-input h-10 w-auto bg-black text-sm border-white/15"
          aria-label="Filter by stock status"
        >
          <option value="ALL">All Status</option>
          <option value="HEALTHY">Healthy Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Filaments Stock Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#111]">
        <table className="w-full text-left text-sm text-white/80">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/40">
            <tr>
              <th className="py-3.5 pl-4 pr-3">Filament</th>
              <th className="px-3 py-3.5">Material</th>
              <th className="px-3 py-3.5">Color</th>
              <th className="px-3 py-3.5">Diameter & Spool</th>
              <th className="px-3 py-3.5">Available Stock</th>
              <th className="px-3 py-3.5">SKU / Code</th>
              <th className="px-3 py-3.5">Cost / Spool</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-white/40">
                  Loading filament inventory…
                </td>
              </tr>
            ) : data.filaments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-white/40">
                  No filament entries found matching your filters.
                </td>
              </tr>
            ) : (
              data.filaments.map((f) => (
                <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pl-4 pr-3 font-medium text-white">
                    <div>{f.name}</div>
                    {f.supplier && <div className="text-xs text-white/40">by {f.supplier}</div>}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono font-semibold text-white">
                      {f.material}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: f.colorHex }}
                      />
                      <span className="text-xs font-medium text-white">{f.colorName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-white/70">
                    <div>{f.diameter} mm</div>
                    <div className="text-white/40">
                      {f.weightGrams >= 1000 ? `${f.weightGrams / 1000} kg` : `${f.weightGrams} g`}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="font-semibold text-white">
                      {f.stockSpools} <span className="text-xs font-normal text-white/50">spools</span>
                    </div>
                    <div className="text-xs text-[#c5a059]">
                      ~{f.totalWeightKg} kg
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs text-white/60">
                    {f.sku || '—'}
                  </td>
                  <td className="px-3 py-3.5 text-xs text-white/70">
                    {f.costPerSpool ? inr(f.costPerSpool) : '—'}
                  </td>
                  <td className="px-3 py-3.5">
                    {f.status === 'HEALTHY' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 size={13} /> Healthy
                      </span>
                    )}
                    {f.status === 'LOW_STOCK' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300">
                        <AlertTriangle size={13} /> Low ({f.stockSpools} left)
                      </span>
                    )}
                    {f.status === 'OUT_OF_STOCK' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                        <XCircle size={13} /> Out of Stock
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 pl-3 pr-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(f, 'received')}
                        title="Record stock received or used"
                        className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Sliders size={12} /> Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistoryModal(f)}
                        title="View stock history & movements"
                        className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <History size={12} className="text-[#c5a059]" /> Log
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(f)}
                        title="Edit details"
                        className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFilament(f.id, f.name)}
                        title="Delete filament"
                        className="inline-flex items-center rounded border border-red-500/20 bg-red-500/10 p-1 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── CREATE / EDIT FILAMENT MODAL ── */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-[#121212] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="font-serif text-2xl text-white">
                {editItem ? 'Edit Filament Details' : 'Add New Filament Stock'}
              </h2>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {formErr && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {formErr}
              </div>
            )}

            <form onSubmit={handleSaveFilament} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="filament-form-name" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Filament Name *
                  </label>
                  <input
                    id="filament-form-name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Standard PLA - Matte Black"
                    className="field-input w-full bg-black text-white border-white/15 focus:border-[#c5a059]"
                  />
                </div>

                <div>
                  <label htmlFor="filament-form-material" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Material Type *
                  </label>
                  <select
                    id="filament-form-material"
                    name="material"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    className="field-input w-full bg-black text-white border-white/15"
                  >
                    {MATERIALS.filter((m) => m !== 'ALL').map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="filament-form-diameter" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Diameter (mm) *
                  </label>
                  <select
                    id="filament-form-diameter"
                    name="diameter"
                    value={form.diameter}
                    onChange={(e) => setForm({ ...form, diameter: Number(e.target.value) })}
                    className="field-input w-full bg-black text-white border-white/15"
                  >
                    {DIAMETERS.map((d) => (
                      <option key={d} value={d}>
                        {d} mm
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="filament-form-color-name" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Color Name *
                  </label>
                  <input
                    id="filament-form-color-name"
                    name="colorName"
                    type="text"
                    required
                    value={form.colorName}
                    onChange={(e) => setForm({ ...form, colorName: e.target.value })}
                    placeholder="e.g. Matte Black"
                    className="field-input w-full bg-black text-white border-white/15"
                  />
                </div>

                <div>
                  <label htmlFor="filament-form-color-hex" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Color Hex Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="filament-form-color-picker"
                      name="colorPicker"
                      type="color"
                      value={form.colorHex}
                      onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded border border-white/20 bg-transparent p-1"
                    />
                    <input
                      id="filament-form-color-hex"
                      name="colorHex"
                      type="text"
                      value={form.colorHex}
                      onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                      placeholder="#1a1a1a"
                      className="field-input flex-1 bg-black text-white font-mono text-xs border-white/15"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="filament-form-weight-grams" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Spool Weight (Grams) *
                  </label>
                  <input
                    id="filament-form-weight-grams"
                    name="weightGrams"
                    type="number"
                    min="50"
                    step="50"
                    required
                    value={form.weightGrams}
                    onChange={(e) => setForm({ ...form, weightGrams: Number(e.target.value) })}
                    placeholder="1000"
                    className="field-input w-full bg-black text-white border-white/15"
                  />
                  <div className="mt-1 text-[11px] text-white/40">
                    {form.weightGrams >= 1000 ? `${form.weightGrams / 1000} kg per spool` : `${form.weightGrams} grams per spool`}
                  </div>
                </div>

                {!editItem && (
                  <div>
                    <label htmlFor="filament-form-stock-spools" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                      Initial Stock (Spools)
                    </label>
                    <input
                      id="filament-form-stock-spools"
                      name="stockSpools"
                      type="number"
                      min="0"
                      value={form.stockSpools}
                      onChange={(e) => setForm({ ...form, stockSpools: Number(e.target.value) })}
                      className="field-input w-full bg-black text-white border-white/15"
                    />
                    <div className="mt-1 text-[11px] text-[#c5a059]">
                      Total weight: {((form.stockSpools * form.weightGrams) / 1000).toFixed(1)} kg
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="filament-form-sku" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    SKU / Inventory Code
                  </label>
                  <input
                    id="filament-form-sku"
                    name="sku"
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. FIL-PLA-BLK-175"
                    className="field-input w-full bg-black text-white font-mono text-xs border-white/15"
                  />
                </div>

                <div>
                  <label htmlFor="filament-form-supplier" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Supplier / Brand
                  </label>
                  <input
                    id="filament-form-supplier"
                    name="supplier"
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="e.g. Polymaker, eSUN, Sunlu"
                    className="field-input w-full bg-black text-white border-white/15"
                  />
                </div>

                <div>
                  <label htmlFor="filament-form-cost-per-spool" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Cost Per Spool (Admin only ₹)
                  </label>
                  <input
                    id="filament-form-cost-per-spool"
                    name="costPerSpool"
                    type="number"
                    min="0"
                    step="1"
                    value={form.costPerSpool}
                    onChange={(e) => setForm({ ...form, costPerSpool: Number(e.target.value) })}
                    placeholder="1200"
                    className="field-input w-full bg-black text-white border-white/15"
                  />
                </div>

                <div>
                  <label htmlFor="filament-form-low-stock-threshold" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Low Stock Threshold (Spools)
                  </label>
                  <input
                    id="filament-form-low-stock-threshold"
                    name="lowStockThreshold"
                    type="number"
                    min="1"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
                    placeholder="5"
                    className="field-input w-full bg-black text-white border-white/15"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="filament-form-notes" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                    Internal Notes / Print Specs
                  </label>
                  <textarea
                    id="filament-form-notes"
                    name="notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Recommended nozzle 210°C, bed 60°C, matte texture"
                    className="field-input w-full bg-black text-white border-white/15"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="rounded-md bg-[#c5a059] px-5 py-2 text-xs font-semibold text-black hover:bg-[#d4b069] disabled:opacity-50"
                >
                  {formSaving ? 'Saving…' : editItem ? 'Update Filament' : 'Save Filament Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK ADJUSTMENT MODAL ── */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#121212] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="font-serif text-xl text-white">Record Stock Change</h2>
                <div className="text-xs text-white/50 mt-0.5">{adjustModalItem.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-lg bg-white/5 p-3.5 flex items-center justify-between text-xs">
              <div>
                <div className="text-white/40 uppercase tracking-wider">Current Stock</div>
                <div className="font-serif text-2xl text-white mt-0.5">
                  {adjustModalItem.stockSpools} spools
                </div>
              </div>
              <div className="text-right text-[#c5a059]">
                <div>{adjustModalItem.totalWeightKg} kg total</div>
                <div className="text-white/40 text-[11px] mt-0.5">
                  {adjustModalItem.weightGrams >= 1000
                    ? `${adjustModalItem.weightGrams / 1000}kg/spool`
                    : `${adjustModalItem.weightGrams}g/spool`}
                </div>
              </div>
            </div>

            {adjustErr && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {adjustErr}
              </div>
            )}

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'received', label: '+ Received', icon: PlusCircle, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                    { key: 'used', label: '- Used', icon: MinusCircle, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
                    { key: 'adjustment', label: 'Reconcile', icon: Sliders, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
                  ].map((act) => (
                    <button
                      key={act.key}
                      type="button"
                      onClick={() => setAdjustData({ ...adjustData, actionType: act.key })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        adjustData.actionType === act.key
                          ? `${act.color} ring-1 ring-[#c5a059]`
                          : 'border-white/10 bg-black/40 text-white/50 hover:text-white'
                      }`}
                    >
                      <act.icon size={16} className="mb-1" />
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="adjust-stock-qty" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                  {adjustData.actionType === 'received'
                    ? 'Spools Received'
                    : adjustData.actionType === 'used'
                    ? 'Spools Used / Consumed'
                    : 'Net Spool Adjustment (+ or -)'}
                </label>
                <input
                  id="adjust-stock-qty"
                  name="adjustStockQty"
                  type="number"
                  step="1"
                  required
                  value={adjustData.qty}
                  onChange={(e) => setAdjustData({ ...adjustData, qty: e.target.value })}
                  placeholder="e.g. 5"
                  className="field-input w-full bg-black text-white text-base font-semibold border-white/15"
                />
                <div className="mt-1 text-[11px] text-white/40">
                  {adjustData.actionType === 'received' &&
                    `Resulting stock will be: ${adjustModalItem.stockSpools + (parseInt(adjustData.qty, 10) || 0)} spools`}
                  {adjustData.actionType === 'used' &&
                    `Resulting stock will be: ${Math.max(0, adjustModalItem.stockSpools - (parseInt(adjustData.qty, 10) || 0))} spools`}
                  {adjustData.actionType === 'adjustment' &&
                    `Resulting stock will be: ${adjustModalItem.stockSpools + (parseInt(adjustData.qty, 10) || 0)} spools`}
                </div>
              </div>

              <div>
                <label htmlFor="adjust-stock-notes" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
                  Reason / Notes *
                </label>
                <input
                  id="adjust-stock-notes"
                  name="adjustStockNotes"
                  type="text"
                  required
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  placeholder="e.g. Supplier delivery PO-409, batch defect, etc."
                  className="field-input w-full bg-black text-white border-white/15"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSaving}
                  className="rounded-md bg-[#c5a059] px-5 py-2 text-xs font-semibold text-black hover:bg-[#d4b069] disabled:opacity-50"
                >
                  {adjustSaving ? 'Applying…' : 'Record Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK HISTORY & AUDIT LOG MODAL ── */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-[#121212] p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div>
                <h2 className="font-serif text-2xl text-white">Stock Movement Audit Log</h2>
                <div className="text-xs text-white/50 mt-0.5">
                  {historyItem.name} ({historyItem.material} · {historyItem.colorName})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-white/40">Loading movements…</div>
              ) : historyMovements.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No movement records found for this filament yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-white/80">
                  <thead className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5">Date & Time</th>
                      <th className="py-2.5">Change (Spools)</th>
                      <th className="py-2.5">Stock After</th>
                      <th className="py-2.5">Reason</th>
                      <th className="py-2.5">Notes / Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historyMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 text-white/50">
                          {new Date(m.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2.5 font-semibold">
                          <span className={m.deltaSpools > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {m.deltaSpools > 0 ? `+${m.deltaSpools}` : m.deltaSpools}
                          </span>
                        </td>
                        <td className="py-2.5 text-white font-medium">
                          {m.resultingStock} spools
                        </td>
                        <td className="py-2.5">
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/80">
                            {m.reason}
                          </span>
                        </td>
                        <td className="py-2.5 text-white/70">
                          <div>{m.notes || '—'}</div>
                          {m.orderId && (
                            <div className="text-[10px] text-[#c5a059]">Order ID: {m.orderId}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 text-right shrink-0">
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="rounded-md border border-white/15 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
