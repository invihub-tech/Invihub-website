import { workItems } from '../data/work'
import Reveal from './ui/Reveal'

function Mosaic({ images, alt }) {
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
      {images.map((src) => (
        <img
          key={src}
          alt=""
          src={src}
          className="h-full w-full object-cover grayscale contrast-110"
        />
      ))}
      <span className="sr-only">{alt}</span>
    </div>
  )
}

function WorkCard({ item, tall = false }) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[14px] border border-white/15 bg-black ${
        tall ? 'min-h-[280px] sm:min-h-[420px] lg:min-h-full' : 'min-h-[200px] sm:min-h-[250px] flex-1'
      }`}
    >
      {item.mosaic ? (
        <Mosaic images={item.mosaic} alt={item.alt} />
      ) : (
        <img
          alt={item.alt}
          src={item.image}
          className="absolute inset-0 h-full w-full object-cover grayscale contrast-110 transition-transform duration-700 ease-invi group-hover:scale-[1.03]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7">
        <div className="text-[10px] tracking-[0.14em] uppercase text-[#c5a059] sm:text-[11px] sm:tracking-[0.16em]">{item.category}</div>
        <h3 className="mt-1.5 font-serif text-[18px] leading-tight text-white sm:mt-2 sm:text-[28px]">{item.title}</h3>
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

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            <WorkCard item={first} tall />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
            <WorkCard item={second} />
            <WorkCard item={third} />
          </div>
        </div>
      </div>
    </section>
  )
}
