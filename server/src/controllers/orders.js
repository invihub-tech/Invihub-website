import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const ordersRouter = Router()

const lookupAttempts = new Map()

function lookupKey(req) {
  return `${req.ip}|${String(req.body?.email || req.query.email || '').toLowerCase()}`
}

function assertLookupAllowed(req) {
  const k = lookupKey(req)
  const rec = lookupAttempts.get(k)
  if (rec && rec.count >= 8 && Date.now() - rec.first < 15 * 60 * 1000) {
    const err = new Error('Too many lookups. Try again later.')
    err.status = 429
    throw err
  }
}

function recordLookup(req) {
  const k = lookupKey(req)
  const rec = lookupAttempts.get(k) || { count: 0, first: Date.now() }
  if (Date.now() - rec.first > 15 * 60 * 1000) {
    rec.count = 0
    rec.first = Date.now()
  }
  rec.count += 1
  lookupAttempts.set(k, rec)
}

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
  try {
    assertLookupAllowed(req)
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message })
  }
  recordLookup(req)
  const email = String(req.body?.email || '').trim().toLowerCase()
  const orderNumber = String(req.body?.orderNumber || '').trim()
  if (!email.includes('@') || !orderNumber) {
    return res.status(400).json({ error: 'Email and order number are required' })
  }
  const order = await prisma.order.findFirst({
    where: { shippingEmail: email, orderNumber },
    include: { items: true },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(publicOrder(order))
})

ordersRouter.get('/:id', async (req, res) => {
  try {
    assertLookupAllowed(req)
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message })
  }
  recordLookup(req)
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
