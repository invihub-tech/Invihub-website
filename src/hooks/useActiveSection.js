import { useEffect, useState } from 'react'

const SECTION_IDS = ['home', 'about', 'process', 'services', 'work', 'contact']

export default function useActiveSection(enabled = true) {
  const [active, setActive] = useState('home')

  useEffect(() => {
    if (!enabled) return undefined

    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean)
    if (!elements.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-35% 0px -50% 0px', threshold: [0.1, 0.25, 0.5] },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [enabled])

  return active
}
