import { useEffect } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { products } from '../data/products'

export default function ShopPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <section className="min-h-[100svh] bg-black pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pt-12">
      <div className="container-page">
        <div className="label-kicker mb-3">SHOP</div>
        <h1 className="font-serif font-semibold text-[clamp(28px,7vw,56px)] text-white">Engineering Products</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-text-secondary sm:text-base">
          Featured products from INVIHUB. Purchase links open the live storefront or marketplace listing.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 sm:mt-12 sm:gap-6 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="flex flex-col overflow-hidden rounded-card border border-border bg-surface">
              <div className="aspect-[4/3] overflow-hidden bg-black">
                <img alt={product.title} src={product.image} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <h2 className="text-lg font-bold text-white sm:text-xl">{product.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{product.description}</p>
                <a href={product.buyHref} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 w-full">
                  {product.buyLabel}
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
