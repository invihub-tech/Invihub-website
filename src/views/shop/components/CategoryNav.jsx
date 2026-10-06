import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ChevronDown, Flame, ChevronRight, Box, Tag } from 'lucide-react'

export default function CategoryNav({ dbCategories = [] }) {
  const [megaOpen, setMegaOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMegaOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Only show categories that have a name and slug
  const validCats = (dbCategories || []).filter((c) => c.name?.trim() && c.slug?.trim())

  return (
    <nav className="bg-white border-b border-slate-200 text-xs font-medium text-slate-700 relative z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">

        {/* All Categories Mega Menu */}
        <div ref={menuRef} className="relative py-2.5">
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="flex items-center gap-2 font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-md transition-colors"
          >
            <Menu size={16} />
            <span>All Categories</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
          </button>

          {megaOpen && validCats.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-2xl border border-slate-200 z-[1200] overflow-hidden py-2">
              {validCats.map((cat) => (
                <Link
                  key={cat.id || cat.slug}
                  to={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
                  onClick={() => setMegaOpen(false)}
                  className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f97316] font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <Box size={14} className="text-slate-400" />
                    )}
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cat.productCount > 0 && (
                      <span className="text-[10px] text-slate-400">{cat.productCount}</span>
                    )}
                    <ChevronRight size={12} className="text-slate-300" />
                  </div>
                </Link>
              ))}
              <div className="border-t border-slate-100 mt-2 pt-2">
                <Link
                  to="/shop/products"
                  onClick={() => setMegaOpen(false)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#f97316] hover:text-orange-700"
                >
                  <Tag size={13} />
                  View All Products
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Primary Horizontal Category Links — from DB */}
        <div className="hidden md:flex items-center gap-5 py-2.5 overflow-x-auto hide-scrollbar flex-1 px-6">
          {validCats.slice(0, 7).map((cat) => (
            <NavLink
              key={cat.id || cat.slug}
              to={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
              className={({ isActive }) =>
                `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
              }
            >
              {cat.name}
            </NavLink>
          ))}
          {validCats.length === 0 && (
            <NavLink
              to="/shop/products"
              className="hover:text-[#f97316] transition-colors whitespace-nowrap"
            >
              All Products
            </NavLink>
          )}
          <NavLink
            to="/shop/products?sort=best"
            className="flex items-center gap-1 text-red-600 font-bold hover:text-red-700 transition-colors whitespace-nowrap"
          >
            <Flame size={14} className="fill-red-500" />
            <span>Best Sellers</span>
          </NavLink>
        </div>

        {/* Right Help Links */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500">
          <Link to="/#about" className="hover:text-slate-900 transition-colors">
            Custom Manufacturing
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/#contact" className="hover:text-slate-900 transition-colors">
            Engineering Support
          </Link>
        </div>
      </div>
    </nav>
  )
}
