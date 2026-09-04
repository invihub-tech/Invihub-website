import { useNavigate } from 'react-router-dom'
import { navItems } from '../data/navigation'
import { scrollToId } from '../lib/scroll'

export default function Footer() {
  const navigate = useNavigate()

  const go = (id) => {
    if (window.location.pathname === '/') {
      scrollToId(id)
      return
    }
    navigate(`/#${id}`)
  }

  return (
    <footer className="bg-black pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:pt-10">
      <div className="container-page">
        <div className="flex flex-col gap-6 pb-6 sm:gap-8 sm:pb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white sm:h-12 sm:w-12">
              <img alt="INVIHUB" className="h-full w-full object-contain" src="/images/logo.png" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold tracking-[0.04em] text-white sm:text-[15px] sm:tracking-[0.06em]">
                INVIHUB TECHNOSOLUTIONS
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#c5a059] sm:text-[11px] sm:tracking-[0.16em]">
                INTERACT <span className="text-white/35">&gt;&gt;</span> INNOVATE <span className="text-white/35">&gt;&gt;</span> INSPIRE
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-white/55 sm:gap-x-6">
            {navItems.map((item) => (
              <button key={item.target} type="button" className="hover:text-white transition-colors" onClick={() => go(item.target)}>
                {item.label}
              </button>
            ))}
            <button type="button" className="hover:text-white transition-colors" onClick={() => navigate('/shop')}>
              Shop
            </button>
          </nav>
        </div>
        <div className="border-t border-white/10 pt-5 pr-14 text-[11px] text-white/40 sm:pt-6 sm:text-[12px]">
          © 2026 INVIHUB Technosolutions. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
