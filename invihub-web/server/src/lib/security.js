import crypto from 'node:crypto'

const WEAK_JWT = new Set(['', 'dev-secret', 'change-this-dev-secret'])

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

export function mockPaymentsAllowed() {
  if (process.env.PAYMENT_MODE === 'live') return false
  if ((process.env.PAYMENT_MODE || 'mock') !== 'mock') return false
  if (isProduction()) return process.env.ALLOW_MOCK_PAYMENTS === 'true'
  return true
}

export function assertSafeToListen() {
  const secret = String(process.env.JWT_SECRET || '')
  if (!isProduction()) return
  if (WEAK_JWT.has(secret) || secret.length < 24) {
    console.error('Refusing to start: set a strong JWT_SECRET in production (24+ characters)')
    process.exit(1)
  }
  const origins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!origins.length) {
    console.error('Refusing to start: set ALLOWED_ORIGINS to your HTTPS shop origin')
    process.exit(1)
  }
  if (process.env.PAYMENT_MODE === 'live') return
  if ((process.env.PAYMENT_MODE || 'mock') === 'mock' && process.env.ALLOW_MOCK_PAYMENTS === 'true') return
  console.error('Refusing to start: use PAYMENT_MODE=live, or PAYMENT_MODE=mock with ALLOW_MOCK_PAYMENTS=true')
  process.exit(1)
}

export function corsOrigin() {
  const origins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (origins.length) return origins
  return isProduction() ? false : true
}

export function cookieOpts(maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
    secure: isProduction(),
  }
}

export function hashCheckoutToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

export function orderPlacedByRequest(req, order) {
  const cartToken = req._cartToken || req.cookies?.cart_token || ''
  if (order.checkoutTokenHash && hashCheckoutToken(cartToken) === order.checkoutTokenHash) return true
  if (req.customer?.sub && req.customer.sub === order.customerId) return true
  return false
}
