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

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))

app.use('/api', publicRouter)
app.use('/api/cart', cartRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/customers', customersRouter)
app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const port = Number(process.env.API_PORT || 8787)
await syncAdminFromEnv()
app.listen(port, () => {
  console.log(`INVIHUB API http://localhost:${port}`)
})

