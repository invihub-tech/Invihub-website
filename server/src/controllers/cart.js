import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { getOrCreateCart, serializeCart } from '../lib/serialize.js'
import { computeCartTotals } from '../lib/money.js'
import { getSettings } from '../lib/settings.js'
import { intersectPaymentMethods } from '../lib/payments/methods.js'

export const cartRouter = Router()

async function cartPayload(req, res) {
  const cart = await getOrCreateCart(req, res)
  const settings = await getSettings()
  const totals = await computeCartTotals(cart.items, settings)
  const count = cart.items.reduce((s, i) => s + i.quantity, 0)
  const allowedPaymentMethods = intersectPaymentMethods(cart.items.map((i) => i.product))
  return { cart: serializeCart(cart), totals, count, allowedPaymentMethods }
}

cartRouter.get('/', async (req, res) => {
  res.json(await cartPayload(req, res))
})

cartRouter.post('/', async (req, res) => {
  const { productId, quantity = 1 } = req.body || {}
  const cart = await getOrCreateCart(req, res)
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product || product.status !== 'ACTIVE') return res.status(404).json({ error: 'Product not found' })
  const qty = Math.max(1, Number(quantity) || 1)
  if (product.stock < qty && !product.allowBackorders) return res.status(400).json({ error: 'Insufficient stock' })
  const existing = cart.items.find((i) => i.productId === productId)
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + qty } })
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity: qty } })
  }
  res.json(await cartPayload(req, res))
})

cartRouter.put('/:id', async (req, res) => {
  const cart = await getOrCreateCart(req, res)
  const item = cart.items.find((i) => i.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const quantity = Math.max(0, Number(req.body.quantity) || 0)
  if (quantity === 0) await prisma.cartItem.delete({ where: { id: item.id } })
  else await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } })
  res.json(await cartPayload(req, res))
})

cartRouter.delete('/:id', async (req, res) => {
  const cart = await getOrCreateCart(req, res)
  const item = cart.items.find((i) => i.id === req.params.id)
  if (item) await prisma.cartItem.delete({ where: { id: item.id } })
  res.json(await cartPayload(req, res))
})
