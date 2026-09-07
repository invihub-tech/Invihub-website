import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr } from '../../../models/api'

export default function CartPage() {
  const [data, setData] = useState(null)

  const load = () => api.cart().then(setData)
  useEffect(() => {
    load()
  }, [])

  const ping = () => {
    load().then(() => window.dispatchEvent(new Event('invi-cart')))
  }

  if (!data) return <main className="p-10 text-white/50">Loading…</main>

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-4xl">YOUR CART</h1>
      {!data.cart.items.length && (
        <p className="mt-6 text-white/50">
          Your cart is empty. <Link to="/shop/products" className="text-[#c5a059]">Continue shopping</Link>
        </p>
      )}
      {data.cart.items.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="pb-3">Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.cart.items.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        {item.product.images?.[0]?.url ? (
                          <img src={item.product.images[0].url} alt="" className="h-16 w-16 rounded-md object-cover" />
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-[#111]" />
                        )}
                        <span>{item.product.name}</span>
                      </div>
                    </td>
                    <td>{inr(item.product.price)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button type="button" className="h-8 w-8 rounded-md border border-white/20" onClick={() => api.updateCart(item.id, item.quantity - 1).then(ping)}>
                          -
                        </button>
                        {item.quantity}
                        <button type="button" className="h-8 w-8 rounded-md border border-white/20" onClick={() => api.updateCart(item.id, item.quantity + 1).then(ping)}>
                          +
                        </button>
                      </div>
                    </td>
                    <td>{inr(item.product.price * item.quantity)}</td>
                    <td>
                      <button type="button" className="text-red-400" onClick={() => api.removeCart(item.id).then(ping)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="h-fit rounded-md border border-white/10 p-6 text-sm">
            <h2 className="font-serif text-2xl">Summary</h2>
            <div className="mt-4 space-y-2 text-white/70">
              <div className="flex justify-between"><span>Subtotal</span><span>{inr(data.totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>{inr(data.totals.discount)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{inr(data.totals.shipping)}</span></div>
              <div className="flex justify-between"><span>Tax (GST)</span><span>{inr(data.totals.tax)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-white"><span>Total</span><span>{inr(data.totals.total)}</span></div>
            </div>
            <Link to="/shop/products" className="btn-outline-white mt-4 w-full">
              Continue Shopping
            </Link>
            <Link to="/shop/checkout" className="btn-gold mt-3 w-full">
              Proceed to Checkout →
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
