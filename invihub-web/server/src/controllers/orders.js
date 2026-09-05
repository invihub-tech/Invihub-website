import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const ordersRouter = Router()

function publicOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    createdAt: order.createdAt,
    shippingName: order.shippingName,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  }
}

ordersRouter.post('/lookup', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!email.includes('@')) return res.status(400).json({ error: 'Enter a valid email' })
  const orders = await prisma.order.findMany({
    where: { shippingEmail: email },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(orders.map(publicOrder))
})

ordersRouter.get('/:id', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase()
  if (!email.includes('@')) return res.status(400).json({ error: 'Email is required' })
  const order = await prisma.order.findFirst({
    where: {
      shippingEmail: email,
      OR: [{ id: req.params.id }, { orderNumber: req.params.id }],
    },
    include: { items: true },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(publicOrder(order))
})
