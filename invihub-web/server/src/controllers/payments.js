import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { PaymentService } from '../lib/payments/index.js'
import { fulfillPaidOrder } from '../lib/fulfill.js'
import { optionalCustomer } from '../lib/auth.js'
import { mockPaymentsAllowed, orderPlacedByRequest } from '../lib/security.js'

export const paymentsRouter = Router()

paymentsRouter.post('/create', optionalCustomer, async (req, res) => {
  const { orderId } = req.body || {}
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (!orderPlacedByRequest(req, order)) return res.status(403).json({ error: 'Forbidden' })
  if (order.paymentStatus === 'PAID') {
    return res.json({ orderId: order.id, orderNumber: order.orderNumber, alreadyPaid: true })
  }
  const pay = await PaymentService.createOrder({ order })
  if (!order.payments.length) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: pay.provider,
        method: pay.client?.mode === 'mock' ? 'TEST' : 'RAZORPAY',
        status: pay.status === 'FAILED' ? 'FAILED' : 'PENDING',
        amount: order.total,
        gatewayOrderId: pay.gatewayOrderId || '',
        rawJson: JSON.stringify(pay.client || {}),
      },
    })
  }
  if (pay.status === 'FAILED') return res.status(402).json({ error: 'Payment failed (TEST)', orderId: order.id })
  res.json({ orderId: order.id, orderNumber: order.orderNumber, payment: pay.client })
})

paymentsRouter.post('/webhook', async (req, res) => {
  if (mockPaymentsAllowed() || process.env.PAYMENT_MODE !== 'live') {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }
  const raw = req.rawBody || ''
  const sig = req.headers['x-razorpay-signature'] || ''
  if (!raw || !PaymentService.verifyWebhook(raw, sig)) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }
  const orderId = req.body?.orderId || req.body?.payload?.payment?.entity?.notes?.orderId
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' })
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true, customer: true },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  const paymentId = req.body?.payload?.payment?.entity?.id || `rzp_${order.id}`
  const fulfilled = await fulfillPaidOrder(order, null, null, {
    status: 'SUCCESSFUL',
    gatewayPaymentId: paymentId,
    method: 'RAZORPAY',
  })
  res.json(fulfilled)
})
