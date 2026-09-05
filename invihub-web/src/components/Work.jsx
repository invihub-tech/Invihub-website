import { workItems } from '../data/work'
import Reveal from './ui/Reveal'

function WorkCard({ item, tall = false }) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[10px] border border-white/15 bg-[#101113] ${
        tall ? 'min-h-[280px] sm:min-h-[420px] lg:min-h-full' : 'min-h-[200px] sm:min-h-[250px] flex-1'
      }`}
    >
      <img
        alt={item.alt}
        src={item.image}
        className="absolute inset-0 h-full w-full object-cover object-center grayscale contrast-[1.05] opacity-90 transition-[transform,filter,opacity] duration-[600ms] ease-in-out motion-reduce:transition-none group-hover:scale-[1.04] group-hover:grayscale-[0.6] group-hover:opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7">
        <div className="text-[10px] tracking-[0.14em] uppercase text-[#c5a059] sm:text-[11px] sm:tracking-[0.16em]">{item.category}</div>
        <h3 className="mt-1.5 font-serif text-[18px] leading-tight text-white sm:mt-2 sm:text-[23px] lg:text-[28px]">{item.title}</h3>
      </div>
    </article>
  )
}

export default function Work() {
  const [first, second, third] = workItems

  return (
    <section id="work" className="section-pad bg-black border-t border-white/10">
      <div className="container-page">
        <Reveal>
          <div className="mb-12 grid grid-cols-1 items-end gap-6 md:grid-cols-2 md:gap-16 lg:mb-16">
            <div>
              <div className="mb-4 text-[12px] font-semibold tracking-[0.16em] uppercase text-[#c5a059]">OUR WORK</div>
              <h2 className="font-serif font-semibold leading-[1.08] text-[clamp(28px,7vw,64px)] text-white">
                Engineering that becomes real.
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-[1.7] text-white/50 md:pb-1">
              Some of our inhouse development and manufacturing.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-4">
          <div className="lg:col-span-7">
            <WorkCard item={first} tall />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <WorkCard item={second} />
            <WorkCard item={third} />
          </div>
        </div>
      </div>
    </section>
  )
}
