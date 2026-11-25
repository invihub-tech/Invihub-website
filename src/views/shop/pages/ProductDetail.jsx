import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgeCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  FileText,
  HelpCircle,
  X,
  Sparkles,
  Info,
  Disc,
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
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedColor, setSelectedColor] = useState(0)
  const [selectedWeight, setSelectedWeight] = useState('1kg')
  const [selectedPartColors, setSelectedPartColors] = useState({})
  const [err, setErr] = useState('')

  // Product-assigned filament variations from inventory
  const [filamentVariations, setFilamentVariations] = useState([])
  const [selectedVariationId, setSelectedVariationId] = useState(null)

  // Accordion open/close state for detail sections & reviews
  const [openSections, setOpenSections] = useState({
    description: true,
    specifications: true,
    printing: true,
    shipping: false,
    faqs: false,
    reviews: true,
  })
  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Reviews state
  const [reviewsData, setReviewsData] = useState({
    summary: { average: 0, totalCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
    reviews: [],
  })
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(5)
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    name: '',
    email: '',
    rating: 5,
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
    setActiveImg(0)
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
        // Load assigned filament variations
        const targetId = d?.product?.id || slug
        api
          .productFilamentVariations(targetId)
          .then((vars) => {
            setFilamentVariations(vars || [])
            if (vars && vars.length > 0) {
              setSelectedVariationId(vars[0].filamentId)
            }
          })
          .catch(() => {})
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
        const cust = c?.customer || c
        if (cust?.email) {
          setReviewForm((f) => ({
            ...f,
            name: f.name || cust.name || '',
            email: f.email || cust.email || '',
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

  const p = data?.product

  // Trust badges dynamically configured from Admin Dashboard
  const activeBadges = useMemo(() => {
    const selected = Array.isArray(p?.trustBadges) ? p.trustBadges : []
    if (selected.length === 0) return []

    const badgeMap = {
      pan_india_shipping: { id: 'pan_india_shipping', label: 'Pan India Shipping', icon: Truck, color: 'text-[#f97316]' },
      'pan india shipping': { id: 'pan_india_shipping', label: 'Pan India Shipping', icon: Truck, color: 'text-[#f97316]' },
      tested_gear: { id: 'tested_gear', label: '100% Tested Gear', icon: ShieldCheck, color: 'text-emerald-600' },
      '100% tested gear': { id: 'tested_gear', label: '100% Tested Gear', icon: ShieldCheck, color: 'text-emerald-600' },
      warranty_1yr: { id: 'warranty_1yr', label: '1 Year Warranty', icon: BadgeCheck, color: 'text-blue-600' },
      '1 year warranty': { id: 'warranty_1yr', label: '1 Year Warranty', icon: BadgeCheck, color: 'text-blue-600' },
      returns_7day: { id: 'returns_7day', label: '7-Day Returns', icon: RotateCcw, color: 'text-purple-600' },
      '7-day returns': { id: 'returns_7day', label: '7-Day Returns', icon: RotateCcw, color: 'text-purple-600' },
    }

    const seen = new Set()
    const result = []
    for (const item of selected) {
      const key = String(item).toLowerCase().trim()
      const def = badgeMap[key]
      if (def && !seen.has(def.id)) {
        seen.add(def.id)
        result.push(def)
      }
    }
    return result
  }, [p?.trustBadges])

  if (pageStatus != null) return <ApiStatusScreen status={pageStatus} onRetry={load} />
  if (!data) {
    return (
      <main className="w-full px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading engineering specifications…</p>
      </main>
    )
  }

  const imgs = p.images || []
  const wishlisted = isWishlisted(p.id)

  const hasFilamentVariations = filamentVariations.length > 0
  const activeVariation = hasFilamentVariations
    ? filamentVariations.find((v) => v.filamentId === selectedVariationId) || filamentVariations[0]
    : null

  const priceAdjustment = activeVariation ? Number(activeVariation.priceAdjustment || 0) : 0
  const basePrice = p.price || 0
  const price = Math.max(0, basePrice + priceAdjustment)
  const baseMrp = p.mrp || p.price || 0
  const mrp = Math.max(price, baseMrp + priceAdjustment)
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : p.discount || 0

  const variationStock = activeVariation ? (activeVariation.filament?.stockSpools ?? 0) : p.stock
  const isItemInStock = hasFilamentVariations
    ? Boolean(activeVariation?.isAvailable) && variationStock > 0
    : p.inStock

  const isFilament = hasFilamentVariations || Boolean(
    p.category?.slug?.toLowerCase().includes('filament') ||
    p.category?.name?.toLowerCase().includes('filament')
  )

  const handleAddToCart = async () => {
    if (!isItemInStock || adding) return
    setAdding(true)
    setErr('')
    try {
      if (activeVariation) {
        try {
          const stored = JSON.parse(localStorage.getItem('invihub_cart_variations') || '{}')
          stored[p.id] = {
            filamentId: activeVariation.filamentId,
            name: activeVariation.filament?.name,
            material: activeVariation.filament?.material,
            colorName: activeVariation.filament?.colorName,
            colorHex: activeVariation.filament?.colorHex,
            diameter: activeVariation.filament?.diameter,
            weightGrams: activeVariation.filament?.weightGrams,
            priceAdjustment: activeVariation.priceAdjustment,
          }
          localStorage.setItem('invihub_cart_variations', JSON.stringify(stored))
        } catch (_) {}
      }
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
    if (!isItemInStock) return
    try {
      if (activeVariation) {
        try {
          const stored = JSON.parse(localStorage.getItem('invihub_cart_variations') || '{}')
          stored[p.id] = {
            filamentId: activeVariation.filamentId,
            name: activeVariation.filament?.name,
            material: activeVariation.filament?.material,
            colorName: activeVariation.filament?.colorName,
            colorHex: activeVariation.filament?.colorHex,
            diameter: activeVariation.filament?.diameter,
            weightGrams: activeVariation.filament?.weightGrams,
            priceAdjustment: activeVariation.priceAdjustment,
          }
          localStorage.setItem('invihub_cart_variations', JSON.stringify(stored))
        } catch (_) {}
      }
      await api.addToCart(p.id, qty)
      window.dispatchEvent(new Event('invi-cart'))
      navigate('/shop/checkout')
    } catch (e) {
      setErr(e.message || 'Could not proceed to checkout')
    }
  }

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-28 self-start">
          {/* Main Hero Image */}
          <div className="relative aspect-square w-full max-h-[480px] sm:max-h-[520px] mx-auto rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden p-6 sm:p-8 flex items-center justify-center select-none group">
            {imgs[activeImg] || imgs[0] ? (
              <img
                src={(imgs[activeImg] || imgs[0]).url}
                alt={(imgs[activeImg] || imgs[0]).alt || p.name}
                loading="eager"
                fetchPriority="high"
                className="w-full h-full max-h-[440px] sm:max-h-[480px] object-contain object-center mix-blend-multiply transition-transform duration-300 pointer-events-none"
              />
            ) : (
              <div className="text-xs font-medium text-slate-400">No Image Available</div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
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
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 shadow-sm transition-colors z-10"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={20} className={wishlisted ? 'fill-red-500 text-red-500' : ''} />
            </button>

            {/* Prev / Next Navigation Arrows */}
            {imgs.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImg((prev) => (prev - 1 + imgs.length) % imgs.length)
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-950 shadow-md border border-slate-200/80 flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#f97316] z-10"
                  aria-label="Previous product image"
                >
                  <ChevronLeft size={18} className="sm:w-5 sm:h-5 -translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImg((prev) => (prev + 1) % imgs.length)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-950 shadow-md border border-slate-200/80 flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#f97316] z-10"
                  aria-label="Next product image"
                >
                  <ChevronRight size={18} className="sm:w-5 sm:h-5 translate-x-0.5" />
                </button>

                {/* Image counter indicator */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/70 backdrop-blur-sm text-white text-[11px] font-semibold tracking-wide select-none pointer-events-none z-10">
                  {((activeImg >= imgs.length ? 0 : activeImg) + 1)} / {imgs.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail list */}
          {imgs.length > 1 && (
            <div className="relative">
              <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 hide-scrollbar scroll-smooth">
                {imgs.map((im, i) => (
                  <button
                    key={im.id || im.url + i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 p-1.5 bg-slate-50 transition-all shrink-0 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#f97316] ${
                      i === activeImg
                        ? 'border-[#f97316] ring-2 ring-orange-200 shadow-sm opacity-100'
                        : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`View product image ${i + 1}`}
                  >
                    <img
                      src={im.url}
                      alt={im.alt || `${p.name} - thumbnail ${i + 1}`}
                      className="w-full h-full object-contain object-center mix-blend-multiply pointer-events-none"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
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
                    document.getElementById('customer-reviews')?.scrollIntoView({ behavior: 'smooth' })
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
                    document.getElementById('customer-reviews')?.scrollIntoView({ behavior: 'smooth' })
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
              Inclusive of all taxes.
            </div>
          </div>

          {/* Filament Variation Selector (Only displayed if product has assigned filament variations) */}
          {hasFilamentVariations && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc size={16} className="text-[#f97316]" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Select Filament Variation
                  </span>
                </div>
                {activeVariation && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isItemInStock
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-red-700 bg-red-50 border-red-200'
                    }`}
                  >
                    {isItemInStock ? `${variationStock} spools in stock` : 'Out of Stock'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {filamentVariations.map((v) => {
                  const fil = v.filament
                  const isSelected = selectedVariationId === v.filamentId
                  const inStock = (fil?.stockSpools ?? 0) > 0 && v.isAvailable
                  return (
                    <button
                      key={v.filamentId}
                      type="button"
                      onClick={() => setSelectedVariationId(v.filamentId)}
                      className={`text-left p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-[#f97316] bg-white ring-2 ring-[#f97316]/20 shadow-sm'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300'
                      } ${!inStock ? 'opacity-60' : ''}`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5 shadow-inner"
                        style={{ backgroundColor: fil?.colorHex || '#000000' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {fil?.colorName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {fil?.material}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{fil?.diameter}mm</span>
                          <span>•</span>
                          <span>
                            {fil?.weightGrams >= 1000 ? `${fil.weightGrams / 1000}kg` : `${fil.weightGrams}g`}
                          </span>
                          {v.priceAdjustment !== 0 && (
                            <span className="font-semibold text-orange-600">
                              ({v.priceAdjustment > 0 ? `+₹${v.priceAdjustment}` : `-₹${Math.abs(v.priceAdjustment)}`})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] mt-1">
                          {inStock ? (
                            <span className="text-emerald-600 font-medium">● Available ({fil?.stockSpools} spools)</span>
                          ) : (
                            <span className="text-red-500 font-medium">● Out of stock</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {activeVariation && (
                <div className="text-[11px] text-slate-600 bg-white/90 p-2.5 rounded-lg border border-orange-100 flex items-center justify-between">
                  <span>
                    Selected: <strong>{activeVariation.filament?.material}</strong> · {activeVariation.filament?.colorName} ({activeVariation.filament?.diameter}mm, {activeVariation.filament?.weightGrams >= 1000 ? `${activeVariation.filament.weightGrams / 1000}kg` : `${activeVariation.filament?.weightGrams}g`})
                  </span>
                  {activeVariation.priceAdjustment !== 0 && (
                    <span className="font-bold text-orange-700">
                      Adjustment: {activeVariation.priceAdjustment > 0 ? `+${inr(activeVariation.priceAdjustment)}` : `-${inr(Math.abs(activeVariation.priceAdjustment))}`}
                    </span>
                  )}
                </div>
              )}
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
              <div className={`flex items-center gap-1.5 text-xs font-bold ${isItemInStock ? 'text-emerald-600' : 'text-red-500'}`}>
                <Check size={14} strokeWidth={3} />
                <span>
                  {isItemInStock
                    ? hasFilamentVariations
                      ? `In Stock (${variationStock} spools)`
                      : 'In Stock'
                    : 'Out of Stock'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                SKU: {activeVariation?.filament?.sku || p.sku}
              </div>
            </div>
          </div>

          {err && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{err}</div>}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={!isItemInStock || adding}
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
              disabled={!isItemInStock}
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

          {/* Trust Guarantees — Only displayed if configured for this product */}
          {activeBadges.length > 0 && (
            <div
              className={`grid gap-3 pt-4 border-t border-slate-100 text-center text-xs text-slate-600 ${
                activeBadges.length === 1
                  ? 'grid-cols-1'
                  : activeBadges.length === 2
                  ? 'grid-cols-2'
                  : activeBadges.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {activeBadges.map((badge) => {
                const IconComponent = badge.icon
                return (
                  <div key={badge.id} className="p-2.5 rounded-lg bg-slate-50 flex flex-col items-center gap-1.5">
                    <IconComponent size={18} className={badge.color} />
                    <span className="font-semibold text-[11px]">{badge.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Detailed Product Information Sections: Description, Specifications, Printing Parameters, Shipping & Delivery, FAQs */}
          <div className="pt-8 border-t border-slate-200 space-y-3">
            {/* 1. Description */}
            <div id="product-description" className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-28">
              <button
                type="button"
                onClick={() => toggleSection('description')}
                className="w-full flex items-center justify-between p-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-expanded={openSections.description}
              >
                <span className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-[#f97316]" />
                  <span>Description</span>
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-500 transition-transform duration-200 ${
                    openSections.description ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openSections.description && (
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
                  <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
                    <p>{p.description || p.shortDescription}</p>

                    {p.features?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <h4 className="font-bold text-slate-900 mb-2 text-xs uppercase tracking-wide">Key Engineering Features:</h4>
                        <ul className="space-y-1.5">
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
                </div>
              )}
            </div>

            {/* 2. Specifications */}
            <div id="product-specifications" className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-28">
              <button
                type="button"
                onClick={() => toggleSection('specifications')}
                className="w-full flex items-center justify-between p-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-expanded={openSections.specifications}
              >
                <span className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-[#f97316]" />
                  <span>Specifications</span>
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-500 transition-transform duration-200 ${
                    openSections.specifications ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openSections.specifications && (
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
                  <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-slate-100">
                        {p.specifications?.map((s) => (
                          <tr key={s.id || s.name} className="hover:bg-slate-50">
                            <td className="p-2.5 sm:p-3 font-semibold text-slate-700 bg-slate-50 w-2/5">{s.name}</td>
                            <td className="p-2.5 sm:p-3 text-slate-600">{s.value}</td>
                          </tr>
                        ))}
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 sm:p-3 font-semibold text-slate-700 bg-slate-50">Brand</td>
                          <td className="p-2.5 sm:p-3 text-slate-600">{p.brand || 'INVIHUB'}</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 sm:p-3 font-semibold text-slate-700 bg-slate-50">Country of Origin</td>
                          <td className="p-2.5 sm:p-3 text-slate-600">India</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Printing Parameters (if isFilament) */}
            {isFilament && (
              <div id="product-printing" className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-28">
                <button
                  type="button"
                  onClick={() => toggleSection('printing')}
                  className="w-full flex items-center justify-between p-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-expanded={openSections.printing}
                >
                  <span className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Thermometer size={16} className="text-[#f97316]" />
                    <span>Printing Parameters</span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-500 transition-transform duration-200 ${
                      openSections.printing ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSections.printing && (
                  <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                          <Thermometer size={15} className="text-[#f97316]" />
                          <span>Extruder Temperature</span>
                        </div>
                        <p className="text-slate-600">190°C – 220°C (Recommended: 210°C)</p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                          <Thermometer size={15} className="text-amber-500" />
                          <span>Bed Temperature</span>
                        </div>
                        <p className="text-slate-600">50°C – 60°C (PEI or Glass plate)</p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                          <Clock size={15} className="text-blue-500" />
                          <span>Printing Speed</span>
                        </div>
                        <p className="text-slate-600">40 – 300 mm/s depending on motion system</p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                          <Layers size={15} className="text-purple-500" />
                          <span>Cooling Fan</span>
                        </div>
                        <p className="text-slate-600">100% after layer 2 for crisp overhangs</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Shipping & Delivery */}
            <div id="product-shipping" className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-28">
              <button
                type="button"
                onClick={() => toggleSection('shipping')}
                className="w-full flex items-center justify-between p-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-expanded={openSections.shipping}
              >
                <span className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck size={16} className="text-[#f97316]" />
                  <span>Shipping & Delivery</span>
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-500 transition-transform duration-200 ${
                    openSections.shipping ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openSections.shipping && (
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
                  <div className="text-xs sm:text-sm text-slate-600 space-y-2.5">
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
                </div>
              )}
            </div>

            {/* 4. FAQs */}
            <div id="product-faqs" className="border border-slate-200 rounded-xl overflow-hidden scroll-mt-28">
              <button
                type="button"
                onClick={() => toggleSection('faqs')}
                className="w-full flex items-center justify-between p-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-expanded={openSections.faqs}
              >
                <span className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle size={16} className="text-[#f97316]" />
                  <span>Frequently Asked Questions</span>
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-500 transition-transform duration-200 ${
                    openSections.faqs ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openSections.faqs && (
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
                  <div className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                      <h5 className="font-bold text-slate-900 mb-1">Is this compatible with Bambu Lab / Creality / Prusa?</h5>
                      <p>Yes, all our 1.75mm filaments fit standard spools and AMS / multi-material systems with standard spools.</p>
                    </div>
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                      <h5 className="font-bold text-slate-900 mb-1">Do you provide GST tax invoices?</h5>
                      <p>Yes, you can enter your business GST number during checkout to claim B2B input tax credit.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Similar Products (Appears after product details & before Customer Reviews) */}
      {data.related?.length > 0 && (
        <section id="similar-products" className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#f97316]">
                Recommendations
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Similar Products
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Based on {p.category?.name || 'materials and engineering category'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.related
              .filter((r) => r.id !== p.id && r.slug !== p.slug)
              .map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
          </div>
        </section>
      )}

      {/* 3. Customer Reviews Section (Bottom of the page after Similar Products) */}
      <section id="customer-reviews" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 scroll-mt-28">
        {/* Section Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#f97316]">
            Verified Feedback
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-0.5">
            <MessageSquare className="text-[#f97316]" size={24} />
            <span>Customer Reviews</span>
            {reviewsData.summary.totalCount > 0 && (
              <span className="text-sm font-bold text-slate-400">
                ({reviewsData.summary.totalCount})
              </span>
            )}
          </h2>
        </div>

        {/* Two Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column — Rating Summary */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-5">
              {/* Overall Score */}
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {reviewsData.summary.average > 0 ? reviewsData.summary.average.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-base sm:text-lg text-slate-400 font-bold">out of 5</span>
                </div>

                <div className="flex items-center text-amber-400 gap-1 my-1">
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
                  {reviewsData.summary.totalCount > 0
                    ? `Based on ${reviewsData.summary.totalCount} global rating${reviewsData.summary.totalCount === 1 ? '' : 's'} and reviews`
                    : 'No ratings yet'}
                </p>
              </div>

              {/* Rating Distribution Bars (5, 4, 3, 2, 1 stars) */}
              <div className="space-y-2.5 pt-4 border-t border-slate-200">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviewsData.summary.distribution?.[stars] || 0
                  const pct = reviewsData.summary.percentages?.[stars] || 0
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-14 font-bold text-slate-700 flex items-center gap-1 shrink-0">
                        {stars} star
                      </span>
                      <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-slate-600 font-mono text-[11px] font-semibold shrink-0">
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Write a review action */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewFeedback(null)
                    setShowWriteReviewModal(true)
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-xs text-center cursor-pointer"
                >
                  Write a review
                </button>
              </div>
            </div>
          </div>

          {/* Right Column — Customer Reviews List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                {reviewsData.reviews?.length > 0
                  ? `Showing ${Math.min(visibleReviewsCount, reviewsData.reviews.length)} of ${reviewsData.reviews.length} Reviews`
                  : 'Customer Feedback'}
              </h3>
            </div>

            {/* Empty State */}
            {(!reviewsData.reviews || reviewsData.reviews.length === 0) && (
              <div className="p-8 sm:p-12 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-[#f97316] flex items-center justify-center mx-auto mb-2">
                  <Star size={24} className="fill-orange-500 text-orange-500" />
                </div>
                <h4 className="text-base font-bold text-slate-900">No reviews yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Be the first to review this product and help fellow makers and engineers make informed printing decisions.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewFeedback(null)
                      setShowWriteReviewModal(true)
                    }}
                    className="btn-shop-primary text-xs py-2 px-4 font-bold"
                  >
                    Be the first to review
                  </button>
                </div>
              </div>
            )}

            {/* Approved Reviews List */}
            {reviewsData.reviews?.length > 0 && (
              <div className="divide-y divide-slate-100 space-y-6">
                {reviewsData.reviews.slice(0, visibleReviewsCount).map((r) => (
                  <div key={r.id} className="pt-6 first:pt-0 space-y-2.5">
                    {/* User Profile & Verified Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center ring-2 ring-white shadow-xs">
                          {(r.customerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">
                              {r.customerName || 'Customer'}
                            </span>
                          </div>
                          {r.verifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 mt-0.5">
                              <BadgeCheck size={11} className="text-emerald-600" />
                              <span>Verified Purchase</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>

                    {/* Star Rating & Review Title */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-400 gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={13}
                            className={
                              star <= (Number(r.rating) || 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 fill-slate-100'
                            }
                          />
                        ))}
                      </div>
                      {r.title && (
                        <h4 className="font-bold text-xs text-slate-900">{r.title}</h4>
                      )}
                    </div>

                    {/* Comment text */}
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
                      {r.comment}
                    </p>
                  </div>
                ))}

                {/* Load More Reviews Control */}
                {visibleReviewsCount < reviewsData.reviews.length && (
                  <div className="pt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleReviewsCount((prev) => prev + 5)}
                      className="py-2.5 px-6 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-xs"
                    >
                      Load More Reviews ({reviewsData.reviews.length - visibleReviewsCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Write a Review Modal */}
      {showWriteReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#f97316]" />
                  <span>Write a Customer Review</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share your experience with {p.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWriteReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close review modal"
              >
                <X size={18} />
              </button>
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
                  Overall Rating <span className="text-red-500">*</span>
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
                          className="p-1 rounded hover:scale-125 transition-transform cursor-pointer"
                          title={`${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={24}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
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
                    Email Address <span className="text-red-500">*</span>
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
                    Kept private; used to confirm verified purchases.
                  </span>
                </div>
              </div>

              {/* Written Review */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Written Review / Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={3}
                  placeholder="Describe product quality, print results, dimensional accuracy, or your experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWriteReviewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="btn-shop-primary text-xs py-2 px-5 font-bold disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
