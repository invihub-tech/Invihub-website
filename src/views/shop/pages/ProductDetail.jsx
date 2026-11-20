import { useEffect, useState } from 'react'
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
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
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

function getColorHex(colorName = '') {
  const c = String(colorName || '').toLowerCase()
  if (c.includes('black')) return '#111827'
  if (c.includes('white')) return '#f8fafc'
  if (c.includes('orange')) return '#ea580c'
  if (c.includes('blue')) return '#2563eb'
  if (c.includes('red')) return '#dc2626'
  if (c.includes('green')) return '#16a34a'
  if (c.includes('grey') || c.includes('gray')) return '#64748b'
  if (c.includes('yellow')) return '#eab308'
  if (c.includes('purple')) return '#9333ea'
  if (c.includes('gold')) return '#d97706'
  return '#cbd5e1'
}

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
  const [selectedPartColors, setSelectedPartColors] = useState({})
  const [err, setErr] = useState('')

  // Reviews state
  const [reviewsData, setReviewsData] = useState({
    summary: { average: 0, totalCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
    reviews: [],
  })
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    name: '',
    email: '',
    rating: 5,
    title: '',
    comment: '',
  })
  const [reviewHoverRating, setReviewHoverRating] = useState(0)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewFeedback, setReviewFeedback] = useState(null)

  const loadReviews = (targetSlug = slug) => {
    if (!targetSlug) return
    setReviewsLoading(true)
    api
      .productReviews(targetSlug)
      .then((res) => {
        if (res?.ok) {
          setReviewsData(res)
          // If customer already submitted review with their email, prefill it
          if (reviewForm.email) {
            const myReview = (res.reviews || []).find(
              (r) => r.customerEmail?.toLowerCase() === reviewForm.email.toLowerCase()
            )
            if (myReview) {
              setReviewForm((f) => ({
                ...f,
                name: myReview.customerName || f.name,
                rating: myReview.rating || f.rating,
                title: myReview.title || '',
                comment: myReview.comment || '',
              }))
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false))
  }

  const load = () => {
    setData(null)
    setPageStatus(null)
    api
      .product(slug)
      .then((d) => {
        setData(d)
        setPageStatus(null)
        if (d?.product?.parts?.length) {
          const init = {}
          d.product.parts.forEach((part) => {
            init[part.name] = part.allowedColors?.[0] || 'Black'
          })
          setSelectedPartColors(init)
        }
      })
      .catch((e) => setPageStatus(e.status ?? 500))
  }

  useEffect(() => {
    load()
    loadReviews(slug)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  // Prefill customer profile into review form if logged in
  useEffect(() => {
    api
      .customerMe()
      .then((c) => {
        if (c?.email) {
          setReviewForm((f) => ({
            ...f,
            name: f.name || c.name || '',
            email: f.email || c.email || '',
          }))
        }
      })
      .catch(() => {})
  }, [])

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    setReviewSubmitting(true)
    setReviewFeedback(null)
    try {
      const res = await api.submitProductReview(slug, {
        customerName: reviewForm.name.trim(),
        customerEmail: reviewForm.email.trim(),
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        comment: reviewForm.comment.trim(),
      })
      setReviewFeedback({
        type: 'success',
        message: res.message || 'Review submitted successfully!',
      })
      loadReviews(slug)
      load()
    } catch (ex) {
      setReviewFeedback({
        type: 'error',
        message: ex.message || 'Failed to submit review',
      })
    } finally {
      setReviewSubmitting(false)
    }
  }

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
    {
      id: 'reviews',
      label:
        reviewsData.summary.totalCount > 0
          ? `Customer Reviews (${reviewsData.summary.totalCount})`
          : 'Customer Reviews',
    },
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
            {reviewsData.summary.totalCount > 0 ? (
              <>
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={15}
                      className={
                        star <= Math.round(reviewsData.summary.average || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 fill-slate-100'
                      }
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {reviewsData.summary.average.toFixed(1)} out of 5
                </span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setTab('reviews')
                    document.getElementById('reviews-tab-section')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="text-xs text-[#f97316] hover:underline cursor-pointer font-medium"
                >
                  {reviewsData.summary.totalCount}{' '}
                  {reviewsData.summary.totalCount === 1 ? 'verified review' : 'verified reviews'}
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-400 font-medium">No reviews yet</span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setTab('reviews')
                    document.getElementById('reviews-tab-section')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="text-xs text-[#f97316] hover:underline cursor-pointer font-medium"
                >
                  Be the first to review
                </button>
              </>
            )}
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

          {/* Multi-Component Color Selector (for 3D printed / multi-color products) */}
          {p.parts?.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-[#f97316]" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Multi-Color Component Setup
                  </span>
                </div>
                <span className="text-[10px] font-bold text-orange-700 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                  Custom Colors Per Part
                </span>
              </div>
              <p className="text-[12px] text-slate-600 leading-snug">
                This product is manufactured with distinct parts. Select your preferred color for each component:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {p.parts.map((part) => {
                  const currentColor = selectedPartColors[part.name] || part.allowedColors?.[0] || 'Black'
                  const colorHex = getColorHex(currentColor)
                  return (
                    <div
                      key={part.id || part.name}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1.5 transition-all hover:border-orange-300"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{part.name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-slate-300 shadow-inner"
                            style={{ backgroundColor: colorHex }}
                          />
                          <span className="font-semibold text-slate-700">{currentColor}</span>
                        </div>
                      </div>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:bg-white focus:outline-none"
                        value={currentColor}
                        onChange={(e) =>
                          setSelectedPartColors((prev) => ({
                            ...prev,
                            [part.name]: e.target.value,
                          }))
                        }
                      >
                        {(part.allowedColors || ['Black', 'White', 'Orange', 'Blue']).map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Color Summary Bar */}
              <div className="pt-2 border-t border-orange-200/60 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-bold text-slate-700">Configuration:</span>
                {Object.entries(selectedPartColors).map(([partName, col]) => (
                  <span
                    key={partName}
                    className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium"
                  >
                    <span
                      className="w-2 h-2 rounded-full border border-slate-300"
                      style={{ backgroundColor: getColorHex(col) }}
                    />
                    <span>{partName}:</span>
                    <strong className="text-orange-600">{col}</strong>
                  </span>
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

          {/* Customization CTA */}
          {p.allowCustomization && (
            <Link
              to={`/shop/customize?product=${p.slug}${
                Object.keys(selectedPartColors).length > 0
                  ? `&parts=${encodeURIComponent(JSON.stringify(selectedPartColors))}`
                  : ''
              }`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-400/40 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700 hover:border-orange-500 hover:bg-orange-100 transition"
            >
              <Wrench size={15} />
              <span>Customize This Product — Get a Custom Print Quote</span>
            </Link>
          )}

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
          <div id="reviews-tab-section" className="space-y-6 max-w-4xl text-xs sm:text-sm">
            {/* Reviews Summary Header & Rating Distribution */}
            {reviewsData.summary.totalCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Overall Score */}
                <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-6">
                  <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {reviewsData.summary.average.toFixed(1)}
                    <span className="text-xl text-slate-400 font-bold"> / 5</span>
                  </div>
                  <div className="flex items-center text-amber-400 my-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        className={
                          star <= Math.round(reviewsData.summary.average || 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 fill-slate-100'
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Based on {reviewsData.summary.totalCount} verified customer{' '}
                    {reviewsData.summary.totalCount === 1 ? 'review' : 'reviews'}
                  </p>
                </div>

                {/* Rating Distribution Bars */}
                <div className="md:col-span-7 flex flex-col justify-center space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviewsData.summary.distribution?.[stars] || 0
                    const pct = reviewsData.summary.percentages?.[stars] || 0
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-bold text-slate-700 flex items-center gap-1">
                          {stars} <Star size={12} className="fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-slate-400 font-mono text-[11px]">
                          {pct}%
                        </span>
                        <span className="w-8 text-right text-slate-500 text-[11px]">
                          ({count})
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-[#f97316] flex items-center justify-center mx-auto mb-3">
                  <Star size={24} className="fill-orange-500 text-orange-500" />
                </div>
                <h4 className="text-base font-bold text-slate-900">No reviews yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Be the first to review this product and help fellow makers and engineers make informed decisions.
                </p>
              </div>
            )}

            {/* Write a Review Section */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#f97316]" />
                  <span>Write a Customer Review</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your feedback helps other buyers and directly improves INVIHUB engineering standards.
                </p>
              </div>

              {reviewFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    reviewFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {reviewFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                  )}
                  <span>{reviewFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Rating Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Your Overall Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = star <= (reviewHoverRating || reviewForm.rating)
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm((f) => ({ ...f, rating: star }))}
                            onMouseEnter={() => setReviewHoverRating(star)}
                            onMouseLeave={() => setReviewHoverRating(0)}
                            className="p-1 rounded hover:scale-125 transition-transform"
                            title={`${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              size={22}
                              className={
                                isFilled
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 hover:text-amber-300'
                              }
                            />
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 ml-2">
                      {
                        ['', '1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'][
                          reviewHoverRating || reviewForm.rating
                        ]
                      }
                    </span>
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      autoComplete="name"
                      placeholder="e.g. Karthik R."
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="e.g. karthik@example.com"
                      value={reviewForm.email}
                      onChange={(e) => setReviewForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Kept private; not published publicly.
                    </span>
                  </div>
                </div>

                {/* Headline / Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Review Headline <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Excellent print quality and perfect winding"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none"
                  />
                </div>

                {/* Written Review */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Written Review <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    minLength={3}
                    placeholder="Describe printability, surface finish, layer adhesion, durability, or dimensions..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="btn-shop-primary text-xs py-2.5 px-6 font-bold disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting Review…' : 'Submit Review'}
                </button>
              </form>
            </div>

            {/* Approved Reviews List */}
            {reviewsData.reviews?.length > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-200 pb-2">
                  Customer Reviews ({reviewsData.reviews.length})
                </h4>

                <div className="divide-y divide-slate-100 space-y-4">
                  {reviewsData.reviews.map((r) => (
                    <div key={r.id} className="pt-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                            {(r.customerName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{r.customerName}</span>
                            {r.verifiedPurchase && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <BadgeCheck size={11} /> Verified Buyer
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center text-amber-400 gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={
                              star <= r.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 fill-slate-100'
                            }
                          />
                        ))}
                      </div>

                      {r.title && (
                        <h5 className="font-bold text-xs text-slate-900 mt-1">{r.title}</h5>
                      )}

                      <p className="text-slate-600 leading-relaxed text-xs">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
