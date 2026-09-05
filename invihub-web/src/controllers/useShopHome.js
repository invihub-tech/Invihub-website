import { useEffect, useState } from 'react'
import { api } from '../models/api'

export function useShopHome() {
  const [cats, setCats] = useState([])
  const [featured, setFeatured] = useState([])
  const [fresh, setFresh] = useState([])
  const [best, setBest] = useState([])

  useEffect(() => {
    api.categories().then(setCats).catch(() => {})
    api.products({ featured: '1' }).then(setFeatured).catch(() => {})
    api.products({ isNew: '1' }).then(setFresh).catch(() => {})
    api.products({ sort: 'best' }).then((d) => setBest(d.slice(0, 4))).catch(() => {})
  }, [])

  return { cats, featured, fresh, best }
}
