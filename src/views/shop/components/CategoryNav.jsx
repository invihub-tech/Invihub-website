import { useState, useRef, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ChevronDown, Sparkles, ChevronRight, Layers, Flame, Wrench, Cpu, Box, Scissors } from 'lucide-react'

const MEGA_CATEGORIES = [
  {
    title: '3D Printing',
    slug: '3d-printing',
    icon: Box,
    subcategories: [
      { name: '3D Printers (CoreXY & FDM)', query: '3D Printer' },
      { name: 'Printer Parts', query: 'Printer Parts' },
      { name: 'Brass & Hardened Nozzles', query: 'Nozzles' },
      { name: 'PEI & Spring Steel Build Plates', query: 'Build Plate' },
      { name: 'Hotends & Extruders', query: 'Hotend' },
      { name: 'Printer Accessories', query: 'Accessories' },
    ],
  },
  {
    title: 'Filaments',
    slug: 'filaments',
    icon: Layers,
    subcategories: [
      { name: 'PLA & PLA+ Filaments', query: 'PLA' },
      { name: 'PETG High-Toughness', query: 'PETG' },
      { name: 'ABS & ASA UV Resistant', query: 'ABS' },
      { name: 'Flexible TPU', query: 'TPU' },
      { name: 'Engineering Nylon & PC', query: 'Nylon' },
      { name: 'Carbon Fiber Specialty', query: 'Carbon Fiber' },
    ],
  },
  {
    title: 'Electronics',
    slug: 'electronics',
    icon: Cpu,
    subcategories: [
      { name: 'Development Boards (ESP32, STM32)', query: 'Development Board' },
      { name: 'Sensors & Measurement Modules', query: 'Sensor' },
      { name: 'Motor Drivers & Controllers', query: 'Driver' },
      { name: 'PCBs & Prototyping', query: 'PCB' },
      { name: 'Power Supplies & Converters', query: 'Power Supply' },
      { name: 'Wiring & Connectors', query: 'Wire' },
    ],
  },
  {
    title: 'Mechanical & Hardware',
    slug: 'components',
    icon: Wrench,
    subcategories: [
      { name: 'Stepper Motors & Servos', query: 'Motor' },
      { name: 'Linear Rails & Bearings', query: 'Bearing' },
      { name: 'Aluminum Extrusions & Frames', query: 'Extrusion' },
      { name: 'Precision Screws & Fasteners', query: 'Fastener' },
      { name: 'GT2 Belts & Pulleys', query: 'Belt' },
    ],
  },
  {
    title: 'Tools & Workshop',
    slug: 'tools',
    icon: Scissors,
    subcategories: [
      { name: 'Digital Vernier Calipers', query: 'Caliper' },
      { name: 'Precision Flush Cutters & Pliers', query: 'Pliers' },
      { name: 'Nozzle Cleaning Kits', query: 'Cleaning' },
      { name: 'Heatbed Adhesives & PEI Sheets', query: 'Adhesive' },
      { name: 'Filament Dryers & Storage Boxes', query: 'Dryer' },
    ],
  },
]

export default function CategoryNav({ dbCategories = [] }) {
  const [megaOpen, setMegaOpen] = useState(false)
  const [activeMega, setActiveMega] = useState(0)
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

  return (
    <nav className="bg-white border-b border-slate-200 text-xs font-medium text-slate-700 relative z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
        {/* Mega Menu Toggle Button */}
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

          {/* Mega Menu Dropdown */}
          {megaOpen && (
            <div className="absolute left-0 top-full mt-1 w-[720px] max-w-[95vw] bg-white rounded-lg shadow-2xl border border-slate-200 z-[1200] overflow-hidden flex">
              {/* Left Column: Category Categories */}
              <div className="w-1/3 bg-slate-50 p-2 border-r border-slate-200 space-y-1">
                {MEGA_CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon
                  const isActive = activeMega === idx
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onMouseEnter={() => setActiveMega(idx)}
                      onClick={() => setActiveMega(idx)}
                      className={`w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-white text-[#f97316] shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-[#f97316]' : 'text-slate-400'} />
                        <span>{cat.title}</span>
                      </div>
                      <ChevronRight size={14} className={isActive ? 'text-[#f97316]' : 'text-slate-300'} />
                    </button>
                  )
                })}

                <div className="pt-2 border-t border-slate-200">
                  <Link
                    to="/shop/products"
                    onClick={() => setMegaOpen(false)}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 hover:text-[#f97316] block"
                  >
                    View All Products →
                  </Link>
                </div>
              </div>

              {/* Right Column: Subcategories & Items */}
              <div className="w-2/3 p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-sm text-slate-900">
                    {MEGA_CATEGORIES[activeMega].title}
                  </h3>
                  <Link
                    to={`/shop/products?q=${encodeURIComponent(MEGA_CATEGORIES[activeMega].title)}`}
                    onClick={() => setMegaOpen(false)}
                    className="text-xs text-[#f97316] hover:underline font-semibold"
                  >
                    Browse all {MEGA_CATEGORIES[activeMega].title} →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MEGA_CATEGORIES[activeMega].subcategories.map((sub, idx) => (
                    <Link
                      key={idx}
                      to={`/shop/products?q=${encodeURIComponent(sub.query)}`}
                      onClick={() => setMegaOpen(false)}
                      className="p-2.5 rounded-md hover:bg-orange-50 text-xs text-slate-700 hover:text-[#f97316] font-medium transition-colors"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Horizontal Department Links */}
        <div className="hidden md:flex items-center gap-6 py-2.5 overflow-x-auto hide-scrollbar">
          <NavLink
            to="/shop/products?q=3D+Printer"
            className={({ isActive }) =>
              `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
            }
          >
            3D Printers
          </NavLink>
          <NavLink
            to="/shop/products?q=Filament"
            className={({ isActive }) =>
              `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
            }
          >
            Filaments
          </NavLink>
          <NavLink
            to="/shop/products?q=Electronics"
            className={({ isActive }) =>
              `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
            }
          >
            Electronics
          </NavLink>
          <NavLink
            to="/shop/products?q=Component"
            className={({ isActive }) =>
              `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
            }
          >
            Components
          </NavLink>
          <NavLink
            to="/shop/products?q=Tools"
            className={({ isActive }) =>
              `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
            }
          >
            Tools
          </NavLink>
          <NavLink
            to="/shop/products?q=Accessories"
            className={({ isActive }) =>
              `hover:text-[#f97316] transition-colors whitespace-nowrap ${isActive ? 'text-[#f97316] font-semibold' : ''}`
            }
          >
            Accessories
          </NavLink>
          <NavLink
            to="/shop/products?deals=1"
            className="flex items-center gap-1 text-red-600 font-bold hover:text-red-700 transition-colors whitespace-nowrap"
          >
            <Flame size={14} className="fill-red-500" />
            <span>Hot Deals</span>
          </NavLink>
        </div>

        {/* Right Help / Contact Link */}
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
