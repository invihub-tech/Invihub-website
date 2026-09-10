const MAP_QUERY = encodeURIComponent(
  'Invihub Technosolutions, 402-B, ITI HBCS Layout, Phase 3, Nayanda Halli, Bengaluru, Karnataka 560026',
)
const MAP_SRC = `https://www.google.com/maps?q=${MAP_QUERY}&output=embed`

export default function Map() {
  return (
    <section className="bg-black pb-4" aria-label="Facility location">
      <div className="container-page">
        <div className="overflow-hidden rounded-[8px] border border-white/10">
          <div className="h-[240px] w-full sm:h-[300px] lg:h-[380px]">
            <iframe
              title="INVIHUB Technosolutions, Nayanda Halli, Bengaluru"
              src={MAP_SRC}
              width="100%"
              height="100%"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              style={{ border: 0 }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
