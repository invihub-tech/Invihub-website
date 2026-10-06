import { Truck, ShieldCheck, Sparkles, MapPin } from 'lucide-react'

export default function ShopTopBar() {
  return (
    <div className="bg-[#0f172a] text-[11px] font-medium text-slate-300 border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between">
        {/* Desktop items */}
        <div className="hidden md:flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-orange-400">
            <Truck size={13} className="text-orange-400 shrink-0" />
            <span>Free shipping on orders above ₹999</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400 shrink-0" />
            <span>3D Printing Experts & Engineering Lab</span>
          </span>
        </div>

        {/* Right badges */}
        <div className="hidden sm:flex items-center gap-5 ml-auto">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span>100% Secure Payments</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-sky-400 shrink-0" />
            <span>Pan India Delivery</span>
          </span>
        </div>

        {/* Mobile ticker */}
        <div className="flex sm:hidden w-full items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-orange-400">
            <Truck size={12} />
            <span>Free shipping above ₹999</span>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>Pan India</span>
          </span>
        </div>
      </div>
    </div>
  )
}
