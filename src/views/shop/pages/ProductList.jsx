import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../../../models/api'
import ProductCard from '../components/ProductCard'
import { ApiStatusScreen } from '../../ui/ApiStatusScreen'
import NotFoundPage from './NotFoundPage'

export default function ProductList({ categoryMode = false }) {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [cats, setCats] = useState([])
  const [items, setItems] = useState([])
  const [cat, setCat] = useState(null)
  const [pageStatus, setPageStatus] = useState(null)
  const [catMissing, setCatMissing] = useState(false)

  const query = useMemo(
    () => ({
      q: params.get('q') || '',
      category: categoryMode ? slug : params.get('category') || '',
      minPrice: params.get('min') || '',
      maxPrice: params.get('max') || '',
      stock: params.get('stock') || '',
      sort: params.get('sort') || 'featured',
    }),
    [params, categoryMode, slug],
  )

  useEffect(() => {
    api.categories().then(setCats).catch(() => {})
  }, [])

  useEffect(() => {
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
    if (categoryMode && slug) {
      api.categories().then((list) => {
        const found = list.find((c) => c.slug === slug) || null
        setCat(found)
        setCatMissing(!found)
      })
    } else {
      setCat(null)
      setCatMissing(false)
    }
  }, [query, categoryMode, slug])

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    if (!v) next.delete(k)
    else next.set(k, v)
    setParams(next)
  }

  if (pageStatus != null && pageStatus !== 404) {
    return <ApiStatusScreen status={pageStatus} onRetry={() => window.location.reload()} />
  }
  if (categoryMode && catMissing) return <NotFoundPage />

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-6 text-sm">
        <h1 className="font-serif text-3xl lg:hidden">{cat ? cat.name : 'Shop'}</h1>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Categories</div>
          {cats.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 py-1 text-white/70">
              <input
                type="checkbox"
                checked={query.category === c.slug}
                onChange={() => {
                  if (categoryMode) {
                    navigate(query.category === c.slug ? '/shop/products' : `/shop/category/${c.slug}`)
                    return
                  }
                  set('category', query.category === c.slug ? '' : c.slug)
                }}
              />
              {c.name}
            </label>
          ))}
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Price</div>
          <input type="range" min="0" max="50000" value={query.maxPrice || 50000} onChange={(e) => set('max', e.target.value)} className="w-full accent-[#c5a059]" />
          <div className="text-white/50">₹0 — ₹{query.maxPrice || 50000}</div>
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Availability</div>
          <label className="flex gap-2 py-1">
            <input type="checkbox" checked={query.stock === 'in'} onChange={() => set('stock', query.stock === 'in' ? '' : 'in')} /> In Stock
          </label>
          <label className="flex gap-2 py-1">
            <input type="checkbox" checked={query.stock === 'out'} onChange={() => set('stock', query.stock === 'out' ? '' : 'out')} /> Out of Stock
          </label>
        </div>
      </aside>
      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="hidden font-serif text-4xl lg:block">{cat ? cat.name : 'SHOP'}</h1>
            {cat && <p className="mt-2 max-w-lg text-white/50">{cat.description}</p>}
            <p className="mt-1 text-sm text-white/40">{items.length} Products</p>
          </div>
          <select value={query.sort} onChange={(e) => set('sort', e.target.value)} className="field-input h-10 w-auto bg-black">
            <option value="featured">Featured</option>
            <option value="price_asc">Price Low → High</option>
            <option value="price_desc">Price High → Low</option>
            <option value="newest">Newest</option>
            <option value="best">Best Selling</option>
          </select>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </main>
  )
}
