import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  Search,
  X,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { api, inr } from '../../../models/api'
import { adminBase } from '../../../config/adminPath'
import StatusBadge from '../../ui/StatusBadge'

export default function AdminProducts() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'table' | 'grid'
  const [activeImg, setActiveImg] = useState({}) // active image index per product card

  // Filters
  const [tab, setTab] = useState('ALL') // ALL, ACTIVE, INACTIVE, LOW_STOCK, OUT_OF_STOCK
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [q, setQ] = useState('')

  // Delete modal state
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = () => {
    setLoading(true)
    return Promise.all([
      api.adminProducts().then(setRows).catch(() => []),
      api.adminCategories().then(setCategories).catch(() => []),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = rows.filter((p) => {
      // Status & stock filter
      if (tab === 'ACTIVE' && p.status !== 'ACTIVE') return false
      if (tab === 'INACTIVE' && p.status === 'ACTIVE') return false
      if (tab === 'LOW_STOCK' && (p.stock > (p.lowStockThreshold || 5) || p.stock <= 0)) return false
      if (tab === 'OUT_OF_STOCK' && p.stock > 0) return false

      // Category filter
      if (selectedCategory !== 'ALL') {
        const catIds = Array.isArray(p.categoryIds) && p.categoryIds.length > 0
          ? p.categoryIds
          : [p.category?.id || p.categoryId].filter(Boolean)
        if (!catIds.includes(selectedCategory)) return false
      }

      // Search query
      if (q) {
        const query = q.toLowerCase().trim()
        const matchName = (p.name || '').toLowerCase().includes(query)
        const matchSku = (p.sku || '').toLowerCase().includes(query)
        const matchCategory =
          (p.category?.name || '').toLowerCase().includes(query) ||
          (p.categoryIds || []).some((id) =>
            categories.find((c) => c.id === id)?.name?.toLowerCase().includes(query)
          )
        if (!matchName && !matchSku && !matchCategory) return false
      }

      return true
    })

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0)
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0)
      if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0)
      if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0)
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '')
      if (sortBy === 'newest') {
        const rawA = a.createdAt || a.created_at
        const rawB = b.createdAt || b.created_at
        const timeA = rawA ? new Date(rawA).getTime() : 0
        const timeB = rawB ? new Date(rawB).getTime() : 0
        if (timeA && timeB && timeA !== timeB) return timeB - timeA
        // Stable fallback by ID so order never shifts arbitrarily
        return String(b.id || '').localeCompare(String(a.id || ''))
      }
      return 0
    })
  }, [rows, tab, selectedCategory, q, sortBy])

  const hasActiveFilters = tab !== 'ALL' || selectedCategory !== 'ALL' || q !== '' || sortBy !== 'newest'
  const resetFilters = () => {
    setTab('ALL')
    setSelectedCategory('ALL')
    setQ('')
    setSortBy('newest')
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.adminDeleteProduct(deleteConfirm.id)
      setDeleteConfirm(null)
      await load()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">Products</h1>
          <p className="mt-1 text-xs text-white/50">
            Manage your store catalog, pricing, inventory, and product imagery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Table / Grid view switcher */}
          <div className="flex items-center rounded-lg border border-white/10 bg-[#111] p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
              title="Table view"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
          </div>

          <Link to={`${adminBase}/products/new`} className="btn-gold w-auto !py-2 !px-4 text-sm font-medium">
            + Add Product
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-white/10 bg-[#111] p-4 space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {[
            { id: 'ALL', label: 'All Products', count: rows.length },
            { id: 'ACTIVE', label: 'Active', count: rows.filter((r) => r.status === 'ACTIVE').length },
            { id: 'INACTIVE', label: 'Archived / Inactive', count: rows.filter((r) => r.status !== 'ACTIVE').length },
            {
              id: 'LOW_STOCK',
              label: 'Low Stock',
              count: rows.filter((r) => r.stock > 0 && r.stock <= (r.lowStockThreshold || 5)).length,
            },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock', count: rows.filter((r) => r.stock === 0).length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#c5a059]/15 text-[#c5a059] border border-[#c5a059]/40'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] opacity-75 font-mono">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Search, Category, Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, SKU..."
              className="field-input !h-9 pl-9 pr-8 text-xs bg-black/50"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="field-input !h-9 text-xs bg-black/50"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="field-input !h-9 text-xs bg-black/50"
            >
              <option value="newest">Sort: Default / Recent</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
            </select>
          </div>

          {/* Clear & Count */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-xs text-white/50">
              Showing <span className="font-semibold text-white">{filtered.length}</span> of {rows.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-white/40">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-white/20 mb-3" />
          <h3 className="text-base font-medium text-white">No products found</h3>
          <p className="mt-1 text-xs text-white/50">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by creating your first product.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#c5a059]/30 bg-[#c5a059]/10 px-3 py-1.5 text-xs font-medium text-[#c5a059] hover:bg-[#c5a059]/20"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#111]">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40 bg-black/30">
              <tr>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3">All Images</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Stock</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p, idx) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-center text-xs text-white/40 font-mono">{idx + 1}</td>
                  {/* All Images Cell */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                      {p.images && p.images.length > 0 ? (
                        p.images.map((img, i) => (
                          <a
                            key={img.id || i}
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 w-10 shrink-0 rounded-lg bg-[#080808] border border-white/15 overflow-hidden hover:border-[#c5a059] transition-all flex items-center justify-center p-1"
                            title={`Image ${i + 1} of ${p.images.length} (click to view)`}
                          >
                            <img src={img.url} alt="" className="h-full w-full object-contain" />
                          </a>
                        ))
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#080808] border border-white/10 flex items-center justify-center text-white/20">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-white">{p.name}</td>
                  <td className="py-3 px-3 font-mono text-xs text-white/60">{p.sku}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(p.categoryIds && p.categoryIds.length > 0
                        ? p.categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean)
                        : [p.category?.name].filter(Boolean)
                      ).map((catName, ci) => (
                        <span
                          key={ci}
                          className="rounded bg-[#c5a059]/10 px-1.5 py-0.5 text-[10px] text-[#c5a059] font-medium border border-[#c5a059]/20"
                        >
                          {catName}
                        </span>
                      ))}
                      {!p.category && (!p.categoryIds || p.categoryIds.length === 0) && (
                        <span className="text-xs text-white/40">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-white">{inr(p.price)}</td>
                  <td className="py-3 px-3">
                    {p.stock === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Out of stock
                      </span>
                    ) : p.stock <= (p.lowStockThreshold || 5) ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {p.stock} (Low)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge value={p.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <Link
                        to={`${adminBase}/products/${p.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
                        title="Edit product"
                      >
                        <Pencil size={12} /> Edit
                      </Link>

                      {p.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => api.adminArchive(p.id).then(load)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/50 transition-colors"
                          title="Archive product"
                        >
                          <Archive size={12} /> Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => api.adminRestore(p.id).then(load)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors"
                          title="Restore product"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setDeleteConfirm(p)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                        title="Completely delete product"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* COMPACT & FITTED GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((p, idx) => {
            const imgCount = p.images?.length || 0
            const currentIdx = activeImg[p.id] ?? 0
            const currentImg = (p.images && p.images[currentIdx]) || p.images?.[0]

            return (
              <div
                key={p.id}
                className="group flex flex-col rounded-xl border border-white/10 bg-[#111] overflow-hidden hover:border-white/25 transition-all shadow-md"
              >
                {/* Main Fitted Image Area */}
                <div className="relative aspect-[4/3] w-full bg-[#070707] overflow-hidden flex items-center justify-center p-2">
                  {currentImg?.url ? (
                    <img
                      src={currentImg.url}
                      alt={p.name}
                      className="h-full w-full object-contain transition-transform duration-200"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-white/20">
                      <Package size={28} />
                      <span className="text-[9px] mt-1 text-white/30">No Image</span>
                    </div>
                  )}

                  {/* Left & Right Chevrons for cycling images directly on card */}
                  {imgCount > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveImg((prev) => ({
                            ...prev,
                            [p.id]: (currentIdx - 1 + imgCount) % imgCount,
                          }))
                        }}
                        className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/75 text-white/80 hover:text-white hover:bg-black flex items-center justify-center border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Previous image"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveImg((prev) => ({
                            ...prev,
                            [p.id]: (currentIdx + 1) % imgCount,
                          }))
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/75 text-white/80 hover:text-white hover:bg-black flex items-center justify-center border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Next image"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </>
                  )}

                  {/* Top Left: Sl No. & Image Position */}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className="rounded bg-black/80 px-1 py-0.5 text-[9px] font-mono text-white/80 border border-white/10 backdrop-blur-sm">
                      #{idx + 1}
                    </span>
                    {imgCount > 1 && (
                      <span className="rounded bg-[#c5a059]/20 px-1 py-0.5 text-[9px] font-mono text-[#c5a059] border border-[#c5a059]/30 backdrop-blur-sm">
                        {currentIdx + 1}/{imgCount}
                      </span>
                    )}
                  </div>

                  {/* Top Right: Status Badge */}
                  <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
                    <StatusBadge value={p.status} />
                    {p.stock === 0 ? (
                      <span className="rounded bg-red-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-red-300 border border-red-500/30 backdrop-blur-sm">
                        Out
                      </span>
                    ) : p.stock <= (p.lowStockThreshold || 5) ? (
                      <span className="rounded bg-amber-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                        Low: {p.stock}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* All Uploaded Images Thumbnail Strip */}
                {p.images && p.images.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-black/60 border-t border-b border-white/5 overflow-x-auto">
                    {p.images.map((img, i) => (
                      <button
                        key={img.id || i}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveImg((prev) => ({ ...prev, [p.id]: i }))
                        }}
                        onMouseEnter={() => {
                          setActiveImg((prev) => ({ ...prev, [p.id]: i }))
                        }}
                        className={`relative h-6 w-6 shrink-0 rounded border overflow-hidden transition-all flex items-center justify-center p-0.5 bg-black ${
                          currentIdx === i
                            ? 'border-[#c5a059] ring-1 ring-[#c5a059] scale-105'
                            : 'border-white/15 opacity-60 hover:opacity-100'
                        }`}
                        title={`View image ${i + 1} of ${p.images.length}`}
                      >
                        <img src={img.url} alt="" className="h-full w-full object-contain" />
                      </button>
                    ))}
                    <span className="text-[9px] text-white/40 ml-auto font-mono shrink-0 pl-1">
                      {p.images.length} {p.images.length === 1 ? 'img' : 'imgs'}
                    </span>
                  </div>
                )}

                {/* Product Information */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider text-[#c5a059] truncate" title={(p.categoryIds && p.categoryIds.length > 0 ? p.categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean) : [p.category?.name].filter(Boolean)).join(', ')}>
                      {(p.categoryIds && p.categoryIds.length > 0
                        ? p.categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean)
                        : [p.category?.name].filter(Boolean)
                      ).join(' · ') || 'Uncategorized'}
                    </div>
                    <h3
                      className="font-medium text-xs text-white mt-0.5 group-hover:text-[#c5a059] transition-colors truncate"
                      title={p.name}
                    >
                      {p.name}
                    </h3>
                    <div className="font-mono text-[10px] text-white/40 truncate">{p.sku}</div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-1.5">
                    <div>
                      <div className="text-[8px] uppercase text-white/40">Price</div>
                      <div className="text-xs sm:text-sm font-bold text-white">{inr(p.price)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] uppercase text-white/40">Stock</div>
                      <div className="text-[11px] font-medium text-white/80">{p.stock}</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="border-t border-white/10 bg-black/40 p-2 flex items-center justify-between gap-1">
                  <Link
                    to={`${adminBase}/products/${p.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    <Pencil size={11} /> Edit
                  </Link>

                  {p.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      onClick={() => api.adminArchive(p.id).then(load)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-1 text-[11px] font-medium text-orange-300 hover:bg-orange-500/20 transition-colors"
                      title="Archive"
                    >
                      <Archive size={11} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => api.adminRestore(p.id).then(load)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      title="Restore"
                    >
                      <RotateCcw size={11} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError('')
                      setDeleteConfirm(p)
                    }}
                    className="inline-flex items-center justify-center rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                    title="Delete product permanently"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Permanently Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-[#121212] p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Permanently Delete Product?</h3>
                <p className="mt-1 text-xs text-white/60 leading-relaxed">
                  Are you sure you want to completely delete{' '}
                  <span className="font-semibold text-white">{deleteConfirm.name}</span> (SKU:{' '}
                  <span className="font-mono text-white/80">{deleteConfirm.sku}</span>)?
                </p>
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-[11px] text-red-300 leading-tight">
                  ⚠️ This will permanently remove the product specifications, images, and inventory records. Existing
                  customer purchase records and receipts will remain intact. This action cannot be undone.
                </div>
                {deleteError && (
                  <p className="mt-2 text-xs text-red-400 font-medium">{deleteError}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting…' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
