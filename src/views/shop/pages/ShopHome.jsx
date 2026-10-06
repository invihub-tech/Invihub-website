import { useState, useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Truck,
  Headphones,
  Box,
  Layers,
  Cpu,
  Wrench,
  Scissors,
  CheckCircle2,
  Flame,
  Star,
  ChevronRight,
} from 'lucide-react'
import { useShopHome } from '../../../hooks/useShopHome'
import ProductCard from '../components/ProductCard'
import FilamentSection from '../components/FilamentSection'

// Reference curated catalogue to guarantee rich experience matching visual reference
const CURATED_ADDITIONS = [
  {
    id: 'curated_fdm_pro',
    name: 'FDM 3D Printer Pro',
    slug: 'fdm-3d-printer-pro',
    brand: 'INVIHUB',
    shortDescription: 'CoreXY high-speed 3D printer with 300°C all-metal hotend and auto-leveling.',
    price: 19999,
    mrp: 24999,
    discount: 20,
    stock: 12,
    inStock: true,
    isFeatured: true,
    isNew: true,
    isBestSeller: true,
    sold: 128,
    category: { name: '3D Printers', slug: '3d-printers' },
    images: [{ url: '/images/service-3d-printing.png', isPrimary: true }],
    specifications: [
      { name: 'Build Volume', value: '250 × 250 × 250 mm' },
      { name: 'Max Speed', value: '500 mm/s' },
    ],
  },
  {
    id: 'curated_pla_plus',
    name: 'PLA+ Filament 1kg',
    slug: 'pla-plus-filament-1kg',
    brand: 'INVIHUB',
    shortDescription: 'High-toughness 1.75mm PLA+ engineered for smooth flow and high layer adhesion.',
    price: 1299,
    mrp: 1599,
    discount: 19,
    stock: 85,
    inStock: true,
    isFeatured: true,
    isNew: true,
    isBestSeller: true,
    sold: 342,
    category: { name: 'Filaments', slug: 'filaments' },
    images: [{ url: '/images/hero-product.png', isPrimary: true }],
    specifications: [
      { name: 'Diameter', value: '1.75mm (±0.02mm)' },
      { name: 'Spool Weight', value: '1kg Net' },
    ],
  },
  {
    id: 'curated_electronics_kit',
    name: 'Electronics Starter Kit for Makers',
    slug: 'electronics-starter-kit',
    brand: 'INVIHUB',
    shortDescription: 'Complete IoT development bundle with ESP32, 24 sensor modules, breadboard & OLED.',
    price: 2499,
    mrp: 2899,
    discount: 14,
    stock: 45,
    inStock: true,
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    sold: 96,
    category: { name: 'Electronics', slug: 'electronics' },
    images: [{ url: '/images/work-electronics.png', isPrimary: true }],
    specifications: [
      { name: 'Core MCU', value: 'ESP32 Wi-Fi + BLE' },
      { name: 'Components', value: '65+ Pieces' },
    ],
  },
  {
    id: 'curated_nozzle_set',
    name: 'Hardened Steel Nozzle Set (5 Pcs)',
    slug: 'nozzle-set-5pcs',
    brand: 'INVIHUB',
    shortDescription: 'Abrasion-resistant nozzles (0.2 / 0.4 / 0.6 / 0.8mm) suitable for carbon fiber filaments.',
    price: 799,
    mrp: 999,
    discount: 20,
    stock: 60,
    inStock: true,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    sold: 74,
    category: { name: 'Components', slug: 'components' },
    images: [{ url: '/images/service-design.png', isPrimary: true }],
    specifications: [
      { name: 'Material', value: 'Hardened Tool Steel' },
      { name: 'Thread', value: 'M6 Standard' },
    ],
  },
  {
    id: 'curated_pei_plate',
    name: 'Textured PEI Spring Steel Build Plate',
    slug: 'pei-build-plate',
    brand: 'INVIHUB',
    shortDescription: 'Double-sided textured PEI sheet with magnetic base for effortless print release.',
    price: 1199,
    mrp: 1499,
    discount: 20,
    stock: 30,
    inStock: true,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    sold: 61,
    category: { name: 'Accessories', slug: 'accessories' },
    images: [{ url: '/images/work-manufacturing.png', isPrimary: true }],
    specifications: [
      { name: 'Size', value: '235 × 235 mm' },
      { name: 'Surface', value: 'Gold Textured PEI' },
    ],
  },
  {
    id: 'curated_petg_spool',
    name: 'PETG Filament 1kg (High Strength)',
    slug: 'petg-filament-1kg',
    brand: 'INVIHUB',
    shortDescription: 'Chemical and heat resistant PETG filament for functional outdoor prototypes.',
    price: 1499,
    mrp: 1799,
    discount: 17,
    stock: 40,
    inStock: true,
    isFeatured: false,
    isNew: true,
    isBestSeller: true,
    sold: 189,
    category: { name: 'Filaments', slug: 'filaments' },
    images: [{ url: '/images/hero-product.png', isPrimary: true }],
    specifications: [
      { name: 'Diameter', value: '1.75mm' },
      { name: 'Bed Temp', value: '70–85°C' },
    ],
  },
  {
    id: 'curated_dryer_box',
    name: 'Smart Filament Dehydrator & Feeder',
    slug: 'smart-filament-dryer',
    brand: 'INVIHUB',
    shortDescription: 'Active heating chamber with humidity sensor to dry wet spools while printing.',
    price: 3499,
    mrp: 4299,
    discount: 19,
    stock: 18,
    inStock: true,
    isFeatured: false,
    isNew: true,
    isBestSeller: false,
    sold: 42,
    category: { name: 'Tools', slug: 'tools' },
    images: [{ url: '/images/service-automation.png', isPrimary: true }],
    specifications: [
      { name: 'Heating', value: 'Up to 70°C' },
      { name: 'Timer', value: '1–24 Hours' },
    ],
  },
  {
    id: 'curated_precision_pliers',
    name: 'Precision Flush Wire Cutters',
    slug: 'precision-flush-cutters',
    brand: 'INVIHUB',
    shortDescription: 'Ultra-sharp carbon steel diagonal flush cutters for clean support removal.',
    price: 299,
    mrp: 399,
    discount: 25,
    stock: 90,
    inStock: true,
    isFeatured: false,
    isNew: false,
    isBestSeller: true,
    sold: 210,
    category: { name: 'Tools', slug: 'tools' },
    images: [{ url: '/images/work-product.png', isPrimary: true }],
    specifications: [
      { name: 'Material', value: 'Carbon Steel' },
      { name: 'Grip', value: 'Rubberized Anti-Slip' },
    ],
  },
]

// Visual categories for "Shop by Category" section matching reference mockup
const VISUAL_CATEGORIES = [
  {
    name: '3D Printers',
    slug: '3d-printers',
    query: '3D Printer',
    image: '/images/service-3d-printing.png',
    count: 'CoreXY & FDM',
  },
  {
    name: 'Filaments',
    slug: 'filaments',
    query: 'Filament',
    image: '/images/hero-product.png',
    count: 'PLA, PETG, ABS',
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    query: 'Electronics',
    image: '/images/work-electronics.png',
    count: 'ESP32 & Sensors',
  },
  {
    name: 'Components',
    slug: 'components',
    query: 'Component',
    image: '/images/service-automation.png',
    count: 'Motors & Plates',
  },
  {
    name: 'Tools',
    slug: 'tools',
    query: 'Tools',
    image: '/images/service-design.png',
    count: 'Calipers & Cutters',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    query: 'Accessories',
    image: '/images/work-manufacturing.png',
    count: 'Parts & Upgrades',
  },
]

export default function ShopHome() {
  const { cats, featured, fresh, best, loading } = useShopHome()
  const outletCtx = useOutletContext() || {}
  const [activeTab, setActiveTab] = useState('All')

  // Combine database products with curated showcase to guarantee full Amazon/Flipkart-grade catalog
  const allProducts = useMemo(() => {
    const dbItems = [...(featured || []), ...(fresh || []), ...(best || [])]
    const seen = new Set()
    const unique = []

    for (const item of dbItems) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id)
        unique.push(item)
      }
    }

    for (const item of CURATED_ADDITIONS) {
      if (!seen.has(item.id) && !seen.has(item.slug)) {
        seen.add(item.id)
        unique.push(item)
      }
    }

    return unique
  }, [featured, fresh, best])

  // Filtered products for Featured Section tabs
  const filteredProducts = useMemo(() => {
    if (activeTab === 'All') return allProducts.slice(0, 10)
    const term = activeTab.toLowerCase()
    return allProducts.filter(
      (p) =>
        p.category?.name?.toLowerCase().includes(term) ||
        p.name?.toLowerCase().includes(term) ||
        p.tags?.some((t) => t.toLowerCase().includes(term)),
    )
  }, [allProducts, activeTab])

  // New arrivals slice
  const newArrivals = useMemo(() => {
    return allProducts.filter((p) => p.isNew || p.discount >= 20).slice(0, 6)
  }, [allProducts])

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-12">
      {/* =========================================================================
          1. HERO / PROMOTIONAL SPLIT BANNER
          ========================================================================= */}
      <section className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white overflow-hidden shadow-xl border border-slate-800">
        {/* Subtle decorative grid/glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 sm:p-12 lg:p-16">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#f97316] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Engineering & Maker Marketplace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Build Ideas.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] via-orange-400 to-amber-300">
                Shape Tomorrow.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl font-medium leading-relaxed">
              Industrial grade 3D Printers • Tight-tolerance Filaments • Microcontrollers & IoT Sensors • CNC Hardware
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/shop/products"
                className="btn-shop-primary text-sm px-6 py-3 font-bold gap-2 shadow-lg shadow-orange-950/40"
              >
                <span>Shop Catalogue Now</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/shop/products?q=Filament"
                className="btn-shop-outline text-sm px-5 py-3 font-semibold !bg-slate-900/60 !text-white !border-slate-700 hover:!border-orange-500 hover:!text-orange-400"
              >
                Explore Filaments
              </Link>
            </div>

            {/* Quick stats / bullets */}
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

          {/* Right Product Showcase Visual */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Glow backdrop */}
            <div className="absolute w-72 h-72 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-6 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-sm group">
              <img
                src="/images/hero-product.png"
                alt="INVIHUB Engineering Collection"
                className="w-full h-64 sm:h-72 object-contain mix-blend-lighten transition-transform duration-500 group-hover:scale-105"
              />

              {/* Floating Discount Tag */}
              <div className="absolute bottom-4 right-4 bg-orange-600 text-white p-3 rounded-xl shadow-xl border border-orange-400/30 flex items-center gap-2.5 animate-bounce">
                <Flame size={20} className="fill-white" />
                <div className="text-left leading-tight">
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-90">Special Offer</div>
                  <div className="text-xs font-black">Up to 30% Off Filament Bundles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. FEATURE VALUE PILLARS (Beneath Hero)
          ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#f97316] flex items-center justify-center shrink-0">
            <Box size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Wide Product Range</div>
            <div className="text-[11px] text-slate-500">For Makers & Professionals</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Quality Assured</div>
            <div className="text-[11px] text-slate-500">Tested & Calibrated In-Lab</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Fast & Secure Delivery</div>
            <div className="text-[11px] text-slate-500">Pan India Tracked Shipping</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-2">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Headphones size={20} />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-slate-900">Expert Engineering Support</div>
            <div className="text-[11px] text-slate-500">Help for Slicing & Builds</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SHOP BY CATEGORY
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Shop by Category</h2>
            <p className="text-xs text-slate-500 mt-0.5">Explore our precision hardware and consumable catalogue</p>
          </div>
          <Link
            to="/shop/products"
            className="flex items-center gap-1 text-xs font-bold text-[#f97316] hover:text-[#ea580c] transition-colors"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {VISUAL_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to={`/shop/products?q=${encodeURIComponent(cat.query)}`}
              className="shop-card group p-3.5 text-center flex flex-col items-center justify-between h-44 hover:border-[#f97316]"
            >
              <div className="w-20 h-20 rounded-md bg-slate-50 flex items-center justify-center overflow-hidden p-2 group-hover:scale-105 transition-transform duration-200">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
              <div className="mt-2 w-full">
                <h3 className="font-bold text-xs text-slate-900 group-hover:text-[#f97316] transition-colors line-clamp-1">
                  {cat.name}
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">{cat.count}</span>
                <span className="text-[11px] font-semibold text-[#f97316] mt-1.5 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                  View Products →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          4. FEATURED PRODUCTS (With Department Tabs)
          ========================================================================= */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Featured Products</h2>
            <p className="text-xs text-slate-500 mt-0.5">Top-rated gear selected by our hardware team</p>
          </div>

          {/* Department Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {['All', '3D Printers', 'Filaments', 'Electronics', 'Components', 'Accessories'].map((tab) => (
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

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onQuickAdd={() => {
                if (outletCtx.onOpenCart) outletCtx.onOpenCart()
              }}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. PREMIUM FILAMENT COLLECTION (Dark Sleek Section)
          ========================================================================= */}
      <FilamentSection />

      {/* =========================================================================
          6. NEW ARRIVALS
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">New Arrivals</h2>
              <span className="bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                Fresh Stock
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Newly introduced tools, filaments, and components</p>
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
            <ProductCard
              key={p.id}
              product={p}
              onQuickAdd={() => {
                if (outletCtx.onOpenCart) outletCtx.onOpenCart()
              }}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          7. CUSTOM REQUIREMENT & ENGINEERING CTA
          ========================================================================= */}
      <section className="rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <span className="bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            Custom Manufacturing & Prototyping
          </span>
          <h3 className="text-2xl sm:text-3xl font-black">Need Custom 3D Printing or Circuit Design?</h3>
          <p className="text-xs sm:text-sm text-orange-100">
            Send your CAD files or schematics to our team. We handle rapid prototyping, volume batch production, and industrial enclosure fabrication.
          </p>
        </div>

        <Link
          to="/#contact"
          className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-lg shadow-lg hover:scale-105 transition-all shrink-0"
        >
          Discuss Your Project With Engineers →
        </Link>
      </section>
    </main>
  )
}
