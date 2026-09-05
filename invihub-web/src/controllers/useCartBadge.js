import { useEffect, useState } from 'react'
import { api } from '../models/api'

export function useCartBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = () => api.cart().then((d) => setCount(d.count || 0)).catch(() => {})
    load()
    window.addEventListener('invi-cart', load)
    return () => window.removeEventListener('invi-cart', load)
  }, [])

  return count
}
