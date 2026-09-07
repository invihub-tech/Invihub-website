import { Link } from 'react-router-dom'
import { api, inr } from '../../../models/api'
import { Stars } from '../../ui/Stars'

export default function ProductCard({ product }) {
  const img = product.images?.[0]?.url
  const add = async (e) => {
    e.preventDefault()
    await api.addToCart(product.id, 1)
    window.dispatchEvent(new Event('invi-cart'))
  }
  const badge = product.isBestSeller ? 'Best Seller' : product.isNew ? 'New' : product.isFeatured ? 'Featured' : null
  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-white/12 bg-[#0c0c0c]">
      <Link to={`/shop/product/${product.slug}`} className="relative aspect-[4/3] overflow-hidden">
        {img ? (
          <img src={img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#111] text-xs text-white/30">No image</div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-[#c5a059] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            {badge}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] uppercase tracking-wider text-white/40">{product.category?.name}</div>
        <h3 className="mt-1 font-serif text-xl text-white">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-white/50">{product.shortDescription}</p>
        <div className="mt-3 font-semibold text-[#c5a059]">{inr(product.price)}</div>
        <div className="mt-1">
          <Stars />
        </div>
        <button type="button" disabled={!product.inStock} onClick={add} className="btn-gold-outline mt-4 h-10 w-full text-[10px] disabled:opacity-40">
          Add to Cart
        </button>
      </div>
    </article>
  )
}
