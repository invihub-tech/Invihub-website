import { prisma } from './prisma.js'
import { getOrCreateCart } from './serialize.js'
import { EmailService } from './email.js'
import { getSettings } from './settings.js'

export async function reserveOrderStock(order) {
  if (order.stockReserved) return
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { stockReserved: true } })
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          delta: -item.quantity,
          reason: `Order ${order.orderNumber}`,
          adminName: 'System',
        },
      })
    }
  })
}

export async function fulfillPaidOrder(order, req, res, paymentResult = {}) {
  if (order.paymentStatus === 'PAID') {
    const settings = await getSettings()
    return {
      alreadyPaid: true,
      orderNumber: order.orderNumber,
      estimatedDelivery: {
        min: settings.estimatedDeliveryDaysMin,
        max: settings.estimatedDeliveryDaysMax,
      },
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', orderStatus: 'PROCESSING' },
    })
    await tx.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: 'SUCCESSFUL',
        gatewayPaymentId: paymentResult.gatewayPaymentId || `pay_mock_${order.id}`,
        method: paymentResult.method || order.payments?.[0]?.method || 'TEST',
      },
    })
    if (!order.stockReserved) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            delta: -item.quantity,
            reason: `Order ${order.orderNumber}`,
            adminName: 'System',
          },
        })
      }
      await tx.order.update({ where: { id: order.id }, data: { stockReserved: true } })
    }
  })

  if (req && res) {
    const cart = await getOrCreateCart(req, res)
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }

  await EmailService.send('order_confirmation', { to: order.shippingEmail, orderNumber: order.orderNumber })
  const settings = await getSettings()
  return {
    alreadyPaid: false,
    orderNumber: order.orderNumber,
    payment: 'Successful',
    estimatedDelivery: {
      min: settings.estimatedDeliveryDaysMin,
      max: settings.estimatedDeliveryDaysMax,
    },
  }
}
