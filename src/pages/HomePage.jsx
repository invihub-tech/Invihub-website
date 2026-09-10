import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero'
import About from '../components/About'
import Process from '../components/Process'
import Services from '../components/Services'
import Work from '../components/Work'
import Contact from '../components/Contact'
import Map from '../components/contact/Map'
import { scrollToId } from '../lib/scroll'

export default function HomePage() {
  const location = useLocation()

  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (!id) {
      window.scrollTo(0, 0)
      return undefined
    }
    const t = window.setTimeout(() => scrollToId(id), 50)
    return () => window.clearTimeout(t)
  }, [location.hash])

  return (
    <main className="min-w-0">
      <Hero />
      <About />
      <Process />
      <Services />
      <Work />
      <Contact />
      <Map />
    </main>
  )
}
