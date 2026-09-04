import { processStages } from '../data/process'
import Reveal from './ui/Reveal'

export default function Process() {
  return (
    <section id="process" className="section-pad bg-black border-t border-white/10">
      <div className="container-page">
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-end pb-8 lg:pb-10">
            <div>
              <div className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#c5a059] mb-4">OUR PROCESS</div>
              <h2 className="font-serif font-semibold leading-[1.08] text-white text-[clamp(28px,7vw,64px)]">
                From discussion
                <br />
                to delivery.
              </h2>
            </div>
            <p className="text-[15px] sm:text-[16px] leading-[1.7] text-white/55 max-w-md">
              A structured development pipeline keeps engineering, procurement and production aligned from day one.
            </p>
          </div>
        </Reveal>

        <div className="border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y divide-white/15 sm:divide-y-0">
          {processStages.map((stage, i) => (
            <article
              key={stage.stage}
              className={`px-0 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 ${i > 0 ? 'lg:border-l lg:border-white/15' : ''} ${
                i % 2 === 1 ? 'sm:border-l sm:border-white/15 lg:border-l' : ''
              } ${i < 2 ? 'sm:border-b sm:border-white/15 lg:border-b-0' : ''}`}
            >
              <div className="text-[12px] font-semibold tracking-[0.14em] text-[#c5a059]">{stage.stage}</div>
              <div className="mb-5 mt-6 flex h-[88px] w-[88px] items-center justify-center border border-white/15 p-2 sm:h-[110px] sm:w-[110px] sm:mb-6">
                <img alt={`${stage.title} process`} src={stage.image} className="w-full h-full object-contain" />
              </div>
              <h3 className="font-serif text-[24px] font-semibold text-white sm:text-[28px] lg:text-[32px]">{stage.title}</h3>
              <p className="mt-3 text-[14px] sm:text-[15px] leading-[1.7] text-white/55">{stage.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
