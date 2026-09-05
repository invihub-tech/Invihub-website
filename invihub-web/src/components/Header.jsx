import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight } from 'lucide-react'
import { navItems } from '../data/navigation'
import useActiveSection from '../hooks/useActiveSection'
import { scrollToId } from '../lib/scroll'

function BrandLockup({ onClick }) {
  return (
    <button type="button" className="flex min-w-0 items-center gap-2 sm:gap-3" onClick={onClick} aria-label="INVIHUB home">
      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white sm:h-10 sm:w-10 xl:h-12 xl:w-12">
        <img alt="" className="h-full w-full object-contain" src="/images/logo.png" />
      </span>
      <span className="flex min-w-0 flex-col items-start text-left leading-none">
        <span className="text-[15px] font-extrabold tracking-[0.06em] text-white sm:text-[16px] xl:text-[18px]">INVIHUB</span>
        <span className="mt-1 hidden text-[8px] font-medium uppercase tracking-[0.18em] text-white/70 min-[380px]:block xl:text-[9px]">
          Technosolutions
        </span>
      </span>
    </button>
  )
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const onHome = location.pathname === '/'
  const active = useActiveSection(onHome)
  const [open, setOpen] = useState(false)
  const shopActive = location.pathname.startsWith('/shop')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const goSection = (id) => {
    setOpen(false)
    if (onHome) {
      scrollToId(id)
      return
    }
    navigate(`/#${id}`)
  }

  const goShop = () => {
    setOpen(false)
    navigate('/shop')
  }

  const navClass = (isActive) =>
    `relative text-[13px] font-medium tracking-wide transition-colors duration-[250ms] ${
      isActive ? 'text-white' : 'text-white/80 hover:text-white'
    }`

  return (
    <>
      <header className="sticky top-0 z-[1000] w-full border-b border-white/10 bg-black pt-[env(safe-area-inset-top)]">
        <div className="container-page flex h-[60px] items-center justify-between gap-3 sm:h-[68px] xl:h-[80px]">
          <BrandLockup onClick={() => goSection('home')} />

          <nav className="hidden items-center gap-5 xl:flex 2xl:gap-8">
            {navItems.map((item) => {
              const isActive = onHome && active === item.target
              return (
                <button key={item.target} type="button" onClick={() => goSection(item.target)} className={navClass(isActive)}>
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#c5a059]" />
                  )}
                </button>
              )
            })}
            <button type="button" onClick={goShop} className={navClass(shopActive)}>
              Shop
              {shopActive && (
                <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#c5a059]" />
              )}
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="btn-outline-white hidden h-[40px] w-auto px-4 md:inline-flex xl:h-[42px] xl:px-5"
              onClick={() => goSection('contact')}
            >
              Get a Quote
              <ArrowRight size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded border border-white/25 bg-black text-white xl:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[calc(60px+env(safe-area-inset-top))] z-[999] flex flex-col overflow-y-auto bg-black px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 mobile-menu-enter sm:top-[calc(68px+env(safe-area-inset-top))] sm:pt-8">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => goSection(item.target)}
                className={`py-1.5 text-left text-[26px] font-bold leading-tight min-[400px]:text-[30px] sm:text-[34px] ${
                  onHome && active === item.target ? 'text-[#c5a059]' : 'text-white'
                }`}
              >
                {item.label.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={goShop}
              className={`py-1.5 text-left text-[26px] font-bold leading-tight min-[400px]:text-[30px] sm:text-[34px] ${
                shopActive ? 'text-[#c5a059]' : 'text-white'
              }`}
            >
              SHOP
            </button>
          </nav>
          <button type="button" className="btn-outline-white mt-8 w-full sm:mt-auto" onClick={() => goSection('contact')}>
            Get a Quote
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </>
  )
}
