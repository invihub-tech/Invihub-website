import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Heart, ChevronDown, Sparkles, X, Clock, Flame } from 'lucide-react'
import { useCartBadge } from '../../../hooks/useCartBadge'
import { useWishlist } from '../../../hooks/useWishlist'
import { api } from '../../../models/api'
import { ADMIN_KEY } from '../../../config/adminPath'

const POPULAR_SUGGESTIONS = [
  { text: 'PLA Filament 1kg', category: 'Filaments', hot: true },
  { text: 'PLA+ Black', category: 'Filaments', hot: true },
  { text: 'PLA+ White', category: 'Filaments' },
  { text: 'CoreXY 3D Printer', category: '3D Printers', hot: true },
  { text: 'FDM 3D Printer', category: '3D Printers' },
  { text: 'PETG Filament', category: 'Filaments' },
  { text: 'ESP32 Development Board', category: 'Electronics', hot: true },
  { text: 'Arduino Sensors', category: 'Electronics' },
  { text: 'PEI Build Plate', category: 'Printer Parts' },
  { text: '0.4mm Brass Nozzles', category: 'Printer Parts' },
]

export default function ShopHeader({ onOpenCart }) {
  const count = useCartBadge()
  const { wishlistCount } = useWishlist()
  const [q, setQ] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('all')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const searchContainerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {})
  }, [])

  // Close search suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSubmit = (searchTerm = q) => {
    const term = searchTerm.trim()
    setIsSearchFocused(false)
    if (!term && selectedCat === 'all') {
      navigate('/shop/products')
      return
    }
    const params = new URLSearchParams()
    if (term) params.set('q', term)
    if (selectedCat !== 'all') params.set('category', selectedCat)
    navigate(`/shop/products?${params.toString()}`)
  }

  // Filter suggestion list based on input
  const filteredSuggestions = q.trim()
    ? POPULAR_SUGGESTIONS.filter((s) => s.text.toLowerCase().includes(q.toLowerCase()))
    : POPULAR_SUGGESTIONS.slice(0, 6)

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Logo */}
          <Link to="/shop" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center p-1.5 shadow-md group-hover:scale-105 transition-transform duration-200">
              <img src="/images/logo.png" alt="INVIHUB" className="w-full h-full object-contain filter invert" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">INVIHUB</span>
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">
                  Shop
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block mt-0.5">
                Engineering Lab
              </span>
            </div>
          </Link>

          {/* Central Search Bar with Autosuggest */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSearchSubmit()
              }}
              className="flex items-center rounded-lg border-2 border-slate-200 focus-within:border-[#f97316] transition-colors duration-200 bg-slate-50 focus-within:bg-white overflow-hidden shadow-inner"
            >
              {/* Category selector */}
              <div className="hidden lg:flex items-center px-3 border-r border-slate-200 text-xs text-slate-600 bg-slate-100/70 shrink-0">
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="bg-transparent font-medium py-2.5 outline-none cursor-pointer pr-1"
                >
                  <option value="all">All Departments</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input */}
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search products, filaments, 3D printers, electronics..."
                  className="w-full py-2.5 pl-3.5 pr-8 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search button */}
              <button
                type="submit"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white px-5 py-3 flex items-center justify-center transition-colors shrink-0 shadow-sm"
                aria-label="Search"
              >
                <Search size={18} strokeWidth={2.5} />
              </button>
            </form>

            {/* Autosuggest Dropdown */}
            {isSearchFocused && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-lg shadow-2xl border border-slate-200 z-[1100] overflow-hidden divide-y divide-slate-100">
                {/* Popular searches / Suggestions */}
                <div className="p-3">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>{q.trim() ? 'Matching Searches' : 'Popular Suggestions'}</span>
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {filteredSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQ(item.text)
                          handleSearchSubmit(item.text)
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-orange-50 hover:text-[#f97316] text-xs text-slate-700 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Search size={13} className="text-slate-400 group-hover:text-[#f97316]" />
                          <span className="font-medium">{item.text}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.hot && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                              <Flame size={10} className="fill-amber-500" />
                              Hot
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 group-hover:text-orange-400">
                            in {item.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick department links */}
                <div className="p-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                  <span>Browse by department:</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/shop/products?q=3D+Printer"
                      onClick={() => setIsSearchFocused(false)}
                      className="text-xs text-slate-700 font-semibold hover:text-[#f97316]"
                    >
                      3D Printers
                    </Link>
                    <span>•</span>
                    <Link
                      to="/shop/products?q=Filament"
                      onClick={() => setIsSearchFocused(false)}
                      className="text-xs text-slate-700 font-semibold hover:text-[#f97316]"
                    >
                      Filaments
                    </Link>
                    <span>•</span>
                    <Link
                      to="/shop/products?q=Electronics"
                      onClick={() => setIsSearchFocused(false)}
                      className="text-xs text-slate-700 font-semibold hover:text-[#f97316]"
                    >
                      Electronics
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Actions: Account, Wishlist, Cart */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Account Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 p-1.5 text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                aria-label="Account Menu"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <User size={18} />
                </div>
                <div className="hidden xl:block text-left text-xs leading-tight">
                  <span className="text-slate-400 block text-[10px]">Hello, Sign In</span>
                  <span className="font-bold text-slate-800 flex items-center gap-0.5">
                    Account <ChevronDown size={11} />
                  </span>
                </div>
              </button>

              {accountMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-xl border border-slate-200 z-[1200] py-2 divide-y divide-slate-100"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <div className="px-4 py-2">
                    <p className="text-xs text-slate-500 font-medium">Your Account</p>
                    <Link
                      to="/shop/account"
                      className="mt-1.5 block text-center btn-shop-primary text-xs w-full py-1.5"
                    >
                      Sign In / Register
                    </Link>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/shop/account"
                      className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f97316]"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/shop/account"
                      className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f97316]"
                    >
                      Orders & Tracking
                    </Link>
                  </div>
                  <div className="py-1">
                    <Link
                      to={`/${ADMIN_KEY}/admin`}
                      className="block px-4 py-1.5 text-xs text-slate-400 hover:text-slate-700"
                    >
                      Admin Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link
              to="/shop/account"
              className="relative p-2 text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={22} className={wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={onOpenCart}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              aria-label="Open Shopping Cart"
            >
              <div className="relative">
                <ShoppingCart size={20} />
                {count > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-[#f97316] text-white font-bold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold">Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
