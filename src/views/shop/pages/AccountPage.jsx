import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, inr } from '../../../models/api'
import { findOrderAccessToken } from '../../../lib/orderAccess'

export default function AccountPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('orders')
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [guestOrders, setGuestOrders] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [addr, setAddr] = useState({ line1: '', line2: '', city: '', state: '', pinCode: '', isDefault: true })
  const [wish, setWish] = useState([])

  const loadMe = () =>
    api.customerMe().then((d) => {
      setMe(d)
      setProfile({ name: d.customer.name, phone: d.customer.phone })
    })

  useEffect(() => {
    loadMe()
      .then(() => api.wishlist().then(setWish).catch(() => {}))
      .catch(() => setMe(false))
  }, [])

  useEffect(() => {
    if (!orderNumber) return
    const stored = findOrderAccessToken(orderNumber)
    if (stored && !accessCode) setAccessCode(stored)
  }, [orderNumber])

  const lookup = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const token = accessCode || findOrderAccessToken(orderNumber)
      if (!token) {
        throw new Error('Order access code is required. Use the link or code from your order confirmation.')
      }
      setGuestOrders(await api.lookupOrders(email, orderNumber, token))
    } catch (ex) {
      setErr(ex.message)
      setGuestOrders(null)
    } finally {
      setBusy(false)
    }
  }

  const reorder = async (order) => {
    for (const item of order.items) {
      await api.addToCart(item.productId, item.quantity)
    }
    window.dispatchEvent(new Event('invi-cart'))
    navigate('/shop/cart')
  }

  if (me === null) return <main className="p-10">Loading…</main>

  if (me === false) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-serif text-4xl">My Account</h1>
        <p className="mt-4 text-white/50">
          Look up a guest order with the checkout email, order number, and access code from your order confirmation (saved on this device after checkout), or log in if you have an account.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/shop/checkout" className="btn-gold w-auto">
            Login / Register
          </Link>
        </div>
        <form onSubmit={lookup} className="mt-10 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Checkout email" className="field-input flex-1" />
            <input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order number" className="field-input flex-1" />
          </div>
          <input
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Order access code"
            className="field-input w-full"
          />
          <button type="submit" className="btn-gold-outline w-auto self-start" disabled={busy}>
            {busy ? 'Looking up…' : 'Find order'}
          </button>
        </form>
        {err && <p className="mt-3 text-red-400">{err}</p>}
        {guestOrders && (
          <ul className="mt-8 space-y-3">
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-white/10 px-4 py-4 text-left hover:border-[#c5a059]/50"
                onClick={() => {
                  const q = new URLSearchParams({ email, access: accessCode || findOrderAccessToken(guestOrders.orderNumber) || '' })
                  navigate(`/shop/account/orders/${encodeURIComponent(guestOrders.orderNumber)}?${q}`)
                }}
              >
                <span>
                  <span className="block font-medium">{guestOrders.orderNumber}</span>
                  <span className="text-sm text-white/45">
                    {guestOrders.orderStatus} · {guestOrders.paymentStatus}
                  </span>
                </span>
                <span className="text-[#c5a059]">{inr(guestOrders.total)}</span>
              </button>
            </li>
          </ul>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">My Account</h1>
          <p className="mt-2 text-white/50">{me.customer.email}</p>
        </div>
        <button
          type="button"
          className="text-sm text-white/45"
          onClick={async () => {
            await api.customerLogout()
            setMe(false)
          }}
        >
          Log out
        </button>
      </div>
      <div className="mt-8 flex gap-4 text-sm">
        {['orders', 'profile', 'addresses', 'wishlist'].map((t) => (
          <button key={t} type="button" className={tab === t ? 'text-[#c5a059]' : 'text-white/45'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <ul className="mt-8 space-y-3">
          {me.orders.length === 0 && <li className="text-white/45">No orders yet.</li>}
          {me.orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 px-4 py-4">
              <div>
                <Link to={`/shop/account/orders/${encodeURIComponent(o.orderNumber)}?email=${encodeURIComponent(me.customer.email)}`} className="font-medium text-[#c5a059]">
                  {o.orderNumber}
                </Link>
                <div className="text-sm text-white/45">
                  {o.orderStatus} · {o.paymentStatus} · {inr(o.total)}
                </div>
              </div>
              <button type="button" className="text-sm text-[#c5a059]" onClick={() => reorder(o)}>
                Reorder
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'profile' && (
        <form
          className="mt-8 max-w-md space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            await api.customerUpdate(profile)
            loadMe()
          }}
        >
          <input className="field-input" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
          <input className="field-input" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          <button className="btn-gold w-auto" type="submit">
            Save profile
          </button>
        </form>
      )}

      {tab === 'addresses' && (
        <div className="mt-8">
          <ul className="space-y-2">
            {me.addresses.map((a) => (
              <li key={a.id} className="flex justify-between rounded-md border border-white/10 px-4 py-3 text-sm">
                <span>
                  {a.line1}, {a.city} {a.pinCode}
                  {a.isDefault ? ' · Default' : ''}
                </span>
                <button type="button" className="text-red-400" onClick={() => api.customerDeleteAddress(a.id).then(loadMe)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-6 grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault()
              await api.customerAddAddress(addr)
              setAddr({ line1: '', line2: '', city: '', state: '', pinCode: '', isDefault: true })
              loadMe()
            }}
          >
            {['line1', 'line2', 'city', 'state', 'pinCode'].map((k) => (
              <input key={k} className="field-input" placeholder={k} required={k !== 'line2'} value={addr[k]} onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))} />
            ))}
            <button className="btn-gold w-auto sm:col-span-2" type="submit">
              Save address
            </button>
          </form>
        </div>
      )}

      {tab === 'wishlist' && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {wish.length === 0 && <li className="text-white/45">Wishlist is empty.</li>}
          {wish.map((w) => (
            <li key={w.id} className="rounded-md border border-white/10 p-4">
              <Link to={`/shop/product/${w.product.slug}`}>{w.product.name}</Link>
              <button type="button" className="mt-2 block text-sm text-red-400" onClick={() => api.wishlistRemove(w.product.id).then(() => api.wishlist().then(setWish))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
