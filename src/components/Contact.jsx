import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Reveal from './ui/Reveal'
import ProjectForm from './contact/ProjectForm'

export default function Contact() {
  const [open, setOpen] = useState(false)

  return (
    <section id="contact" className="section-pad bg-black border-t border-white/10">
      <div className="container-page">
        <Reveal>
          <div className="rounded-[16px] border border-white/12 bg-[#0c0c0c] px-5 py-8 sm:rounded-[20px] sm:px-10 sm:py-12 lg:px-16 lg:py-16">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-20">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#c5a059]">HAVE AN IDEA?</div>
                <h2 className="mt-4 font-serif font-semibold leading-[1.08] text-[clamp(28px,7vw,58px)] text-white sm:mt-5">
                  Let&apos;s build something extraordinary together.
                </h2>
                <p className="mt-4 max-w-xl text-[15px] leading-[1.75] text-white/50 sm:mt-5 sm:text-[16px]">
                  Tell us where you are in the journey — idea, design, prototype, sourcing or production.
                </p>
              </div>

              <div className="flex min-w-0 flex-col justify-center lg:pt-6">
                <a href="mailto:invihub@gmail.com" className="block pb-5 sm:pb-6">
                  <div className="text-[11px] tracking-[0.16em] uppercase text-white/40">EMAIL</div>
                  <div className="mt-2 break-all font-serif text-[clamp(20px,6vw,32px)] leading-tight text-white">
                    invihub@gmail.com
                  </div>
                </a>
                <div className="h-px bg-white/12" />
                <a href="tel:+917022149521" className="block py-5 sm:py-6">
                  <div className="text-[11px] tracking-[0.16em] uppercase text-white/40">PHONE</div>
                  <div className="mt-2 font-serif text-[clamp(20px,6vw,32px)] leading-tight text-white">7022149521</div>
                </a>
                <div className="h-px bg-white/12" />
                <button type="button" className="btn-white mt-6 w-full sm:mt-8" onClick={() => setOpen(true)}>
                  Start a Project
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      <ProjectForm open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
