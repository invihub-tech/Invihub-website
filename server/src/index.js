import './lib/env.js' // loads invihub-web/.env even if cwd is the parent repo
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { publicRouter } from './routes/public.js'
import { cartRouter } from './routes/cart.js'
import { checkoutRouter } from './routes/checkout.js'
import { paymentsRouter } from './routes/payments.js'
import { ordersRouter } from './routes/orders.js'
import { adminRouter } from './routes/admin.js'
import { customersRouter } from './routes/customers.js'
import { syncAdminFromEnv } from './lib/syncAdmin.js'
import { assertSafeToListen, corsOrigin } from './lib/security.js'
import { apiErrorHandler, maintenanceGuard } from './lib/errors.js'

assertSafeToListen()

const app = express()
app.use(cors({ origin: corsOrigin(), credentials: true }))
app.use(cookieParser())
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl?.startsWith('/api/payments/webhook') || req.url?.startsWith('/api/payments/webhook')) {
        req.rawBody = buf.toString('utf8')
      }
    },
  }),
)

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, maintenance: String(process.env.MAINTENANCE_MODE || '') === 'true' }),
)
app.use('/api', maintenanceGuard)
app.use('/api', publicRouter)
app.use('/api/cart', cartRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/customers', customersRouter)
app.use('/api/admin', adminRouter)

app.use(apiErrorHandler)

const port = Number(process.env.PORT || process.env.API_PORT || 8787)
await syncAdminFromEnv()
app.listen(port, () => {
  console.log(`INVIHUB API http://localhost:${port}`)
})

