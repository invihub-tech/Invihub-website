import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import {
  hashPassword,
  verifyPassword,
  signCustomer,
  setCustomerCookie,
  requireCustomer,
  optionalCustomer,
} from '../lib/auth.js'
import { getOrCreateCart } from '../lib/serialize.js'
import { serializeProduct } from '../lib/serialize.js'

export const customersRouter = Router()

function publicCustomer(c) {
  if (!c) return null
  return { id: c.id, name: c.name, email: c.email, phone: c.phone, registered: Boolean(c.passwordHash) }
}

async function attachCart(req, res, customerId) {
  const cart = await getOrCreateCart(req, res)
  await prisma.cart.update({ where: { id: cart.id }, data: { customerId } })
}

customersRouter.post('/register', optionalCustomer, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const phone = String(req.body?.phone || '').trim()
  const password = String(req.body?.password || '')
  if (name.length < 2 || !email.includes('@') || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and password (6+ chars) are required' })
  }
  let customer = await prisma.customer.findUnique({ where: { email } })
  if (customer?.passwordHash) return res.status(409).json({ error: 'An account already exists for this email' })
  const passwordHash = await hashPassword(password)
  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name, phone: phone || customer.phone, passwordHash },
    })
  } else {
    customer = await prisma.customer.create({ data: { email, name, phone, passwordHash } })
  }
  const token = signCustomer(customer)
  setCustomerCookie(res, token)
  await attachCart(req, res, customer.id)
  res.json({ customer: publicCustomer(customer) })
})

customersRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const customer = await prisma.customer.findUnique({ where: { email } })
  if (!customer?.passwordHash || !(await verifyPassword(password, customer.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = signCustomer(customer)
  setCustomerCookie(res, token)
  await attachCart(req, res, customer.id)
  res.json({ customer: publicCustomer(customer) })
})

customersRouter.post('/logout', (_req, res) => {
  res.clearCookie('customer_token', { path: '/' })
  res.json({ ok: true })
})

customersRouter.get('/me', requireCustomer, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.customer.sub },
    include: { addresses: true, orders: { orderBy: { createdAt: 'desc' }, include: { items: true }, take: 50 } },
  })
  if (!customer) return res.status(404).json({ error: 'Not found' })
  res.json({
    customer: publicCustomer(customer),
    addresses: customer.addresses,
    orders: customer.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
      items: o.items,
    })),
  })
})

customersRouter.put('/me', requireCustomer, async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const phone = String(req.body?.phone || '').trim()
  const customer = await prisma.customer.update({
    where: { id: req.customer.sub },
    data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
  })
  res.json({ customer: publicCustomer(customer) })
})

customersRouter.post('/addresses', requireCustomer, async (req, res) => {
  const { line1, line2 = '', city, state, pinCode, isDefault = false } = req.body || {}
  if (!line1 || !city || !state || !pinCode) return res.status(400).json({ error: 'Address fields required' })
  if (isDefault) {
    await prisma.address.updateMany({ where: { customerId: req.customer.sub }, data: { isDefault: false } })
  }
  const row = await prisma.address.create({
    data: { customerId: req.customer.sub, line1, line2, city, state, pinCode, isDefault: Boolean(isDefault) },
  })
  res.json(row)
})

customersRouter.delete('/addresses/:id', requireCustomer, async (req, res) => {
  await prisma.address.deleteMany({ where: { id: req.params.id, customerId: req.customer.sub } })
  res.json({ ok: true })
})

customersRouter.get('/wishlist', requireCustomer, async (req, res) => {
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId: req.customer.sub },
    include: { product: { include: { images: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map((r) => ({ id: r.id, product: serializeProduct(r.product) })))
})

customersRouter.post('/wishlist', requireCustomer, async (req, res) => {
  const productId = req.body?.productId
  if (!productId) return res.status(400).json({ error: 'productId required' })
  const row = await prisma.wishlistItem.upsert({
    where: { customerId_productId: { customerId: req.customer.sub, productId } },
    update: {},
    create: { customerId: req.customer.sub, productId },
  })
  res.json(row)
})

customersRouter.delete('/wishlist/:productId', requireCustomer, async (req, res) => {
  await prisma.wishlistItem.deleteMany({ where: { customerId: req.customer.sub, productId: req.params.productId } })
  res.json({ ok: true })
})
