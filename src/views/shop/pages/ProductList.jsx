import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link, useOutletContext } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import ProductCard from '../components/ProductCard'
import { ApiStatusScreen } from '../../ui/ApiStatusScreen'
import NotFoundPage from './NotFoundPage'
import { Filter, SlidersHorizontal, RotateCcw, ChevronRight, Check } from 'lucide-react'

const FILAMENT_PILLS = ['All', 'PLA', 'PLA+', 'PETG', 'ABS', 'TPU', 'ASA', 'Nylon', 'Specialty']

const COLOR_SWATCHES = [
  { name: 'Black', hex: '#111827' },
  { name: 'White', hex: '#ffffff', border: true },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Gray', hex: '#64748b' },
]

export default function ProductList({ categoryMode = false }) {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const outletCtx = useOutletContext() || {}

  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [cat, setCat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageStatus, setPageStatus] = useState(null)
  const [catMissing, setCatMissing] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Filters from URL
  const query = useMemo(
    () => ({
      q: params.get('q') || '',
      category: categoryMode ? slug : params.get('category') || '',
      material: params.get('material') || '',
      color: params.get('color') || '',
      diameter: params.get('diameter') || '',
      weight: params.get('weight') || '',
      minPrice: params.get('min') || '',
      maxPrice: params.get('max') || '50000',
      stock: params.get('stock') || '',
      sort: params.get('sort') || 'featured',
    }),
    [params, categoryMode, slug],
  )

  useEffect(() => {
    api.categories().then(setCats).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const p = {}
    if (query.q) p.q = query.q
    if (query.category) p.category = query.category
    if (query.minPrice) p.minPrice = query.minPrice
    if (query.maxPrice) p.maxPrice = query.maxPrice
    if (query.stock) p.stock = query.stock
    if (query.sort) p.sort = query.sort

    api
      .products(p)
      .then((list) => {
        setItems(list)
        setPageStatus(null)
      })
      .catch((e) => {
        setItems([])
        setPageStatus(e.status ?? 500)
      })
      .finally(() => setLoading(false))

    const activeSlug = categoryMode ? slug : query.category
    if (activeSlug) {
      api.categories().then((list) => {
        const found = list.find((c) => c.slug === activeSlug) || null
        setCat(found)
        if (categoryMode) setCatMissing(!found)
      })
    } else {
      setCat(null)
      setCatMissing(false)
    }
  }, [query, categoryMode, slug])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const resetAllFilters = () => {
    navigate(categoryMode ? `/shop/category/${slug}` : '/shop/products')
  }

  const isFilamentPage =
    slug === 'filaments' ||
    query.category?.toLowerCase().includes('filament') ||
    query.q?.toLowerCase().includes('filament') ||
    query.q?.toLowerCase().includes('pla')

  // Filter items in memory if client filters (material, color, price) applied
  const displayedItems = useMemo(() => {
    let result = [...items]
    if (query.material && query.material !== 'All') {
      const mat = query.material.toLowerCase()
      result = result.filter(
        (i) =>
          i.name?.toLowerCase().includes(mat) ||
          i.tags?.some((t) => t.toLowerCase().includes(mat)),
      )
    }
    if (query.maxPrice && Number(query.maxPrice) < 50000) {
      result = result.filter((i) => i.price <= Number(query.maxPrice))
    }
    if (query.stock === 'in') {
      result = result.filter((i) => i.inStock)
    }
    return result
  }, [items, query.material, query.maxPrice, query.stock])

  if (pageStatus != null && pageStatus !== 404) {
    return <ApiStatusScreen status={pageStatus} onRetry={() => window.location.reload()} />
  }
  if (categoryMode && catMissing) return <NotFoundPage />

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link to="/shop" className="hover:text-slate-900 transition-colors">
          Shop
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        {cat ? (
          <span className="font-semibold text-slate-900">{cat.name}</span>
        ) : query.q ? (
          <span>
            Search for &ldquo;<strong className="text-slate-900">{query.q}</strong>&rdquo;
          </span>
        ) : (
          <span className="font-semibold text-slate-900">All Products</span>
        )}
      </nav>

      {/* Header Banner & Material Pills */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {cat ? cat.name : query.q ? `Results for "${query.q}"` : 'All Products & Components'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              {cat?.description ||
                'High-performance 3D printing equipment, engineering resins, electronics, and precision hardware.'}
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{displayedItems.length}</strong> items
          </div>
        </div>

        {/* Quick Filament Pills */}
        {isFilamentPage && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <span className="text-xs font-bold text-slate-400 shrink-0">Material:</span>
            {FILAMENT_PILLS.map((mat) => (
              <button
                key={mat}
                type="button"
                onClick={() => setFilter('material', mat === 'All' ? '' : mat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  (mat === 'All' && !query.material) || query.material === mat
                    ? 'bg-[#f97316] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar Filters + Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Mobile Filter Button */}
        <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setMobileFilterOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-slate-800"
          >
            <SlidersHorizontal size={14} className="text-[#f97316]" />
            <span>Filter Products</span>
          </button>
          <select
            value={query.sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-semibold text-slate-700 outline-none"
          >
            <option value="featured">Sort: Featured</option>
            <option value="best">Sort: Popularity</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>

        {/* Left Sidebar Filters */}
        <aside
          className={`lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-6 ${
            mobileFilterOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Filter size={15} className="text-[#f97316]" />
              <span>Filters</span>
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={11} />
              <span>Clear All</span>
            </button>
          </div>

          {/* Categories */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Department</div>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 py-1 text-slate-700 hover:text-[#f97316] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!query.category}
                  onChange={() => setFilter('category', '')}
                  className="rounded text-[#f97316] focus:ring-[#f97316]"
                />
                <span className="font-medium">All Departments</span>
              </label>
              {cats.map((c) => (
                <label
                  key={c.slug}
                  className="flex items-center justify-between py-1 text-slate-700 hover:text-[#f97316] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={query.category === c.slug}
                      onChange={() => {
                        if (categoryMode) {
                          navigate(query.category === c.slug ? '/shop/products' : `/shop/category/${c.slug}`)
                          return
                        }
                        setFilter('category', query.category === c.slug ? '' : c.slug)
                      }}
                      className="rounded text-[#f97316] focus:ring-[#f97316]"
                    />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  {c.productCount != null && (
                    <span className="text-[10px] text-slate-400">({c.productCount})</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Max Price</div>
            <input
              type="range"
              min="200"
              max="50000"
              step="500"
              value={query.maxPrice}
              onChange={(e) => setFilter('max', e.target.value)}
              className="w-full accent-[#f97316]"
            />
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1">
              <span>₹200</span>
              <span className="text-[#f97316]">{inr(Number(query.maxPrice))}</span>
            </div>
          </div>

          {/* Filament Colors */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Color</div>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => setFilter('color', query.color === swatch.name ? '' : swatch.name)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                    query.color === swatch.name ? 'scale-110 ring-2 ring-orange-500' : 'hover:scale-105'
                  } ${swatch.border ? 'border border-slate-300' : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                >
                  {query.color === swatch.name && (
                    <Check
                      size={12}
                      className={swatch.name === 'White' ? 'text-slate-900' : 'text-white'}
                      strokeWidth={3}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Availability</div>
            <label className="flex items-center gap-2 py-1 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={query.stock === 'in'}
                onChange={() => setFilter('stock', query.stock === 'in' ? '' : 'in')}
                className="rounded text-[#f97316] focus:ring-[#f97316]"
              />
              <span className="font-medium">In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Right Product Grid */}
        <section className="lg:col-span-9 space-y-5">
          {/* Desktop Sort Header */}
          <div className="hidden lg:flex items-center justify-between bg-white p-3 px-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">
              Showing {displayedItems.length} products
            </span>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Sort by:</span>
              <select
                value={query.sort}
                onChange={(e) => setFilter('sort', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300"
              >
                <option value="featured">Featured</option>
                <option value="best">Popularity / Best Selling</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>

          {/* Product Cards */}
          {displayedItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-50 text-[#f97316] flex items-center justify-center mx-auto mb-4">
                <Filter size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">No matching products found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try loosening your filters or searching for another term like &ldquo;PLA&rdquo;, &ldquo;Printer&rdquo;, or &ldquo;Electronics&rdquo;.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn-shop-primary text-xs mt-6"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedItems.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickAdd={() => {
                    if (outletCtx.onOpenCart) outletCtx.onOpenCart()
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
