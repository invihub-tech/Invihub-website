import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { scrollToId } from '../lib/scroll'

const CAPABILITIES = [
  'Concept to Product',
  'Electronics & Embedded',
  'Prototyping & Manufacturing',
  'Supply Chain Solutions',
]

export default function Hero() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <section id="home" className="relative bg-black pb-12 sm:pb-16 lg:pb-24">
      <div className="container-page pt-8 sm:pt-10 lg:pt-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.16em] text-white sm:mb-6 sm:text-[12px] sm:tracking-[0.18em]">
              INTERACT &gt;&gt; INNOVATE &gt;&gt; INSPIRE
            </div>
            <h1 className="break-words font-extrabold uppercase tracking-[-0.04em] leading-[0.95] text-[clamp(28px,8.4vw,72px)]">
              <span className="text-white">WE ENGINEER IDEAS INTO</span>
              <br />
              <span className="text-[#c5a059]">INNOVATIVE PRODUCTS</span>
            </h1>
            <p className="mt-5 max-w-[540px] text-[15px] leading-[1.65] text-white/85 sm:mt-6 sm:text-[18px]">
              End-to-end engineering, manufacturing, electronics (EMS) and supply chain solutions under one roof.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-white/15 pt-5 sm:mt-7 sm:grid-cols-2 sm:pt-6">
              {CAPABILITIES.map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-[13px] text-white/90 sm:text-[14px]">
                  <span className="text-[11px] leading-none text-[#c5a059]" aria-hidden>
                    ◆
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 min-[480px]:flex-row">
              <button type="button" className="btn-white w-full min-[480px]:w-auto" onClick={() => scrollToId('services')}>
                Explore Services
                <ArrowRight size={16} />
              </button>
              <button type="button" className="btn-outline-white w-full min-[480px]:w-auto" onClick={() => scrollToId('contact')}>
                Discuss Your Project
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] lg:max-w-none">
            <div
              className="relative"
              style={{
                opacity: ready ? 1 : 0,
                transform: ready ? 'scale(1)' : 'scale(0.97)',
                transition: 'opacity 1000ms cubic-bezier(0.22, 1, 0.36, 1), transform 1000ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <img
                alt="INVIHUB exploded electronics and mechanical assembly"
                className="w-full h-auto object-contain"
                src="/images/hero-product.png"
              />
              <span className="hidden sm:block absolute top-[8%] left-0 border border-white/70 text-white text-[10px] tracking-[0.16em] px-2.5 py-1 bg-black/40">
                PRODUCT
              </span>
              <span className="hidden sm:block absolute top-[42%] right-0 border border-white/70 text-white text-[10px] tracking-[0.16em] px-2.5 py-1 bg-black/40">
                ELECTRONICS
              </span>
              <span className="hidden sm:block absolute bottom-[14%] left-[8%] border border-white/70 text-white text-[10px] tracking-[0.16em] px-2.5 py-1 bg-black/40">
                MANUFACTURING
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 sm:mt-12 sm:gap-4 lg:mt-16">
          {[
            ['100+', 'Projects'],
            ['50+', 'Clients'],
            ['7+', 'Years'],
          ].map(([n, l]) => (
            <div key={l} className="min-w-0">
              <div className="font-serif text-[28px] font-semibold leading-none text-white sm:text-[36px] lg:text-[48px]">{n}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/50 sm:text-[11px] sm:tracking-[0.16em]">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
