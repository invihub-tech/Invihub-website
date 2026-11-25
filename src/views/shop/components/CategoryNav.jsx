import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ChevronDown, Flame, ChevronRight, Tag, Wrench } from 'lucide-react'

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
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">

        {/* All Categories Mega Menu */}
        <div ref={menuRef} className="relative py-2.5">
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="flex items-center gap-2 font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-md transition-colors"
            aria-expanded={megaOpen}
            aria-label="Toggle All Categories menu"
          >
            <Menu size={16} />
            <span>All Categories</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
          </button>

          {megaOpen && validCats.length > 0 && (
            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-[1200] overflow-hidden flex flex-col max-h-[min(75vh,520px)] animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Category panel header */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  All Categories ({validCats.length})
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Scroll to view</span>
              </div>

              {/* Scrollable category list */}
              <div className="flex-1 overflow-y-auto overscroll-contain py-1 divide-y divide-slate-50 shop-scrollbar">
                {validCats.map((cat, idx) => (
                  <Link
                    key={cat.id || cat.slug}
                    to={`/shop/products?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setMegaOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-700 hover:bg-orange-50 hover:text-[#f97316] font-medium transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/50 px-1.5 py-0.5 rounded shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate group-hover:translate-x-0.5 transition-transform">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {cat.productCount > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                          {cat.productCount}
                        </span>
                      )}
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-[#f97316] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Sticky bottom actions */}
              <div className="border-t border-slate-100 bg-slate-50/70 p-2 shrink-0 space-y-1">
                <Link
                  to="/shop/custom-printing"
                  onClick={() => setMegaOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2 text-xs font-bold text-[#f97316] bg-orange-50/80 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Wrench size={13} />
                    <span>Custom 3D Printing</span>
                  </div>
                  <span className="text-[10px] bg-[#f97316] text-white px-1.5 py-0.5 rounded font-bold uppercase">
                    Service
                  </span>
                </Link>
                <Link
                  to="/shop/products"
                  onClick={() => setMegaOpen(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[#f97316] transition-colors"
                >
                  <Tag size={13} />
                  <span>View All Products</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Help & Service Links */}
        <div className="flex items-center gap-4 text-xs text-slate-600 py-2.5">
          <Link
            to="/shop/custom-printing"
            className="hover:text-slate-900 transition-colors"
          >
            Custom 3D Printing
          </Link>
          <span className="text-slate-300">|</span>
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
