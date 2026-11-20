import { useEffect, useState } from 'react'
import { api } from '../models/api'
import { isSupabaseConfigured } from '../lib/supabase'

export function useShopHome() {
  const [cats, setCats] = useState([])
  const [featured, setFeatured] = useState([])
  const [fresh, setFresh] = useState([])
  const [best, setBest] = useState([])
  const [allProds, setAllProds] = useState([])
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
        const [c, f, n, b, prods] = await Promise.all([
          api.categories(),
          api.products({ featured: '1' }),
          api.products({ isNew: '1' }),
          api.products({ sort: 'best' }),
          api.products({}).catch(() => []),
        ])
        if (cancelled) return

        // Build a map of categoryId -> up to 6 preview images from actual active products
        const categoryPreviewsMap = new Map()
        for (const p of prods || []) {
          const catIds = new Set(
            [
              p.category?.id,
              p.categoryId,
              ...(Array.isArray(p.categoryIds) ? p.categoryIds : []),
            ].filter(Boolean)
          )

          const sortedImgs = (p.images || []).slice().sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0))
          const primaryImg = sortedImgs.find((im) => im.isPrimary) || sortedImgs[0]
          if (!primaryImg?.url) continue

          for (const cid of catIds) {
            if (!categoryPreviewsMap.has(cid)) {
              categoryPreviewsMap.set(cid, [])
            }
            const list = categoryPreviewsMap.get(cid)
            if (list.length < 6) {
              list.push({
                url: primaryImg.url,
                alt: primaryImg.alt || p.name,
                productName: p.name,
              })
            }
          }
        }

        // Attach previewImages to each category if not already present from edge function
        const enrichedCats = (c || []).map((cat) => ({
          ...cat,
          previewImages:
            Array.isArray(cat.previewImages) && cat.previewImages.length > 0
              ? cat.previewImages
              : categoryPreviewsMap.get(cat.id) || [],
        }))

        setCats(enrichedCats)
        setFeatured(f)
        setFresh(n)
        setBest(b.slice(0, 4))
        setAllProds(prods || [])
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

  return { cats, featured, fresh, best, allProds, loading, error }
}
