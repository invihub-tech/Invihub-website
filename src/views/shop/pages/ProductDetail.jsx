import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck, Truck, RotateCcw, BadgeCheck, Heart } from 'lucide-react'
import { api, inr } from '../../../models/api'
import ProductCard from '../components/ProductCard'
import { Stars } from '../../ui/Stars'
import { ApiStatusScreen } from '../../ui/ApiStatusScreen'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [pageStatus, setPageStatus] = useState(null)
  const [qty, setQty] = useState(1)
  const [active, setActive] = useState(0)
  const galleryRef = useRef(null)
  const [tab, setTab] = useState('desc')
  const [err, setErr] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [wished, setWished] = useState(false)

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
    api
      .customerMe()
      .then(async () => {
        setLoggedIn(true)
        const list = await api.wishlist()
        setWished(list.some((w) => w.product?.slug === slug))
      })
      .catch(() => setLoggedIn(false))
  }

  useEffect(() => {
    load()
  }, [slug])

  if (pageStatus != null) return <ApiStatusScreen status={pageStatus} onRetry={load} />
  if (!data) return <main className="px-6 py-20 text-white/50">Loading…</main>
  const p = data.product
  const imgs = p.images || []

  const add = async () => {
    try {
      await api.addToCart(p.id, qty)
      window.dispatchEvent(new Event('invi-cart'))
    } catch (e) {
      setErr(e.message)
    }
  }

  const buy = async () => {
    await add()
    navigate('/shop/checkout')
  }

  const tabs = [
    ['desc', 'Description'],
    ['spec', 'Specifications'],
    ['ship', 'Shipping'],
    ['rev', 'Reviews'],
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="text-xs text-white/40">
        <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / {p.category?.name} / {p.name}
      </div>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          {imgs.length === 0 && (
            <div className="flex aspect-square items-center justify-center rounded-md border border-white/12 bg-[#111] text-sm text-white/35">No image</div>
          )}
          {imgs.length === 1 && (
            <div className="aspect-square overflow-hidden rounded-md border border-white/12">
              <img src={imgs[0].url} alt={p.name} className="h-full w-full object-cover" />
            </div>
          )}
          {imgs.length > 1 && (
            <div
              ref={galleryRef}
              className="flex snap-x snap-mandatory overflow-x-auto rounded-md border border-white/12"
              onScroll={(e) => {
                const el = e.currentTarget
                const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
                if (i !== active) setActive(Math.min(imgs.length - 1, Math.max(0, i)))
              }}
            >
              {imgs.map((im) => (
                <div key={im.url} className="aspect-square w-full min-w-full shrink-0 snap-center">
                  <img src={im.url} alt={p.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
          {imgs.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {imgs.map((im, i) => (
                <button
                  key={im.url + i}
                  type="button"
                  onClick={() => {
                    setActive(i)
                    const el = galleryRef.current
                    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
                  }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${i === active ? 'border-[#c5a059]' : 'border-white/15'}`}
                >
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="font-serif text-4xl">{p.name}</h1>
          <div className="mt-2 text-sm text-white/45">{p.shortDescription}</div>
          <div className="mt-3">
            <Stars />
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="text-3xl text-[#c5a059]">{inr(p.price)}</div>
            {p.mrp > p.price && <div className="pb-1 text-sm text-white/40 line-through">{inr(p.mrp)}</div>}
          </div>
          <div className="mt-2 text-xs text-white/40">SKU: {p.sku}</div>
          <div className={`mt-2 flex items-center gap-2 text-sm ${p.inStock ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`h-2 w-2 rounded-full ${p.inStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {p.inStock ? 'In Stock' : 'Out of Stock'}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button type="button" className="h-10 w-10 rounded-md border border-white/20" onClick={() => setQty((n) => Math.max(1, n - 1))}>
              -
            </button>
            <span>{qty}</span>
            <button type="button" className="h-10 w-10 rounded-md border border-white/20" onClick={() => setQty((n) => n + 1)}>
              +
            </button>
          </div>
          {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-gold" onClick={add} disabled={!p.inStock}>
              Add to Cart
            </button>
            <button type="button" className="btn-gold-outline" onClick={buy} disabled={!p.inStock}>
              Buy Now
            </button>
            {loggedIn && (
              <button
                type="button"
                className="btn-outline-white"
                onClick={async () => {
                  if (wished) {
                    await api.wishlistRemove(p.id)
                    setWished(false)
                  } else {
                    await api.wishlistAdd(p.id)
                    setWished(true)
                  }
                }}
              >
                <Heart size={16} fill={wished ? '#c5a059' : 'none'} className={wished ? 'text-[#c5a059]' : ''} />
                {wished ? 'Saved' : 'Wishlist'}
              </button>
            )}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-white/55 sm:grid-cols-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <ShieldCheck size={18} className="text-[#c5a059]" /> Secure Payment
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Truck size={18} className="text-[#c5a059]" /> Pan India Delivery
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <BadgeCheck size={18} className="text-[#c5a059]" /> 1 Year Warranty
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <RotateCcw size={18} className="text-[#c5a059]" /> Easy Returns
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex gap-6 overflow-x-auto border-b border-white/10 text-sm">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={tab === k ? 'border-b-2 border-[#c5a059] pb-2 text-white' : 'pb-2 text-white/50'} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'desc' && (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="leading-relaxed text-white/60">{p.description}</p>
              {p.features?.length > 0 && (
                <ul className="mt-4 space-y-2 text-white/70">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-[#c5a059]">✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {imgs[1] && <img src={imgs[1].url} alt="" className="rounded-md border border-white/10 object-cover" />}
          </div>
        )}
        {tab === 'spec' && (
          <table className="mt-6 w-full max-w-xl text-sm">
            <tbody>
              {p.specifications.map((s) => (
                <tr key={s.id} className="border-b border-white/10">
                  <td className="py-2 text-white/50">{s.name}</td>
                  <td className="py-2">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'ship' && <p className="mt-6 max-w-xl text-white/60">Delivery available across India. Estimated delivery: 5–10 working days.</p>}
        {tab === 'rev' && <p className="mt-6 text-white/50">Customer reviews will appear here after verified purchases.</p>}
      </div>

      {data.related?.length > 0 && (
        <div className="mt-16">
          <h2 className="font-serif text-3xl">You may also like</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {data.related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
