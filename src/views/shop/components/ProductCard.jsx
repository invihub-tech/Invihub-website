import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Check, Star, Thermometer, Layers } from 'lucide-react'
import { api, inr } from '../../../models/api'
import { useWishlist } from '../../../hooks/useWishlist'

const DEFAULT_FILAMENT_COLORS = [
  { name: 'Black', hex: '#111827' },
  { name: 'White', hex: '#f8fafc', border: true },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Orange', hex: '#ea580c' },
]

export default function ProductCard({ product, onQuickAdd }) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [adding, setAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [activeColor, setActiveColor] = useState(0)

  const wishlisted = isWishlisted(product.id)
  const img = product.images?.[0]?.url || ''
  
  // Calculate discount percentage
  const mrp = product.mrp || product.price || 0
  const price = product.price || 0
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : product.discount || 0

  // Detect if product is a filament
  const isFilament =
    product.name?.toLowerCase().includes('filament') ||
    product.name?.toLowerCase().includes('pla') ||
    product.name?.toLowerCase().includes('petg') ||
    product.name?.toLowerCase().includes('abs') ||
    product.tags?.some((t) => ['filament', 'pla', 'petg', 'abs', 'tpu'].includes(t.toLowerCase()))

  // Extract specs line
  let specsLine = ''
  if (isFilament) {
    specsLine = `${DEFAULT_FILAMENT_COLORS[activeColor]?.name || 'Standard'} • 1kg • 1.75mm`
  } else if (product.specifications?.length > 0) {
    specsLine = product.specifications.slice(0, 2).map((s) => `${s.name}: ${s.value}`).join(' • ')
  } else if (product.shortDescription) {
    specsLine = product.shortDescription
  }

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.inStock || adding) return

    setAdding(true)
    try {
      await api.addToCart(product.id, 1)
      window.dispatchEvent(new Event('invi-cart'))
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1800)
      if (onQuickAdd) onQuickAdd(product)
    } catch {
      /* ignore */
    } finally {
      setAdding(false)
    }
  }

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.id)
  }

  return (
    <article className="shop-card group relative flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-slate-300">
      {/* Top Badges & Wishlist */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col gap-1 items-start">
          {discountPercent > 0 && (
            <span className="bg-red-600 text-white font-black text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
          {product.isBestSeller && (
            <span className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shadow-sm">
              Best Seller
            </span>
          )}
          {product.isNew && !product.isBestSeller && (
            <span className="bg-sky-600 text-white font-bold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shadow-sm">
              New
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          className="pointer-events-auto p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} className={wishlisted ? 'fill-red-500 text-red-500' : ''} />
        </button>
      </div>

      {/* Image Container */}
      <Link
        to={`/shop/product/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-slate-50 p-4"
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
            No image available
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category & Brand */}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {product.brand || product.category?.name || 'INVIHUB'}
        </div>

        {/* Title */}
        <Link
          to={`/shop/product/${product.slug}`}
          className="mt-1 font-bold text-sm text-slate-900 line-clamp-2 hover:text-[#f97316] transition-colors"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* Specs Subtitle */}
        {specsLine && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-1">
            {specsLine}
          </p>
        )}

        {/* Filament Specialization (Color swatches & Print temp) */}
        {isFilament && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Color:</span>
              <div className="flex items-center gap-1">
                {DEFAULT_FILAMENT_COLORS.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setActiveColor(idx)
                    }}
                    title={c.name}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      activeColor === idx ? 'scale-125 ring-2 ring-orange-500' : 'hover:scale-110'
                    } ${c.border ? 'border border-slate-300' : ''}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Printing parameters */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded">
              <Thermometer size={11} className="text-orange-500 shrink-0" />
              <span>Nozzle: 190–220°C • Bed: 50–60°C</span>
            </div>
          </div>
        )}

        {/* Rating Stars */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-700">4.8</span>
          <span className="text-[11px] text-slate-400">({product.sold > 0 ? product.sold * 12 + 18 : 34})</span>
        </div>

        {/* Pricing */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-black text-slate-900">{inr(price)}</span>
          {mrp > price && (
            <span className="text-xs text-slate-400 line-through font-normal">{inr(mrp)}</span>
          )}
          {discountPercent > 0 && (
            <span className="text-xs font-bold text-green-600">Save {discountPercent}%</span>
          )}
        </div>

        {/* Stock Status */}
        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <Check size={12} strokeWidth={3} />
          <span>In Stock • Ready to dispatch</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={!product.inStock || adding}
          onClick={handleAddToCart}
          className={`btn-shop-primary mt-4 w-full text-xs py-2.5 gap-2 font-bold ${
            justAdded ? '!bg-emerald-600 hover:!bg-emerald-700' : ''
          }`}
        >
          {justAdded ? (
            <>
              <Check size={14} />
              <span>Added to Cart</span>
            </>
          ) : (
            <>
              <ShoppingCart size={14} />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </article>
  )
}
