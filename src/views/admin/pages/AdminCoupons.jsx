import { useEffect, useState, useMemo } from 'react'
import {
  Tag,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Percent,
  DollarSign,
  Layers,
  Sparkles,
  X,
  Check,
} from 'lucide-react'
import { api, inr } from '../../../models/api'
import StatusBadge from '../../ui/StatusBadge'

function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'INVI'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const initialForm = {
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    minOrderValue: 0,
    maxDiscountAmount: '',
    usageLimit: '',
    perCustomerLimit: 1,
    appliesTo: 'ALL',
    productIds: [],
    categoryIds: [],
    evaluationMode: 'OR',
    status: 'ACTIVE',
  }

  const [form, setForm] = useState(initialForm)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (typeFilter !== 'ALL') params.discountType = typeFilter
      const res = await api.adminCoupons(params)
      setCoupons(res?.coupons || [])
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to load coupons' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      api.adminProducts().then(setProducts).catch(() => {}),
      api.adminCategories().then(setCategories).catch(() => {}),
    ])
  }, [])

  useEffect(() => {
    load()
  }, [statusFilter, typeFilter])

  const openCreateModal = () => {
    setEditingCoupon(null)
    setForm({
      ...initialForm,
      code: generateCouponCode(),
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    })
    setFormErr('')
    setModalOpen(true)
  }

  const openEditModal = (c) => {
    setEditingCoupon(c)
    setForm({
      code: c.code || '',
      description: c.description || '',
      discountType: c.discountType || 'PERCENTAGE',
      discountValue: c.discountValue || 0,
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
      minOrderValue: c.minOrderValue || 0,
      maxDiscountAmount: c.maxDiscountAmount != null ? c.maxDiscountAmount : '',
      usageLimit: c.usageLimit != null ? c.usageLimit : '',
      perCustomerLimit: c.perCustomerLimit != null ? c.perCustomerLimit : 1,
      appliesTo: c.appliesTo || 'ALL',
      productIds: Array.isArray(c.productIds) ? c.productIds : [],
      categoryIds: Array.isArray(c.categoryIds) ? c.categoryIds : [],
      evaluationMode: c.evaluationMode || 'OR',
      status: c.status || 'ACTIVE',
    })
    setFormErr('')
    setModalOpen(true)
  }

  const handleSaveCoupon = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormErr('')

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discountValue: Number(form.discountValue),
      minOrderValue: Number(form.minOrderValue || 0),
      maxDiscountAmount: form.maxDiscountAmount !== '' ? Number(form.maxDiscountAmount) : null,
      usageLimit: form.usageLimit !== '' ? Number(form.usageLimit) : null,
      perCustomerLimit: form.perCustomerLimit !== '' ? Number(form.perCustomerLimit) : 1,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    }

    if (new Date(payload.endDate) <= new Date(payload.startDate)) {
      setFormErr('End date and time must be later than start date and time')
      setSaving(false)
      return
    }

    try {
      if (editingCoupon) {
        await api.adminUpdateCoupon(editingCoupon.id, payload)
        setFeedback({ type: 'success', message: `Coupon "${payload.code}" updated successfully!` })
      } else {
        await api.adminCreateCoupon(payload)
        setFeedback({ type: 'success', message: `Coupon "${payload.code}" created successfully!` })
      }
      setModalOpen(false)
      load()
    } catch (ex) {
      setFormErr(ex.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (c) => {
    const newStatus = c.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
    setActionLoading(c.id)
    try {
      await api.adminUpdateCouponStatus(c.id, newStatus)
      setFeedback({ type: 'success', message: `Coupon ${c.code} status set to ${newStatus}` })
      load()
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to update status' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Are you sure you want to delete coupon ${c.code}? This cannot be undone.`)) return
    setActionLoading(c.id)
    try {
      await api.adminDeleteCoupon(c.id)
      setFeedback({ type: 'success', message: `Coupon ${c.code} deleted successfully` })
      load()
    } catch (e) {
      setFeedback({ type: 'error', message: e.message || 'Failed to delete coupon' })
    } finally {
      setActionLoading(null)
    }
  }

  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return coupons
    const q = searchQuery.toLowerCase()
    return coupons.filter(
      (c) =>
        c.code?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.discountType?.toLowerCase().includes(q)
    )
  }, [coupons, searchQuery])

  const stats = useMemo(() => {
    const total = coupons.length
    const active = coupons.filter((c) => c.status === 'ACTIVE').length
    const scheduled = coupons.filter((c) => c.status === 'SCHEDULED').length
    const expired = coupons.filter((c) => c.status === 'EXPIRED').length
    const disabled = coupons.filter((c) => c.status === 'DISABLED').length
    return { total, active, scheduled, expired, disabled }
  }, [coupons])

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Tag size={24} className="text-[#c5a059]" />
            <span>Discount Coupons</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Create, schedule, target, and monitor promo codes and automated discounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Refresh coupons"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#c5a059] hover:bg-[#b08d4b] text-black font-semibold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-white/40 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-white/50 block">Total Coupons</span>
          <span className="text-xl font-bold text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-emerald-400/80 block">Active Now</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">{stats.active}</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-blue-400/80 block">Scheduled</span>
          <span className="text-xl font-bold text-blue-400 mt-1 block">{stats.scheduled}</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-amber-400/80 block">Expired</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">{stats.expired}</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-white/40 block">Disabled</span>
          <span className="text-xl font-bold text-white/40 mt-1 block">{stats.disabled}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coupon code or description..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#18181b] border border-neutral-700 rounded-lg text-xs text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#18181b] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-[#c5a059] [&>option]:bg-[#18181b] [&>option]:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXPIRED">Expired</option>
            <option value="DISABLED">Disabled</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#18181b] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-[#c5a059] [&>option]:bg-[#18181b] [&>option]:text-white"
          >
            <option value="ALL">All Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed Amount (₹)</option>
          </select>
        </div>
      </div>

      {/* Coupon Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-white/50 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-white/40">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c5a059] border-t-transparent mx-auto mb-2" />
                    <span>Loading discount coupons…</span>
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-white/40">
                    <Tag size={28} className="mx-auto text-white/20 mb-2" />
                    <span>No coupons found matching your criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const isExp = new Date() > new Date(c.endDate)
                  const isSched = new Date() < new Date(c.startDate)
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white tracking-wider bg-white/10 px-2 py-0.5 rounded border border-white/15">
                            {c.code}
                          </span>
                        </div>
                        {c.description && (
                          <span className="text-[11px] text-white/50 block mt-1 line-clamp-1">
                            {c.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {c.discountType === 'PERCENTAGE' ? (
                          <span className="text-[#c5a059] flex items-center gap-1 font-bold">
                            <Percent size={13} />
                            <span>{c.discountValue}% OFF</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            {inr(c.discountValue)} OFF
                          </span>
                        )}
                        {c.minOrderValue > 0 && (
                          <span className="text-[10px] text-white/40 block mt-0.5">
                            Min: {inr(c.minOrderValue)}
                          </span>
                        )}
                        {c.maxDiscountAmount && (
                          <span className="text-[10px] text-white/40 block">
                            Cap: {inr(c.maxDiscountAmount)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-[11px] text-white/80">
                          <Layers size={11} className="text-[#c5a059]" />
                          <span>
                            {c.appliesTo === 'ALL'
                              ? 'All Products'
                              : c.appliesTo === 'PRODUCTS'
                              ? `${c.productIds?.length || 0} Products`
                              : c.appliesTo === 'CATEGORIES'
                              ? `${c.categoryIds?.length || 0} Categories`
                              : `Combined (${c.evaluationMode})`}
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white/70">
                        <div className="text-[11px]">
                          <span>{new Date(c.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-white/40 mx-1">→</span>
                          <span className={isExp ? 'text-red-400 font-semibold' : ''}>
                            {new Date(c.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/40 block mt-0.5">
                          {isExp ? 'Expired' : isSched ? 'Starts soon' : 'Active window'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white/80 font-mono">
                        <div>
                          <span className="font-bold text-white">{c.usageCount}</span>
                          <span className="text-white/40"> / {c.usageLimit ? c.usageLimit : '∞'}</span>
                        </div>
                        <span className="text-[10px] text-white/40 block">
                          Limit/user: {c.perCustomerLimit || 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            disabled={actionLoading === c.id}
                            className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
                              c.status === 'DISABLED'
                                ? 'text-emerald-400 hover:text-emerald-300'
                                : 'text-amber-400 hover:text-amber-300'
                            }`}
                            title={c.status === 'DISABLED' ? 'Enable coupon' : 'Disable coupon'}
                          >
                            {c.status === 'DISABLED' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            title="Edit coupon"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            disabled={actionLoading === c.id}
                            className="p-1.5 rounded hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                            title="Delete coupon"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div
            className="bg-[#121212] border border-white/15 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tag size={18} className="text-[#c5a059]" />
                  <span>{editingCoupon ? 'Edit Discount Coupon' : 'Create Discount Coupon'}</span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Configure discount amounts, schedule, target rules, and limits.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>

            {formErr && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formErr}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              {/* Code & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-white/70 font-semibold mb-1">
                    Coupon Code <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. INVI10, SUMMER50"
                      value={form.code}
                      onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      className="w-full uppercase font-mono px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 placeholder:font-sans outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, code: generateCouponCode() }))}
                      className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white shrink-0 border border-white/10"
                      title="Generate random code"
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 font-semibold mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white outline-none focus:border-[#c5a059] [&>option]:bg-[#18181b] [&>option]:text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/70 font-semibold mb-1">Internal Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 10% off for launch event customers"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                <div>
                  <label className="block text-white/70 font-semibold mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white outline-none focus:border-[#c5a059] [&>option]:bg-[#18181b] [&>option]:text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 font-semibold mb-1">
                    Discount Value <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 15"
                    value={form.discountValue}
                    onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-semibold mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Optional (e.g. 500)"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-medium"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 font-semibold mb-1">
                    Start Date & Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white [color-scheme:dark] outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-semibold mb-1">
                    End Date & Time (Expiry) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white [color-scheme:dark] outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-mono"
                  />
                </div>
              </div>

              {/* Eligibility Targeting */}
              <div className="space-y-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                <div>
                  <label className="block text-white/70 font-semibold mb-1">Applicable To</label>
                  <select
                    value={form.appliesTo}
                    onChange={(e) => setForm((f) => ({ ...f, appliesTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white outline-none focus:border-[#c5a059] [&>option]:bg-[#18181b] [&>option]:text-white"
                  >
                    <option value="ALL">All Store Products</option>
                    <option value="PRODUCTS">Specific Products Only</option>
                    <option value="CATEGORIES">Specific Categories Only</option>
                    <option value="COMBINED">Combined (Selected Products + Categories)</option>
                  </select>
                </div>

                {form.appliesTo === 'COMBINED' && (
                  <div>
                    <label className="block text-white/70 font-semibold mb-1">Combined Evaluation Mode</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                        <input
                          type="radio"
                          name="evalMode"
                          checked={form.evaluationMode === 'OR'}
                          onChange={() => setForm((f) => ({ ...f, evaluationMode: 'OR' }))}
                          className="accent-[#c5a059]"
                        />
                        <span>Match Product OR Category</span>
                      </label>
                      <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                        <input
                          type="radio"
                          name="evalMode"
                          checked={form.evaluationMode === 'AND'}
                          onChange={() => setForm((f) => ({ ...f, evaluationMode: 'AND' }))}
                          className="accent-[#c5a059]"
                        />
                        <span>Match Product AND Category</span>
                      </label>
                    </div>
                  </div>
                )}

                {(form.appliesTo === 'CATEGORIES' || form.appliesTo === 'COMBINED') && (
                  <div>
                    <label className="block text-white/70 font-semibold mb-1">
                      Target Categories ({form.categoryIds.length} selected)
                    </label>
                    <div className="max-h-36 overflow-y-auto p-2 bg-[#18181b] border border-neutral-700 rounded-lg space-y-1">
                      {categories.map((cat) => {
                        const checked = form.categoryIds.includes(cat.id)
                        return (
                          <label key={cat.id} className="flex items-center gap-2 py-1 px-1.5 hover:bg-white/5 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.categoryIds, cat.id]
                                  : form.categoryIds.filter((id) => id !== cat.id)
                                setForm((f) => ({ ...f, categoryIds: next }))
                              }}
                              className="accent-[#c5a059]"
                            />
                            <span className="text-white/80">{cat.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(form.appliesTo === 'PRODUCTS' || form.appliesTo === 'COMBINED') && (
                  <div>
                    <label className="block text-white/70 font-semibold mb-1">
                      Target Products ({form.productIds.length} selected)
                    </label>
                    <div className="max-h-36 overflow-y-auto p-2 bg-[#18181b] border border-neutral-700 rounded-lg space-y-1">
                      {products.map((p) => {
                        const checked = form.productIds.includes(p.id)
                        return (
                          <label key={p.id} className="flex items-center gap-2 py-1 px-1.5 hover:bg-white/5 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.productIds, p.id]
                                  : form.productIds.filter((id) => id !== p.id)
                                setForm((f) => ({ ...f, productIds: next }))
                              }}
                              className="accent-[#c5a059]"
                            />
                            <span className="text-white/80 truncate">{p.name}</span>
                            <span className="text-white/40 font-mono text-[10px] ml-auto">{inr(p.price)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Limits and Minimums */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-white/70 font-semibold mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 999 (0 for none)"
                    value={form.minOrderValue}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-semibold mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.usageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-white/70 font-semibold mb-1">Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={form.perCustomerLimit}
                    onChange={(e) => setForm((f) => ({ ...f, perCustomerLimit: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#18181b] border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]/30 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#c5a059] hover:bg-[#b08d4b] text-black font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving Coupon…' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
