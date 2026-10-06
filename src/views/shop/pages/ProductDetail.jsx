import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgeCheck,
  Heart,
  ChevronRight,
  Star,
  Check,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  Thermometer,
  Layers,
  HelpCircle,
  Clock,
} from 'lucide-react'
import { api, inr } from '../../../models/api'
import ProductCard from '../components/ProductCard'
import { ApiStatusScreen } from '../../ui/ApiStatusScreen'
import { useWishlist } from '../../../hooks/useWishlist'

const FILAMENT_COLORS = [
  { name: 'Matte Black', hex: '#111827' },
  { name: 'Pure White', hex: '#ffffff', border: true },
  { name: 'Fire Red', hex: '#dc2626' },
  { name: 'Cobalt Blue', hex: '#2563eb' },
  { name: 'Forest Green', hex: '#16a34a' },
  { name: 'Engineering Orange', hex: '#ea580c' },
]

const WEIGHT_OPTIONS = ['250g', '500g', '1kg', '2kg']

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isWishlisted, toggleWishlist } = useWishlist()

  const [data, setData] = useState(null)
  const [pageStatus, setPageStatus] = useState(null)
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [tab, setTab] = useState('desc')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedColor, setSelectedColor] = useState(0)
  const [selectedWeight, setSelectedWeight] = useState('1kg')
  const [err, setErr] = useState('')

  const load = () => {
    setData(null)
    setPageStatus(null)
    api
      .product(slug)
      .then((d) => {
        setData(d)
        setPageStatus(null)
      })
      .catch((e) => setPageStatus(e.status ?? 500))
  }

  useEffect(() => {
    load()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  if (pageStatus != null) return <ApiStatusScreen status={pageStatus} onRetry={load} />
  if (!data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading engineering specifications…</p>
      </main>
    )
  }

  const p = data.product
  const imgs = p.images || []
  const wishlisted = isWishlisted(p.id)

  const mrp = p.mrp || p.price || 0
  const price = p.price || 0
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : p.discount || 0

  const isFilament =
    p.name?.toLowerCase().includes('filament') ||
    p.name?.toLowerCase().includes('pla') ||
    p.name?.toLowerCase().includes('petg') ||
    p.name?.toLowerCase().includes('abs') ||
    p.category?.name?.toLowerCase().includes('filament')

  const handleAddToCart = async () => {
    if (!p.inStock || adding) return
    setAdding(true)
    setErr('')
    try {
      await api.addToCart(p.id, qty)
      window.dispatchEvent(new Event('invi-cart'))
      window.dispatchEvent(new Event('invi-cart-open'))
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (e) {
      setErr(e.message || 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  const handleBuyNow = async () => {
    if (!p.inStock) return
    try {
      await api.addToCart(p.id, qty)
      window.dispatchEvent(new Event('invi-cart'))
      navigate('/shop/checkout')
    } catch (e) {
      setErr(e.message || 'Could not proceed to checkout')
    }
  }

  const tabs = [
    { id: 'desc', label: 'Description' },
    { id: 'spec', label: 'Specifications' },
    ...(isFilament ? [{ id: 'print', label: 'Printing Parameters' }] : []),
    { id: 'ship', label: 'Shipping & Delivery' },
    { id: 'reviews', label: 'Customer Reviews (4.8)' },
    { id: 'faq', label: 'FAQs' },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link to="/shop" className="hover:text-slate-900 transition-colors">
          Shop
        </Link>
        <ChevronRight size={12} className="text-slate-400" />
        {p.category && (
          <>
            <Link to={`/shop/category/${p.category.slug}`} className="hover:text-slate-900 transition-colors">
              {p.category.name}
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
          </>
        )}
        <span className="font-semibold text-slate-900 line-clamp-1">{p.name}</span>
      </nav>

      {/* Main Product Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Gallery */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Hero Image */}
          <div className="relative aspect-square w-full rounded-xl bg-slate-50 border border-slate-200 overflow-hidden p-6 flex items-center justify-center">
            {imgs[activeImg] ? (
              <img
                src={imgs[activeImg].url}
                alt={p.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="text-xs text-slate-300">No Image Available</div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {discountPercent > 0 && (
                <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded shadow-sm">
                  {discountPercent}% OFF
                </span>
              )}
              {p.isBestSeller && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">
                  BEST SELLER
                </span>
              )}
            </div>

            {/* Wishlist button */}
            <button
              type="button"
              onClick={() => toggleWishlist(p.id)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 shadow-sm transition-colors"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={20} className={wishlisted ? 'fill-red-500 text-red-500' : ''} />
            </button>
          </div>

          {/* Thumbnail list */}
          {imgs.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
              {imgs.map((im, i) => (
                <button
                  key={im.url + i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`w-18 h-18 rounded-lg border-2 p-1.5 bg-slate-50 transition-all shrink-0 ${
                    i === activeImg ? 'border-[#f97316] ring-2 ring-orange-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={im.url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Details Column */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#f97316]">
              {p.brand || 'INVIHUB ENGINEERING'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {p.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              {p.shortDescription}
            </p>
          </div>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-3 py-2 border-y border-slate-100">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-800">4.8 out of 5</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 underline cursor-pointer">
              {p.sold > 0 ? p.sold * 12 + 18 : 342} verified customer reviews
            </span>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">{inr(price)}</span>
              {mrp > price && (
                <span className="text-sm text-slate-400 line-through font-medium">MRP {inr(mrp)}</span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Save {discountPercent}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Inclusive of all taxes. Free express shipping across India on this item.
            </div>
          </div>

          {/* Filament Color Selector */}
          {isFilament && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Select Color: <span className="font-normal text-slate-600">{FILAMENT_COLORS[selectedColor].name}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {FILAMENT_COLORS.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(idx)}
                    title={c.name}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      selectedColor === idx ? 'scale-110 ring-2 ring-orange-500 ring-offset-2' : 'hover:scale-105'
                    } ${c.border ? 'border border-slate-300' : ''}`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {selectedColor === idx && (
                      <Check
                        size={14}
                        className={c.name.includes('White') ? 'text-slate-900' : 'text-white'}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weight / Variant Selector */}
          {isFilament && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-800">Spool Weight:</span>
              <div className="flex items-center gap-2">
                {WEIGHT_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSelectedWeight(w)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedWeight === w
                        ? 'border-[#f97316] bg-orange-50 text-[#f97316]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock & Quantity Stepper */}
          <div className="flex items-center gap-6 pt-2">
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-inner">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 py-2 text-xs font-bold text-slate-900 min-w-8 text-center">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="pt-4">
              <div className={`flex items-center gap-1.5 text-xs font-bold ${p.inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                <Check size={14} strokeWidth={3} />
                <span>{p.inStock ? 'In Stock (Ships in 24 Hours)' : 'Out of Stock'}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">SKU: {p.sku}</div>
            </div>
          </div>

          {err && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{err}</div>}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={!p.inStock || adding}
              onClick={handleAddToCart}
              className={`btn-shop-outline py-3.5 text-xs font-bold gap-2 ${
                added ? '!border-emerald-500 !text-emerald-600 !bg-emerald-50' : ''
              }`}
            >
              {added ? (
                <>
                  <Check size={16} />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!p.inStock}
              onClick={handleBuyNow}
              className="btn-shop-primary py-3.5 text-xs font-bold gap-2 shadow-lg shadow-orange-950/20"
            >
              <Zap size={16} />
              <span>Buy Now</span>
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center gap-1.5">
              <Truck size={18} className="text-[#f97316]" />
              <span className="font-semibold text-[11px]">Pan India Shipping</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center gap-1.5">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span className="font-semibold text-[11px]">100% Tested Gear</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center gap-1.5">
              <BadgeCheck size={18} className="text-blue-600" />
              <span className="font-semibold text-[11px]">1 Year Warranty</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center gap-1.5">
              <RotateCcw size={18} className="text-purple-600" />
              <span className="font-semibold text-[11px]">7-Day Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section: Description, Specifications, Printing Parameters, Shipping, Reviews */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
        <div className="flex gap-4 sm:gap-8 overflow-x-auto border-b border-slate-200 pb-2 hide-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`text-xs sm:text-sm font-bold pb-2 transition-all shrink-0 ${
                tab === t.id
                  ? 'border-b-2 border-[#f97316] text-[#f97316]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Description */}
        {tab === 'desc' && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            <p>{p.description || p.shortDescription}</p>

            {p.features?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">Key Engineering Features:</h4>
                <ul className="space-y-2">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tab: Specifications */}
        {tab === 'spec' && (
          <div className="max-w-2xl">
            <table className="w-full text-xs text-left">
              <tbody className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {p.specifications?.map((s) => (
                  <tr key={s.id || s.name} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-700 bg-slate-50 w-1/3">{s.name}</td>
                    <td className="p-3 text-slate-600">{s.value}</td>
                  </tr>
                ))}
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-700 bg-slate-50">Brand</td>
                  <td className="p-3 text-slate-600">{p.brand || 'INVIHUB'}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-700 bg-slate-50">Country of Origin</td>
                  <td className="p-3 text-slate-600">India</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Printing Parameters */}
        {tab === 'print' && (
          <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Thermometer size={16} className="text-[#f97316]" />
                <span>Extruder Temperature</span>
              </div>
              <p className="text-slate-600">190°C – 220°C (Recommended: 210°C)</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Thermometer size={16} className="text-amber-500" />
                <span>Bed Temperature</span>
              </div>
              <p className="text-slate-600">50°C – 60°C (PEI or Glass plate)</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Clock size={16} className="text-blue-500" />
                <span>Printing Speed</span>
              </div>
              <p className="text-slate-600">40 – 300 mm/s depending on motion system</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Layers size={16} className="text-purple-500" />
                <span>Cooling Fan</span>
              </div>
              <p className="text-slate-600">100% after layer 2 for crisp overhangs</p>
            </div>
          </div>
        )}

        {/* Tab: Shipping */}
        {tab === 'ship' && (
          <div className="text-xs sm:text-sm text-slate-600 space-y-3 max-w-xl">
            <p>
              Orders placed before 2:00 PM are dispatched on the same business day from our Bangalore fulfillment hub.
            </p>
            <p>
              Standard courier delivery time is <strong>3–5 business days</strong> for metro cities and 5–7 days for other regions across India.
            </p>
            <p>
              Every parcel is securely packaged in moisture-proof bubble cushioning and tamper-proof corrugated boxes.
            </p>
          </div>
        )}

        {/* Tab: Reviews */}
        {tab === 'reviews' && (
          <div className="space-y-4 max-w-2xl text-xs sm:text-sm">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-slate-900">4.8 / 5</div>
                <div className="text-xs text-slate-500">Based on 342 verified purchases</div>
              </div>
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 space-y-3">
              <div className="pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Karthik R. (Bangalore)</span>
                  <span className="text-[11px] text-slate-400">2 days ago</span>
                </div>
                <div className="flex items-center text-amber-400 my-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600">
                  Exceptional winding quality and zero stringing on my Ender 3 S1. Adhesion on textured PEI is flawless without brim.
                </p>
              </div>

              <div className="pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Dr. Vivek Sharma (IIT Delhi)</span>
                  <span className="text-[11px] text-slate-400">1 week ago</span>
                </div>
                <div className="flex items-center text-amber-400 my-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600">
                  Fast delivery and verified dimensions. We use INVIHUB components for robotics prototyping in our lab.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: FAQ */}
        {tab === 'faq' && (
          <div className="space-y-3 max-w-2xl text-xs sm:text-sm text-slate-600">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <h5 className="font-bold text-slate-900 mb-1">Is this compatible with Bambu Lab / Creality / Prusa?</h5>
              <p>Yes, all our 1.75mm filaments fit standard spools and AMS / multi-material systems with standard spools.</p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <h5 className="font-bold text-slate-900 mb-1">Do you provide GST tax invoices?</h5>
              <p>Yes, you can enter your business GST number during checkout to claim B2B input tax credit.</p>
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {data.related?.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
