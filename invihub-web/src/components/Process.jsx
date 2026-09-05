import { processStages } from '../data/process'
import Reveal from './ui/Reveal'

export default function Process() {
  return (
    <section id="process" className="section-pad bg-black border-t border-white/10">
      <div className="container-page">
        <Reveal>
          <div className="grid grid-cols-1 items-end gap-6 pb-8 md:grid-cols-2 md:gap-12 lg:gap-16 lg:pb-12">
            <div>
              <div className="mb-4 text-[12px] font-semibold tracking-[0.16em] uppercase text-[#c5a059]">OUR PROCESS</div>
              <h2 className="font-serif font-semibold leading-[1.08] text-[clamp(28px,7vw,64px)] text-white">
                From discussion
                <br />
                to delivery.
              </h2>
            </div>
            <p className="max-w-md text-[15px] leading-[1.7] text-white/55 sm:text-[16px]">
              A structured development pipeline keeps engineering, procurement and production aligned from day one.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 divide-y divide-white/15 border-y border-white/15 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {processStages.map((stage, i) => (
            <article
              key={stage.stage}
              className={`group flex min-h-0 flex-col px-0 py-8 sm:min-h-[290px] sm:px-7 sm:py-8 lg:px-8 lg:py-9 ${
                i > 0 ? 'lg:border-l lg:border-white/15' : ''
              } ${i % 2 === 1 ? 'sm:border-l sm:border-white/15' : ''} ${
                i < 2 ? 'sm:border-b sm:border-white/15 lg:border-b-0' : ''
              }`}
            >
              <div className="mb-6 text-[12px] font-semibold tracking-[0.14em] text-[#c5a059]">{stage.stage}</div>
              <div className="relative mb-6 h-[180px] w-full overflow-hidden border border-white/15 bg-[#0a0b0d] sm:h-[150px]">
                <img
                  alt={stage.title}
                  src={stage.image}
                  className="h-full w-full object-cover object-center grayscale contrast-[1.05] opacity-90 transition-[transform,filter,opacity] duration-[450ms] ease-in-out motion-reduce:transition-none group-hover:scale-[1.045] group-hover:grayscale-[0.6] group-hover:opacity-100"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>
              <h3 className="font-serif text-[24px] font-semibold text-white sm:text-[27px]">{stage.title}</h3>
              <p className="mt-3.5 text-[14px] leading-[1.75] text-white/55 sm:text-[12px] sm:leading-[1.75] lg:text-[13px]">
                {stage.copy}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
