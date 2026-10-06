import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Sparkles, CheckCircle2 } from 'lucide-react'

const FILAMENT_TYPES = [
  { name: 'PLA', desc: 'Easy printing, high detail, bio-based', temp: '190–220°C', bed: '50–60°C' },
  { name: 'PLA+', desc: 'Tougher than standard PLA with superior layer bonding', temp: '205–225°C', bed: '55–65°C' },
  { name: 'PETG', desc: 'Durable, impact resistant, weather-proof', temp: '230–250°C', bed: '70–85°C' },
  { name: 'ABS', desc: 'Heat resistant, rigid, acetone smoothable', temp: '240–260°C', bed: '90–110°C' },
  { name: 'ASA', desc: 'UV resistant, outdoor engineering grade', temp: '240–260°C', bed: '90–105°C' },
  { name: 'TPU', desc: 'Flexible 95A rubber-like elasticity', temp: '210–230°C', bed: '40–60°C' },
  { name: 'Specialty', desc: 'Carbon Fiber, Wood & Glow-in-the-dark blends', temp: '220–260°C', bed: '60–90°C' },
]

const SPOOL_PALETTE = [
  { color: 'Matte Black', hex: '#18181b', shadow: 'rgba(24, 24, 27, 0.6)' },
  { color: 'Engineering Orange', hex: '#ea580c', shadow: 'rgba(234, 88, 12, 0.6)' },
  { color: 'Pure White', hex: '#f8fafc', shadow: 'rgba(248, 250, 252, 0.4)' },
  { color: 'Forest Green', hex: '#15803d', shadow: 'rgba(21, 128, 61, 0.6)' },
  { color: 'Cobalt Blue', hex: '#1d4ed8', shadow: 'rgba(29, 78, 216, 0.6)' },
  { color: 'Fire Red', hex: '#b91c1c', shadow: 'rgba(185, 28, 28, 0.6)' },
  { color: 'Silver Gray', hex: '#64748b', shadow: 'rgba(100, 116, 139, 0.6)' },
]

export default function FilamentSection() {
  const [selectedType, setSelectedType] = useState('PLA+')

  const activeFilament = FILAMENT_TYPES.find((f) => f.name === selectedType) || FILAMENT_TYPES[1]

  return (
    <section className="bg-gradient-to-br from-[#0b0f19] via-[#0f172a] to-[#0b0f19] rounded-2xl p-6 sm:p-10 border border-slate-800 text-white relative overflow-hidden shadow-2xl my-12">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles size={13} />
              <span>Engineered Spools</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Premium Filament Collection
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              High-purity resins with tight ±0.02mm diameter tolerance. Tangle-free spooling and vacuum-sealed packaging for professional prints.
            </p>
          </div>

          <Link
            to="/shop/products?q=Filament"
            className="btn-shop-primary self-start md:self-auto gap-2 text-xs py-2.5 px-5 font-bold shrink-0"
          >
            <span>Explore All Filaments</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Material Pills */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {FILAMENT_TYPES.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => setSelectedType(f.name)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedType === f.name
                  ? 'bg-[#f97316] text-white shadow-lg shadow-orange-950/50'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Dynamic Material Details & Spool Display */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/60 p-6 rounded-xl border border-slate-800/80">
          {/* Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">INVIHUB {activeFilament.name}</span>
              <span className="text-xs bg-slate-800 text-orange-400 px-2.5 py-0.5 rounded-full font-semibold border border-slate-700">
                1.75mm • 1kg
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeFilament.desc}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Nozzle Temp</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{activeFilament.temp}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Bed Temp</span>
                <span className="font-bold text-white text-sm mt-0.5 block">{activeFilament.bed}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                ±0.02mm Accuracy
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Desiccant Vacuum Bag
              </span>
            </div>
          </div>

          {/* Visual Row of Color Spools */}
          <div className="lg:col-span-7">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Available Spool Colors:
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {SPOOL_PALETTE.map((spool, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-orange-500/50 transition-all duration-200 group"
                >
                  {/* Stylized 3D Spool Representation */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div
                      className="w-11 h-11 rounded-full border-4 border-slate-800 flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
                      style={{ backgroundColor: spool.hex }}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium text-center line-clamp-1 group-hover:text-orange-400 transition-colors">
                    {spool.color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
