import { useEffect, useRef, useState } from 'react'
import { services } from '../data/services'
import Reveal from './ui/Reveal'

function CapabilityCard({ current, active }) {
  return (
    <div className="rounded-[8px] border border-white/20 overflow-hidden bg-black">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-[9px] tracking-[0.12em] uppercase text-white/45 sm:px-4 sm:py-3 sm:text-[11px] sm:tracking-[0.14em]">
        <span className="truncate">INVIHUB / CAPABILITIES</span>
        <span className={`shrink-0 ${active === 5 ? 'text-[#c5a059]' : 'text-white/45'}`}>
          {current.number} / 06
        </span>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-[#080809] sm:aspect-[4/3] md:aspect-[1.14]">
        {services.map((service, i) => (
          <img
            key={service.number}
            alt={service.title}
            src={service.image}
            className={`absolute inset-0 h-full w-full object-cover object-center grayscale contrast-[1.06] motion-reduce:transition-none ${
              active === i ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.035]'
            }`}
            style={{ transition: 'opacity 750ms ease, transform 1050ms ease' }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent p-4 pt-12 sm:p-5 sm:pt-16">
          <div className="text-[9px] tracking-[0.16em] uppercase text-[#c5a059] sm:text-[10px]">CURRENT CAPABILITY</div>
          <div className="mt-1 font-serif text-[22px] leading-tight text-white sm:text-[28px] md:text-[30px] lg:text-[34px]">{current.title}</div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="h-px bg-white/15 mb-3 relative">
          <div
            className="absolute left-0 top-0 h-px bg-[#c5a059] transition-all duration-[650ms] ease-invi"
            style={{ width: `${((active + 1) / services.length) * 100}%` }}
          />
        </div>
        <div className="text-center text-[10px] tracking-[0.18em] uppercase text-white/40">
          INTERACT <span className="text-[#c5a059]">◆</span> INNOVATE <span className="text-[#c5a059]">◆</span> INSPIRE
        </div>
      </div>
    </div>
  )
}

function ServiceStory({ service, index, active, innerRef, onEnter }) {
  const isActive = active === index
  return (
    <article
      ref={innerRef}
      onMouseEnter={onEnter}
      className={`flex min-h-0 flex-col justify-center py-8 transition-opacity duration-[650ms] ease-invi motion-reduce:transition-none sm:py-10 md:min-h-[70vh] lg:min-h-[80vh] ${
        isActive ? 'opacity-100' : 'opacity-[0.22]'
      }`}
    >
      <div className="text-[13px] font-serif text-[#c5a059]">{service.number}</div>
      <div className="mt-2 text-[11px] tracking-[0.16em] uppercase text-white/40">{service.category}</div>
      <h3 className="mt-3 font-serif text-[clamp(26px,7vw,52px)] leading-[1.1] text-white">{service.title}</h3>
      <p className="mt-5 max-w-xl text-[15px] sm:text-[16px] leading-[1.75] text-white/55">{service.description}</p>
      <ul className="mt-6 space-y-2.5 text-[15px] text-white/70">
        {service.capabilities.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="text-[#c5a059] shrink-0">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 pt-4 border-t border-white/15 text-[12px] tracking-wide text-white/45">{service.journey}</div>
    </article>
  )
}

export default function Services() {
  const [active, setActive] = useState(0)
  const cardRefs = useRef([])

  useEffect(() => {
    let frame = 0
    const pickActive = () => {
      const center = window.innerHeight * 0.42
      let best = 0
      let bestDist = Infinity
      cardRefs.current.forEach((el, index) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        const mid = (rect.top + rect.bottom) / 2
        const dist = Math.abs(mid - center)
        if (dist < bestDist) {
          bestDist = dist
          best = index
        }
      })
      setActive((prev) => (prev === best ? prev : best))
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(pickActive)
    }

    pickActive()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const current = services[active]

  return (
    <section id="services" className="section-pad bg-black border-t border-white/10">
      <div className="container-page">
        <Reveal>
          <div className="mb-10 grid grid-cols-1 items-end gap-6 md:mb-14 md:grid-cols-2 md:gap-12 lg:mb-16 lg:gap-16">
            <div>
              <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#c5a059] mb-4">OUR SERVICES</div>
              <h2 className="font-serif font-semibold leading-[1.08] text-[clamp(28px,7vw,64px)]">
                <span className="text-white">End-to-end engineering.</span>
                <br />
                <span className="text-white/40">One continuous journey.</span>
              </h2>
            </div>
            <p className="max-w-md text-[15px] leading-[1.7] text-white/50 sm:text-[16px] md:pb-2">
              Scroll through our capabilities. The visual stays fixed while each service story moves through the viewport and fades into the next.
            </p>
          </div>
        </Reveal>

        <div className="items-start md:grid md:grid-cols-2 md:gap-10 lg:gap-16">
          <div className="mb-8 md:sticky md:top-[100px] md:mb-0 md:self-start">
            <CapabilityCard current={current} active={active} />
          </div>

          <div>
            {services.map((service, index) => (
              <ServiceStory
                key={service.number}
                service={service}
                index={index}
                active={active}
                onEnter={() => setActive(index)}
                innerRef={(el) => {
                  cardRefs.current[index] = el
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
