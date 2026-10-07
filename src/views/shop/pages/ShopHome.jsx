import { useState, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Headphones,
  Box,
  CheckCircle2,
  Flame,
  ChevronRight,
  Tag,
  Layers,
} from 'lucide-react'
import { inr } from '../../../models/api'
import { useShopHome } from '../../../hooks/useShopHome'
import ProductCard from '../components/ProductCard'

// Category icon map — fallback for categories that don't have an image
const CAT_ICONS = [Box, Layers, ShieldCheck, Sparkles, Tag, Truck, Headphones]

export default function ShopHome() {
  const { cats, featured, fresh, best, loading, error } = useShopHome()
  const outletCtx = useOutletContext() || {}
  const [activeTab, setActiveTab] = useState('All')

  // Build unique set of products from DB (featured + new + best)
  const allProducts = useMemo(() => {
    const seen = new Set()
    const unique = []
    for (const p of [...(featured || []), ...(fresh || []), ...(best || [])]) {
      if (p?.id && !seen.has(p.id)) {
        seen.add(p.id)
        unique.push(p)
      }
    }
    return unique
  }, [featured, fresh, best])

  // Dynamic tabs from real DB categories + "All"
  const tabs = useMemo(() => {
    const catNames = (cats || []).map((c) => c.name)
    return ['All', ...catNames]
  }, [cats])

  // Filter by active tab
  const filteredProducts = useMemo(() => {
    if (activeTab === 'All') return allProducts.slice(0, 12)
    return allProducts.filter(
      (p) =>
        p.category?.name?.toLowerCase() === activeTab.toLowerCase() ||
        p.category?.name?.toLowerCase().includes(activeTab.toLowerCase()),
    )
  }, [allProducts, activeTab])

  // New arrivals (isNew flag from DB)
  const newArrivals = useMemo(() => (fresh || []).slice(0, 6), [fresh])

  // Best sellers (from DB best query)
  const bestSellers = useMemo(() => (best || []).slice(0, 4), [best])

  const onAddToCart = () => {
    if (outletCtx.onOpenCart) outletCtx.onOpenCart()
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-12">

      {/* =========================================================================
          1. HERO / PROMOTIONAL SPLIT BANNER
          ========================================================================= */}
      <section className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white overflow-hidden shadow-xl border border-slate-800">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 sm:p-12 lg:p-16">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#f97316] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Engineering &amp; Maker Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Build Ideas.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-orange-400 to-amber-300">
                Shape Tomorrow.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl font-medium leading-relaxed">
              Premium Electronics • Robotics Kits • Engineering Products • Educational Hardware
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/shop/products"
                className="btn-shop-primary text-sm px-6 py-3 font-bold gap-2 shadow-lg shadow-orange-950/40"
              >
                <span>Shop All Products</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/shop/products?sort=featured"
                className="btn-shop-outline text-sm px-5 py-3 font-semibold !bg-slate-900/60 !text-white !border-slate-700 hover:!border-orange-500 hover:!text-orange-400"
              >
                Featured Items
              </Link>
            </div>

            {/* Quick stats */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Next-Day Dispatch
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                GST Invoice Available
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Lab Tested Quality
              </span>
            </div>
          </div>

          {/* Right Product Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="absolute w-72 h-72 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-6 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-sm group">
              {featured?.[0]?.images?.[0]?.url ? (
                <img
                  src={featured[0].images[0].url}
                  alt={featured[0].name}
                  className="w-full h-64 sm:h-72 object-contain mix-blend-lighten transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <img
                  src="/images/hero-product.png"
                  alt="INVIHUB Products"
                  className="w-full h-64 sm:h-72 object-contain mix-blend-lighten transition-transform duration-500 group-hover:scale-105"
                />
              )}

              {featured?.[0] && (
                <div className="absolute bottom-4 right-4 bg-orange-600 text-white p-3 rounded-xl shadow-xl border border-orange-400/30 flex items-center gap-2.5">
                  <Flame size={20} className="fill-white" />
                  <div className="text-left leading-tight">
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-90">Featured</div>
                    <div className="text-xs font-black">{featured[0].name}</div>
                    <div className="text-[11px] font-semibold text-orange-200">{inr(featured[0].price)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. FEATURE VALUE PILLARS
          ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#f97316] flex items-center justify-center shrink-0">
            <Box size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Wide Product Range</div>
            <div className="text-[11px] text-slate-500">For Makers &amp; Professionals</div>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Quality Assured</div>
            <div className="text-[11px] text-slate-500">Tested &amp; Calibrated In-Lab</div>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Fast &amp; Secure Delivery</div>
            <div className="text-[11px] text-slate-500">Pan India Tracked Shipping</div>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Headphones size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Expert Engineering Support</div>
            <div className="text-[11px] text-slate-500">Help for Builds &amp; Projects</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SHOP BY CATEGORY — Dynamic from DB
          ========================================================================= */}
      {cats && cats.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Shop by Category</h2>
              <p className="text-xs text-slate-500 mt-0.5">Explore our catalogue</p>
            </div>
            <Link
              to="/shop/products"
              className="flex items-center gap-1 text-xs font-bold text-[#f97316] hover:text-[#ea580c] transition-colors"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className={`grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 ${cats.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'}`}>
            {cats.map((cat, idx) => {
              const Icon = CAT_ICONS[idx % CAT_ICONS.length]
              return (
                <Link
                  key={cat.id || cat.slug}
                  to={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
                  className="shop-card group p-3.5 text-center flex flex-col items-center justify-between h-44 hover:border-[#f97316]"
                >
                  <div className="w-20 h-20 rounded-md bg-slate-50 flex items-center justify-center overflow-hidden p-2 group-hover:scale-105 transition-transform duration-200">
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <Icon size={36} className="text-slate-300 group-hover:text-[#f97316] transition-colors" />
                    )}
                  </div>
                  <div className="mt-2 w-full">
                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-[#f97316] transition-colors line-clamp-1">
                      {cat.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {cat.productCount > 0 ? `${cat.productCount} product${cat.productCount > 1 ? 's' : ''}` : 'View All'}
                    </span>
                    <span className="text-[11px] font-semibold text-[#f97316] mt-1.5 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                      View Products →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          4. FEATURED PRODUCTS — With Dynamic Category Tabs from DB
          ========================================================================= */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Featured Products</h2>
            <p className="text-xs text-slate-500 mt-0.5">Top-rated gear selected by our team</p>
          </div>

          {/* Dynamic Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {tabs.slice(0, 8).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeTab === tab
                    ? 'bg-[#f97316] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            <p>{error}</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={onAddToCart} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            <p>No products in this category yet.</p>
            <Link to="/shop/products" className="mt-2 inline-block text-[#f97316] font-semibold">
              View all products →
            </Link>
          </div>
        )}
      </section>

      {/* =========================================================================
          5. BEST SELLERS
          ========================================================================= */}
      {bestSellers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Best Sellers</h2>
                <span className="bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Top Picks
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Most ordered products from our catalogue</p>
            </div>
            <Link
              to="/shop/products?sort=best"
              className="flex items-center gap-1 text-xs font-bold text-[#f97316] hover:text-[#ea580c] transition-colors"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={onAddToCart} />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          6. NEW ARRIVALS
          ========================================================================= */}
      {newArrivals.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">New Arrivals</h2>
                <span className="bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Fresh Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Newly added products from the latest stock</p>
            </div>
            <Link
              to="/shop/products?isNew=1"
              className="flex items-center gap-1 text-xs font-bold text-[#f97316] hover:text-[#ea580c] transition-colors"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={onAddToCart} />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          7. EMPTY STATE — when no products are in DB yet
          ========================================================================= */}
      {!loading && !error && allProducts.length === 0 && (
        <section className="py-16 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <Box size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">No products yet</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            The shop is being set up. Check back soon or add products via the admin dashboard.
          </p>
          <Link
            to="/shop/products"
            className="btn-shop-primary inline-flex gap-2 text-sm px-6 py-2.5"
          >
            <span>Browse Catalogue</span>
            <ArrowRight size={15} />
          </Link>
        </section>
      )}

      {/* =========================================================================
          8. CUSTOM 3D PRINTING & PROTOTYPING CTA
          ========================================================================= */}
      <section className="rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <span className="bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            🛠 Custom 3D Printing &amp; Prototyping
          </span>
          <h3 className="text-2xl sm:text-3xl font-black">Need a Custom Part or 3D Print?</h3>
          <p className="text-xs sm:text-sm text-orange-100">
            Upload your STL/STEP files or describe your design from scratch. We handle rapid slicing, premium filaments (PLA, PETG, ABS, Resin), and pan-India express dispatch.
          </p>
        </div>
        <Link
          to="/shop/custom-printing"
          className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-lg shadow-lg hover:scale-105 transition-all shrink-0"
        >
          Submit 3D Printing Request →
        </Link>
      </section>
    </main>
  )
}
