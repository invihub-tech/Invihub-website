import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { api, inr } from '../../../models/api'

const FREE_SHIPPING_THRESHOLD = 999

export default function SideCartDrawer({ isOpen, onClose }) {
  const [cartData, setCartData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const navigate = useNavigate()

  const refreshCart = async () => {
    setLoading(true)
    try {
      const data = await api.cart()
      setCartData(data)
    } catch {
      setCartData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      refreshCart()
    }
  }, [isOpen])

  useEffect(() => {
    const handleCartEvent = () => {
      if (isOpen) refreshCart()
    }
    window.addEventListener('invi-cart', handleCartEvent)
    return () => window.removeEventListener('invi-cart', handleCartEvent)
  }, [isOpen])

  const handleUpdate = async (itemId, quantity) => {
    setUpdatingId(itemId)
    try {
      if (quantity <= 0) {
        await api.removeCart(itemId)
      } else {
        await api.updateCart(itemId, quantity)
      }
      window.dispatchEvent(new Event('invi-cart'))
      await refreshCart()
    } catch {
      /* ignore */
    } finally {
      setUpdatingId(null)
    }
  }

  const items = cartData?.cart?.items || []
  const subtotal = cartData?.totals?.subtotal || items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0)
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#f97316]" />
            <h2 className="text-base font-bold text-slate-900">Your Shopping Cart</h2>
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
              {cartData?.count || items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close cart drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="px-6 py-3 bg-orange-50/60 border-b border-orange-100 text-xs text-slate-700">
          <div className="flex items-center justify-between mb-1.5 font-medium">
            <span className="flex items-center gap-1.5 text-slate-800">
              <Truck size={14} className="text-[#f97316]" />
              {amountToFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-[#f97316]">{inr(amountToFreeShipping)}</strong> more for <strong>FREE Delivery</strong>
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">You qualify for FREE Delivery!</span>
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">{shippingProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                shippingProgress >= 100 ? 'bg-emerald-500' : 'bg-[#f97316]'
              }`}
              style={{ width: `${shippingProgress}%` }}
            />
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <ShoppingBag size={28} />
              </div>
              <p className="text-base font-semibold text-slate-800">Your cart is empty</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Explore our precision 3D printers, engineering filaments, and electronics components.
              </p>
              <button
                onClick={() => {
                  onClose()
                  navigate('/shop/products')
                }}
                className="btn-shop-primary mt-6 text-xs"
              >
                Start Shopping →
              </button>
            </div>
          ) : (
            items.map((item) => {
              const product = item.product || {}
              const imgUrl = product.images?.[0]?.url || item.imageUrl
              const isUpdating = updatingId === item.id

              return (
                <div key={item.id} className="pt-4 first:pt-0 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No img</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/shop/product/${product.slug || item.productId}`}
                      onClick={onClose}
                      className="text-xs font-semibold text-slate-900 hover:text-[#f97316] line-clamp-1 transition-colors"
                    >
                      {item.name}
                    </Link>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {product.brand || 'INVIHUB'}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-200 rounded">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdate(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 py-1 text-xs font-bold text-slate-800 min-w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdate(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900">{inr(item.lineTotal || item.unitPrice * item.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdate(item.id, 0)}
                          className="block ml-auto text-[11px] text-slate-400 hover:text-red-500 transition-colors mt-0.5"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer with Subtotal & Actions */}
        {items.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Subtotal</span>
              <span className="text-base font-bold text-slate-900">{inr(subtotal)}</span>
            </div>
            <p className="text-[11px] text-slate-500">Taxes calculated during checkout. Free delivery above ₹999.</p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to="/shop/cart"
                onClick={onClose}
                className="btn-shop-outline text-center text-xs justify-center py-2.5"
              >
                View Full Cart
              </Link>
              <Link
                to="/shop/checkout"
                onClick={onClose}
                className="btn-shop-primary text-center text-xs justify-center py-2.5 gap-1.5"
              >
                <span>Checkout</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
