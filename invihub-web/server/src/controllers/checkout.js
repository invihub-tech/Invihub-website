import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getOrCreateCart } from '../lib/serialize.js'
import { computeCartTotals, round2 } from '../lib/money.js'
import { getSettings } from '../lib/settings.js'
import { PaymentService } from '../lib/payments/index.js'
import { fulfillPaidOrder, reserveOrderStock } from '../lib/fulfill.js'
import { optionalCustomer } from '../lib/auth.js'
import { intersectPaymentMethods, ONLINE_METHODS } from '../lib/payments/methods.js'
import { hashCheckoutToken, mockPaymentsAllowed, orderPlacedByRequest } from '../lib/security.js'

export const checkoutRouter = Router()

function nextOrderNumber() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const r = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `INV-${y}${m}${day}-${r}`
}

const checkoutSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  line1: z.string().min(3),
  line2: z.string().optional().default(''),
  city: z.string().min(2),
  state: z.string().min(2),
  pinCode: z.string().min(4),
  billingSame: z.boolean().optional().default(true),
  paymentMethod: z.enum(['RAZORPAY', 'UPI', 'COD', 'BANK']),
})

checkoutRouter.post('/', optionalCustomer, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid checkout data' })
  const cart = await getOrCreateCart(req, res)
  if (!cart.items.length) return res.status(400).json({ error: 'Cart is empty' })
  for (const item of cart.items) {
    if (item.product.stock < item.quantity && !item.product.allowBackorders) {
      return res.status(400).json({ error: `${item.product.name} is out of stock` })
    }
  }
  const allowed = intersectPaymentMethods(cart.items.map((i) => i.product))
  if (!allowed.includes(parsed.data.paymentMethod)) {
    return res.status(400).json({ error: allowed.length ? 'That payment method is not available for items in this cart' : 'No shared payment method for these products' })
  }

  const settings = await getSettings()
  const totals = await computeCartTotals(cart.items, settings)
  let customer = req.customer?.sub
    ? await prisma.customer.findUnique({ where: { id: req.customer.sub } })
    : await prisma.customer.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        phone: parsed.data.phone,
      },
    })
  } else if (!req.customer?.sub) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: parsed.data.name, phone: parsed.data.phone || customer.phone },
    })
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: nextOrderNumber(),
      customerId: customer.id,
      ...totals,
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
      checkoutTokenHash: hashCheckoutToken(req._cartToken || req.cookies?.cart_token || ''),
      shippingName: parsed.data.name,
      shippingEmail: parsed.data.email,
      shippingPhone: parsed.data.phone,
      shippingLine1: parsed.data.line1,
      shippingLine2: parsed.data.line2 || '',
      shippingCity: parsed.data.city,
      shippingState: parsed.data.state,
      shippingPin: parsed.data.pinCode,
      items: {
        create: cart.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitPrice: i.product.price,
          lineTotal: round2(i.product.price * i.quantity),
        })),
      },
    },
    include: { items: true },
  })

  const method = parsed.data.paymentMethod
  const online = ONLINE_METHODS.has(method)
  const pay = online
    ? await PaymentService.createOrder({ order })
    : { provider: method === 'COD' ? 'cod' : 'bank', status: 'CREATED', gatewayOrderId: '', client: { mode: method.toLowerCase() } }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      gateway: pay.provider,
      method,
      status: pay.status === 'FAILED' ? 'FAILED' : 'PENDING',
      amount: order.total,
      gatewayOrderId: pay.gatewayOrderId || '',
      rawJson: JSON.stringify(pay.client || {}),
    },
  })

  if (pay.status === 'FAILED') {
    return res.status(402).json({ error: 'Payment failed (TEST)', orderId: order.id })
  }

  await reserveOrderStock(order)
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })

  res.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    totals,
    payment: pay.client,
    paymentMethod: method,
    requiresOnlineConfirm: online,
  })
})

checkoutRouter.post('/confirm', optionalCustomer, async (req, res) => {
  const { orderId } = req.body || {}
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true, customer: true },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (!orderPlacedByRequest(req, order)) return res.status(403).json({ error: 'Forbidden' })
  if (order.paymentStatus === 'PAID') return res.json({ orderNumber: order.orderNumber, alreadyPaid: true })
  const method = order.payments?.[0]?.method
  if (!ONLINE_METHODS.has(method)) {
    return res.status(400).json({ error: 'This order does not require online confirmation' })
  }
  if (!mockPaymentsAllowed()) return res.status(503).json({ error: 'Online confirm is only available in mock mode' })

  const result = await PaymentService.confirm({ order })
  if (result.status !== 'SUCCESSFUL') return res.status(402).json({ error: 'Payment not successful' })

  const fulfilled = await fulfillPaidOrder(order, req, res, result)
  res.json(fulfilled)
})

checkoutRouter.get('/orders/:id', optionalCustomer, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
    include: { items: true, payments: true },
  })
  if (!order) return res.status(404).json({ error: 'Not found' })
  if (!orderPlacedByRequest(req, order)) return res.status(403).json({ error: 'Forbidden' })
  res.json(order)
})
