import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, inr } from '../../../models/api'
import { User, Package, MapPin, Heart, Search, LogOut, ArrowRight, ShieldCheck } from 'lucide-react'

export default function AccountPage() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('orders')
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
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

  const lookup = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      setGuestOrders(await api.lookupOrders(email, orderNumber))
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

  if (me === null) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Loading account details…</p>
      </main>
    )
  }

  if (me === false) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#f97316] flex items-center justify-center">
            <User size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Portal</h1>
            <p className="mt-1 text-xs text-slate-500">
              Sign in to manage your addresses and view your order history, or quickly track an existing guest order.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/shop/checkout" className="btn-shop-primary text-xs py-2.5 px-5">
              Sign In / Register
            </Link>
          </div>

          {/* Guest Order Lookup Form */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Search size={15} className="text-[#f97316]" />
              <span>Track Guest Order</span>
            </h2>
            <p className="text-xs text-slate-500">
              Enter the email address used during checkout along with your Order Reference ID.
            </p>

            <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Checkout Email"
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
              />
              <input
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Order Number (e.g. INV-1001)"
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={busy}
                className="btn-shop-outline text-xs py-2.5 px-4 font-bold shrink-0"
              >
                {busy ? 'Searching…' : 'Find Order'}
              </button>
            </form>

            {err && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{err}</div>}

            {guestOrders && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900">{guestOrders.orderNumber}</span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Status: <strong className="text-orange-600">{guestOrders.orderStatus}</strong> • Total: {inr(guestOrders.total)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/shop/account/orders/${encodeURIComponent(guestOrders.orderNumber)}?email=${encodeURIComponent(email)}`,
                    )
                  }
                  className="btn-shop-primary text-xs py-1.5 px-3"
                >
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Account Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-[#f97316] font-extrabold flex items-center justify-center text-lg">
            {me.customer?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{me.customer?.name || 'Customer Account'}</h1>
            <p className="text-xs text-slate-500">{me.customer?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await api.customerLogout()
            setMe(false)
          }}
          className="btn-shop-outline text-xs py-2 px-3 gap-1.5 text-slate-600"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-4 border-b border-slate-100 pb-3">
          {[
            { id: 'orders', label: 'My Orders', icon: Package },
            { id: 'profile', label: 'Profile Info', icon: User },
            { id: 'addresses', label: 'Addresses', icon: MapPin },
            { id: 'wishlist', label: 'Wishlist', icon: Heart },
          ].map((item) => {
            const Icon = item.icon
            const isActive = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 text-xs font-bold pb-2 transition-all ${
                  isActive
                    ? 'border-b-2 border-[#f97316] text-[#f97316]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab 1: Orders */}
        {tab === 'orders' && (
          <div className="pt-4 space-y-3">
            {me.orders?.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                You have not placed any orders yet.
              </div>
            ) : (
              me.orders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <Link
                      to={`/shop/account/orders/${encodeURIComponent(o.orderNumber)}?email=${encodeURIComponent(
                        me.customer.email,
                      )}`}
                      className="font-bold text-sm text-slate-900 hover:text-[#f97316] transition-colors"
                    >
                      {o.orderNumber}
                    </Link>
                    <div className="text-xs text-slate-500 mt-1">
                      Status: <strong className="text-emerald-700">{o.orderStatus}</strong> • Payment:{' '}
                      <strong>{o.paymentStatus}</strong> • Total: <strong className="text-slate-900">{inr(o.total)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => reorder(o)}
                      className="btn-shop-outline text-xs py-1.5 px-3"
                    >
                      Reorder Items
                    </button>
                    <Link
                      to={`/shop/account/orders/${encodeURIComponent(o.orderNumber)}?email=${encodeURIComponent(
                        me.customer.email,
                      )}`}
                      className="btn-shop-primary text-xs py-1.5 px-3"
                    >
                      View Receipt
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Profile */}
        {tab === 'profile' && (
          <form
            className="pt-4 max-w-md space-y-3.5"
            onSubmit={async (e) => {
              e.preventDefault()
              await api.customerUpdate(profile)
              loadMe()
            }}
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <button className="btn-shop-primary text-xs py-2 px-5 font-bold" type="submit">
              Save Profile
            </button>
          </form>
        )}

        {/* Tab 3: Addresses */}
        {tab === 'addresses' && (
          <div className="pt-4 space-y-4">
            <div className="space-y-2">
              {me.addresses?.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">
                      {a.line1}, {a.city} - {a.pinCode}
                    </span>
                    {a.isDefault && (
                      <span className="ml-2 bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 font-semibold"
                    onClick={() => api.customerDeleteAddress(a.id).then(loadMe)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <form
              className="pt-4 border-t border-slate-100 grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault()
                await api.customerAddAddress(addr)
                setAddr({ line1: '', line2: '', city: '', state: '', pinCode: '', isDefault: true })
                loadMe()
              }}
            >
              <div className="sm:col-span-2">
                <span className="text-xs font-bold text-slate-800 block mb-1">Add New Delivery Address</span>
              </div>
              {['line1', 'line2', 'city', 'state', 'pinCode'].map((k) => (
                <input
                  key={k}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-orange-500"
                  placeholder={k === 'line1' ? 'Address Line 1' : k === 'line2' ? 'Line 2 (Optional)' : k.toUpperCase()}
                  required={k !== 'line2'}
                  value={addr[k]}
                  onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))}
                />
              ))}
              <div className="sm:col-span-2">
                <button className="btn-shop-primary text-xs py-2 px-5 font-bold" type="submit">
                  Save Address
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Wishlist */}
        {tab === 'wishlist' && (
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wish.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 sm:col-span-2">
                Your wishlist is currently empty.
              </div>
            ) : (
              wish.map((w) => (
                <div
                  key={w.id}
                  className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <Link
                    to={`/shop/product/${w.product?.slug}`}
                    className="font-bold text-slate-900 hover:text-[#f97316] line-clamp-1"
                  >
                    {w.product?.name}
                  </Link>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 font-semibold shrink-0"
                    onClick={() => api.wishlistRemove(w.product.id).then(() => api.wishlist().then(setWish))}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
