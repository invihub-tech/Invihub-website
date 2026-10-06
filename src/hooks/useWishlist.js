import { useState, useEffect } from 'react'

const STORAGE_KEY = 'invihub_wishlist'

export function useWishlist() {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        setWishlist(saved ? JSON.parse(saved) : [])
      } catch {
        setWishlist([])
      }
    }
    window.addEventListener('invi-wishlist-sync', handleSync)
    return () => window.removeEventListener('invi-wishlist-sync', handleSync)
  }, [])

  const toggleWishlist = (productId) => {
    if (!productId) return
    setWishlist((prev) => {
      const exists = prev.includes(productId)
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId]
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event('invi-wishlist-sync'))
      return next
    })
  }

  const isWishlisted = (productId) => wishlist.includes(productId)

  return {
    wishlist,
    wishlistCount: wishlist.length,
    toggleWishlist,
    isWishlisted,
  }
}
