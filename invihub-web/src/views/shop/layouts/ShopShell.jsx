import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Search, ShoppingCart, User } from 'lucide-react'
import { api } from '../../../models/api'
import { useCartBadge } from '../../../controllers/useCartBadge'

export default function ShopShell() {
  const count = useCartBadge()
  const [q, setQ] = useState('')
  const [cats, setCats] = useState([])
  const [openCats, setOpenCats] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.categories().then(setCats).catch(() => {})
  }, [])

  return (
    <div className="shop-ui min-h-screen bg-black text-white">
      <header className="sticky top-0 z-[1000] border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/shop" className="flex shrink-0 items-center gap-2">
            <img src="/images/logo.png" alt="" className="h-9 w-9 rounded-full bg-white object-contain" />
            <span className="hidden sm:block">
              <span className="block text-sm font-extrabold tracking-wide">INVIHUB</span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-[#c5a059]">Shop</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
            <NavLink to="/shop" end className={({ isActive }) => (isActive ? 'text-white' : 'hover:text-white')}>
              Shop
            </NavLink>
            <div className="relative">
              <button type="button" className="hover:text-white" onClick={() => setOpenCats((v) => !v)}>
                Categories
              </button>
              {openCats && (
                <div className="absolute left-0 top-full z-20 mt-2 min-w-48 rounded-md border border-white/10 bg-black py-2">
                  <NavLink to="/shop/products" className="block px-4 py-2 text-white/70 hover:text-white" onClick={() => setOpenCats(false)}>
                    All products
                  </NavLink>
              {cats.filter((c) => c.name?.trim()).map((c) => (
                    <NavLink
                      key={c.slug}
                      to={`/shop/category/${c.slug}`}
                      className="block px-4 py-2 text-white/70 hover:text-white"
                      onClick={() => setOpenCats(false)}
                    >
                      {c.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
            <Link to="/#about" className="hover:text-white">
              About INVIHUB
            </Link>
          </nav>
          <form
            className="ml-auto flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-white/15 px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/shop/products?q=${encodeURIComponent(q)}`)
            }}
          >
            <Search size={16} className="shrink-0 text-[#c5a059]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
            />
          </form>
          <Link to="/shop/account" className="hidden text-white/70 hover:text-white sm:block" aria-label="Account">
            <User size={18} />
          </Link>
          <Link to="/shop/cart" className="relative text-white">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c5a059] px-1 text-[10px] text-black">
                {count}
              </span>
            )}
          </Link>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/40">
        INVIHUB Shop · INTERACT &gt;&gt; INNOVATE &gt;&gt; INSPIRE
      </footer>
    </div>
  )
}
