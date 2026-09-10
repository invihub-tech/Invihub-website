import { Link } from 'react-router-dom'
import { CircuitBoard, Cpu, GraduationCap, LayoutGrid, Wrench } from 'lucide-react'
import { useShopHome } from '../../../controllers/useShopHome'
import ProductCard from '../components/ProductCard'

const icons = {
  electronics: CircuitBoard,
  robotics: Cpu,
  'educational-kits': GraduationCap,
  'engineering-products': Wrench,
}

export default function ShopHome() {
  const { cats, featured, fresh, best, loading, error } = useShopHome()

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm uppercase tracking-wider text-[#c5a059]">Shop unavailable</p>
        <h1 className="mt-3 font-serif text-3xl">Cannot load catalogue</h1>
        <p className="mt-4 text-white/55">{error}</p>
        <button type="button" className="btn-gold mt-8 inline-flex w-auto" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    )
  }

  if (loading) {
    return <main className="p-10 text-white/50">Loading…</main>
  }

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-12 pb-14 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link to="/shop/products" className="rounded-md border border-white/10 bg-[#111] px-4 py-5 text-center hover:border-[#c5a059]/50">
            <LayoutGrid className="mx-auto text-[#c5a059]" size={22} />
            <div className="mt-3 text-sm">All Products</div>
          </Link>
          {cats
            .filter((c) => c.name?.trim() && c.slug?.trim())
            .map((c) => {
            const Icon = icons[c.slug] || Wrench
            return (
              <Link key={c.id || c.slug} to={`/shop/category/${c.slug}`} className="rounded-md border border-white/10 bg-[#111] px-4 py-5 text-center hover:border-[#c5a059]/50">
                <Icon className="mx-auto text-[#c5a059]" size={22} />
                <div className="mt-3 text-sm">{c.name}</div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 className="font-serif text-3xl">Featured Products</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {fresh.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <h2 className="font-serif text-3xl">New Products</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {fresh.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 className="font-serif text-3xl">Best Sellers</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {best.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto mb-16 max-w-6xl rounded-md border border-white/12 bg-[#0c0c0c] px-6 py-12 sm:px-10">
        <h2 className="font-serif text-3xl">Have a custom requirement?</h2>
        <p className="mt-3 text-white/50">Talk to the INVIHUB engineering team.</p>
        <Link to="/#contact" className="btn-gold mt-6 inline-flex w-auto">
          Discuss Your Project →
        </Link>
      </section>
    </main>
  )
}
