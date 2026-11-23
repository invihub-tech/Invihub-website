import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Headphones,
  Box,
  ChevronRight,
} from 'lucide-react'
import { useShopHome } from '../../../hooks/useShopHome'
import ProductCard from '../components/ProductCard'

export default function ShopHome() {
  const { cats, featured, fresh, best, allProds, loading, error } = useShopHome()
  const outletCtx = useOutletContext() || {}

  // Build unique set of products from DB
  const allProducts = useMemo(() => {
    if (allProds?.length) return allProds
    const seen = new Set()
    const unique = []
    for (const p of [...(featured || []), ...(fresh || []), ...(best || [])]) {
      if (p?.id && !seen.has(p.id)) {
        seen.add(p.id)
        unique.push(p)
      }
    }
    return unique
  }, [allProds, featured, fresh, best])

  // Random selection of items across all categories rather than a single category
  const randomProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return []
    const shuffled = [...allProducts]
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 6)
  }, [allProducts])

  const onAddToCart = () => {
    if (outletCtx.onOpenCart) outletCtx.onOpenCart()
  }

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-12">

      {/* =========================================================================
          1. HERO SECTION — INVIHUB BRAND & MARKETPLACE IDENTITY
          ========================================================================= */}
      <section className="relative rounded-3xl bg-gradient-to-b from-[#090e1a] via-[#0f172a] to-[#0a101f] text-white overflow-hidden shadow-2xl border border-slate-800/80 py-16 sm:py-20 lg:py-24 px-6 sm:px-12 lg:px-16 text-center flex flex-col items-center justify-center">
        {/* Abstract Technical Grid Background with Radial Fade */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_45%,#000_65%,transparent_100%)] opacity-35 pointer-events-none" />

        {/* Ambient Glow Lights */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-transparent rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute top-1/3 -left-28 w-96 h-96 bg-sky-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-4 -right-28 w-96 h-96 bg-orange-600/10 rounded-full blur-[130px] pointer-events-none" />

        {/* Abstract Circuit & Engineering Vector Traces */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          {/* Left Circuit Lines & Nodes */}
          <path
            d="M 40 100 L 160 100 L 220 160 L 340 160"
            stroke="#f97316"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="40" cy="100" r="4" fill="#f97316" className="animate-pulse" />
          <circle cx="340" cy="160" r="3.5" fill="#f97316" />

          <path
            d="M 60 360 L 180 360 L 240 300 L 380 300"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <circle cx="60" cy="360" r="3.5" fill="#38bdf8" />
          <circle cx="380" cy="300" r="4" fill="#38bdf8" className="animate-pulse" />

          {/* Right Circuit Lines & Nodes */}
          <path
            d="M 1200 120 L 1080 120 L 1020 180 L 900 180"
            stroke="#f97316"
            strokeWidth="1.5"
          />
          <circle cx="1200" cy="120" r="4" fill="#f97316" />
          <circle cx="900" cy="180" r="3.5" fill="#f97316" className="animate-pulse" />

          <path
            d="M 1220 340 L 1100 340 L 1040 280 L 880 280"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="1220" cy="340" r="3.5" fill="#38bdf8" className="animate-pulse" />
          <circle cx="880" cy="280" r="4" fill="#38bdf8" />

          {/* Technical Crosshairs */}
          <path d="M 48 36 L 64 36 M 56 28 L 56 44" stroke="#64748b" strokeWidth="1" />
          <path d="M 1200 36 L 1216 36 M 1208 28 L 1208 44" stroke="#64748b" strokeWidth="1" />
          <path d="M 48 420 L 64 420 M 56 412 L 56 428" stroke="#64748b" strokeWidth="1" />
          <path d="M 1200 420 L 1216 420 M 1208 412 L 1208 428" stroke="#64748b" strokeWidth="1" />
        </svg>

        {/* Abstract Isometric 3D Geometric Accents */}
        <div className="absolute right-10 top-14 hidden xl:block opacity-25 pointer-events-none">
          <svg width="110" height="110" viewBox="0 0 110 110" fill="none" stroke="#f97316" strokeWidth="1">
            <polygon points="55,15 95,38 55,62 15,38" fill="none" />
            <polygon points="15,38 55,62 55,100 15,76" fill="none" />
            <polygon points="95,38 55,62 55,100 95,76" fill="none" />
          </svg>
        </div>
        <div className="absolute left-10 bottom-16 hidden xl:block opacity-20 pointer-events-none">
          <svg width="95" height="95" viewBox="0 0 95 95" fill="none" stroke="#38bdf8" strokeWidth="1">
            <polygon points="48,12 82,32 48,52 14,32" fill="none" />
            <polygon points="14,32 48,52 48,85 14,65" fill="none" />
            <polygon points="82,32 48,52 48,85 82,65" fill="none" />
          </svg>
        </div>

        {/* Centered Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 sm:space-y-8 flex flex-col items-center">
          {/* Small Label */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-[#f97316] text-xs font-bold uppercase tracking-widest shadow-xs">
            <Sparkles size={13} className="text-orange-400" />
            <span>ENGINEERING &amp; MAKER MARKETPLACE</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] max-w-3xl">
            Build Ideas.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-orange-400 to-amber-300">
              Shape Tomorrow.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed">
            Your destination for premium electronics, robotics kits, engineering products and educational hardware.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/shop/products"
              className="btn-shop-primary text-sm sm:text-base px-7 py-3.5 font-bold gap-2.5 shadow-xl shadow-orange-950/50 hover:shadow-orange-500/25 hover:scale-[1.02] transition-all"
            >
              <span>Shop All Products</span>
              <ArrowRight size={18} />
            </Link>
            <a
              href="#categories"
              onClick={(e) => {
                const el = document.getElementById('categories')
                if (el) {
                  e.preventDefault()
                  el.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="btn-shop-outline text-sm sm:text-base px-6 py-3.5 font-semibold !bg-slate-900/80 !text-slate-200 !border-slate-700/80 hover:!border-orange-500/80 hover:!text-white hover:!bg-slate-800/80 backdrop-blur-sm transition-all"
            >
              <span>Explore Categories</span>
            </a>
          </div>

          {/* Trust Indicators at the bottom */}
          <div className="pt-8 sm:pt-10 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={15} />
              </div>
              <span>Quality Assured</span>
            </div>
            <span className="hidden sm:inline-block text-slate-700 select-none">•</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Truck size={15} />
              </div>
              <span>Fast &amp; Secure Delivery</span>
            </div>
            <span className="hidden sm:inline-block text-slate-700 select-none">•</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <Headphones size={15} />
              </div>
              <span>Engineering Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SHOP BY CATEGORY — Dynamic from DB
          ========================================================================= */}
      {cats && cats.length > 0 && (
        <section id="categories" className="space-y-4">
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

          <div className="grid gap-4 sm:gap-5 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {cats.map((cat) => {
              const previews = cat.previewImages || []
              const bgImage = cat.imageUrl || previews[0]?.url || null

              return (
                <Link
                  key={cat.id || cat.slug}
                  to={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
                  className="shop-card group flex flex-col justify-between overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-[#f97316] hover:shadow-xl transition-all text-left"
                >
                  {/* Upper Section: Category Background Image & Product Count Badge */}
                  <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-900 shrink-0">
                    {bgImage ? (
                      <img
                        src={bgImage}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
                        <span className="text-white/20 font-black text-2xl uppercase tracking-widest select-none">
                          {cat.name.slice(0, 3)}
                        </span>
                      </div>
                    )}

                    {/* Subtle dark gradient overlay for visual balance & badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-black/30 pointer-events-none" />

                    {/* Product count badge at top-right */}
                    {cat.productCount > 0 && (
                      <span className="absolute top-2.5 right-2.5 bg-slate-950/75 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow-sm pointer-events-none">
                        {cat.productCount} {cat.productCount === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>

                  {/* Lower Section: Thumbnails, Category Name & Explore */}
                  <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 gap-3">
                    <div>
                      {/* Product Thumbnails: Single horizontal row of up to 6 images */}
                      {previews.length > 0 ? (
                        <div className="grid grid-cols-6 gap-1.5 w-full">
                          {previews.slice(0, 6).map((img, i) => (
                            <div
                              key={img.url + i}
                              className="aspect-square w-full rounded-lg border border-slate-200/90 bg-slate-50 p-1 flex items-center justify-center overflow-hidden hover:border-orange-300 transition-colors shadow-2xs"
                              title={img.productName || cat.name}
                            >
                              <img
                                src={img.url}
                                alt={img.alt || `${cat.name} product ${i + 1}`}
                                className="w-full h-full object-contain object-center mix-blend-multiply transition-transform duration-200 group-hover:scale-105 pointer-events-none"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-2 px-2.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-400 font-medium text-center">
                          No product previews
                        </div>
                      )}

                      {/* Category Name below thumbnail row */}
                      <div className="mt-2.5">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#f97316] transition-colors line-clamp-1 leading-snug">
                          {cat.name}
                        </h3>
                        {cat.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Explore Link at the bottom */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#f97316]">
                      <span>Explore</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          3. PRODUCTS — Random Selection from Across All Categories
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Products</h2>
            <p className="text-xs text-slate-500 mt-0.5">Explore our engineering hardware, maker kits &amp; electronics</p>
          </div>
          <Link
            to="/shop/products"
            className="flex items-center gap-1 text-xs font-bold text-[#f97316] hover:text-[#ea580c] transition-colors"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            <p>{error}</p>
          </div>
        ) : randomProducts.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
              {randomProducts.map((p) => (
                <ProductCard key={p.id} product={p} onQuickAdd={onAddToCart} />
              ))}
            </div>

            {/* Explore All Products CTA Button */}
            <div className="text-center pt-2">
              <Link
                to="/shop/products"
                className="btn-shop-primary inline-flex items-center gap-2 text-sm sm:text-base px-8 py-3.5 font-bold shadow-lg shadow-orange-950/20 hover:scale-[1.02] transition-all"
              >
                <span>Explore All Products</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            <p>No products available at the moment.</p>
            <Link to="/shop/products" className="mt-2 inline-block text-[#f97316] font-semibold">
              Browse all products →
            </Link>
          </div>
        )}
      </section>

      {/* =========================================================================
          EMPTY STATE — when no products are in DB yet
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
          CUSTOM 3D PRINTING & PROTOTYPING CTA
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
