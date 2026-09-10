import { ArrowRight } from 'lucide-react'
import Reveal from './ui/Reveal'
import { scrollToId } from '../lib/scroll'

export default function About() {
  return (
    <section id="about" className="section-pad bg-black border-t border-white/10">
      <div className="container-page">
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            <div>
              <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#c5a059] mb-6">WHY INVIHUB</div>
              <h2 className="font-serif font-semibold leading-[1.08] tracking-tight text-[clamp(28px,7vw,64px)]">
                <span className="text-white">
                  One engineering
                  <br />
                  partner.
                </span>
                <br />
                <span className="text-white/45">From idea to reality.</span>
              </h2>
            </div>
            <div className="lg:pt-[44px]">
              <p className="text-[16px] sm:text-[18px] leading-[1.75] text-white/90 max-w-[520px] font-sans">
                We connect design, electronics, prototyping, manufacturing and supplier development into a single execution path. That means fewer handoffs, faster iteration and better ownership across the complete product lifecycle.
              </p>
              <button
                type="button"
                className="mt-8 inline-flex items-center gap-2 text-[15px] text-white hover:text-[#c5a059] transition-colors"
                onClick={() => scrollToId('process')}
              >
                See how we work
                <ArrowRight size={16} className="text-[#c5a059]" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
