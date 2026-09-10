import { MockPaymentProvider } from './mock.js'
import { RazorpayProvider } from './razorpay.js'

export function getPaymentProvider() {
  return process.env.PAYMENT_MODE === 'live' ? RazorpayProvider : MockPaymentProvider
}

export const PaymentService = {
  createOrder(args) {
    return getPaymentProvider().createOrder(args)
  },
  confirm(args) {
    return getPaymentProvider().confirm(args)
  },
  verifyWebhook(raw, sig) {
    return getPaymentProvider().verifyWebhook(raw, sig)
  },
}
