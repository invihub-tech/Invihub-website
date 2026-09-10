export const MockPaymentProvider = {
  name: 'mock',
  async createOrder({ order }) {
    if (process.env.PAYMENT_MOCK_FAIL === 'true') {
      return { provider: 'mock', status: 'FAILED', client: { mode: 'mock', fail: true } }
    }
    return {
      provider: 'mock',
      status: 'CREATED',
      gatewayOrderId: `mock_${order.id}`,
      client: { mode: 'mock', orderId: order.id, amount: order.total },
    }
  },
  async confirm({ order }) {
    return {
      status: 'SUCCESSFUL',
      gatewayPaymentId: `pay_mock_${order.id}`,
      method: 'TEST',
    }
  },
  verifyWebhook() {
    return false
  },
}
