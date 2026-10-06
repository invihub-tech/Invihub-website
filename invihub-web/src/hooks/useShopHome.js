import { useEffect, useState } from 'react'
import { api } from '../models/api'
import { isSupabaseConfigured } from '../lib/supabase'

export function useShopHome() {
  const [cats, setCats] = useState([])
  const [featured, setFeatured] = useState([])
  const [fresh, setFresh] = useState([])
  const [best, setBest] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setError('Shop backend is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.')
          setLoading(false)
        }
        return
      }
      try {
        const [c, f, n, b] = await Promise.all([
          api.categories(),
          api.products({ featured: '1' }),
          api.products({ isNew: '1' }),
          api.products({ sort: 'best' }),
        ])
        if (cancelled) return
        setCats(c)
        setFeatured(f)
        setFresh(n)
        setBest(b.slice(0, 4))
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load the shop')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { cats, featured, fresh, best, loading, error }
}
