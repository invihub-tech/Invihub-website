import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { api } from '../../../models/api'
import ShopTopBar from '../components/ShopTopBar'
import ShopHeader from '../components/ShopHeader'
import CategoryNav from '../components/CategoryNav'
import SideCartDrawer from '../components/SideCartDrawer'
import ShopFooter from '../components/ShopFooter'

export default function ShopShell() {
  const [categories, setCategories] = useState([])
  const [sideCartOpen, setSideCartOpen] = useState(false)

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    const handleOpenCart = () => setSideCartOpen(true)
    window.addEventListener('invi-cart-open', handleOpenCart)
    return () => window.removeEventListener('invi-cart-open', handleOpenCart)
  }, [])

  return (
    <div className="shop-ui min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased">
      {/* Top Banner */}
      <ShopTopBar />

      {/* Sticky Header */}
      <header className="sticky top-0 z-[1000] shadow-sm">
        <ShopHeader onOpenCart={() => setSideCartOpen(true)} />
        <CategoryNav dbCategories={categories} />
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <Outlet context={{ onOpenCart: () => setSideCartOpen(true) }} />
      </div>

      {/* Side Cart Drawer */}
      <SideCartDrawer isOpen={sideCartOpen} onClose={() => setSideCartOpen(false)} />

      {/* Footer with Trust Pillars */}
      <ShopFooter />
    </div>
  )
}
