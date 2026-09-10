import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { requireAdmin, signAdmin, verifyPassword, assertLoginAllowed, recordLoginFailure, clearLoginFailures } from '../lib/auth.js'
import { saveProductImage, deleteProductImageFile } from '../lib/storage.js'
import { serializeProduct } from '../lib/serialize.js'
import { saveSettings, getSettings } from '../lib/settings.js'
import { ALL_PAYMENT_METHODS } from '../lib/payments/methods.js'
import { cookieOpts } from '../lib/security.js'
import { isDbUnreachable } from '../lib/errors.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
export const adminRouter = Router()

adminRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  try {
    assertLoginAllowed(req, email)
  } catch (err) {
    return res.status(err.status || 429).json({ error: err.message })
  }
  try {
    const admin = await prisma.admin.findUnique({ where: { email: String(email || '').toLowerCase() } })
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      recordLoginFailure(req, email)
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    clearLoginFailures(req, email)
    const token = signAdmin(admin)
    res.cookie('admin_token', token, cookieOpts(7 * 24 * 60 * 60 * 1000))
    res.json({ admin: { id: admin.id, email: admin.email, name: admin.name } })
  } catch (err) {
    console.error(err)
    const unreachable = isDbUnreachable(err)
    return res.status(unreachable ? 503 : 500).json({
      error: unreachable ? 'Database is unreachable. Retry in a moment.' : 'Server error',
    })
  }
})

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie('admin_token', { path: '/' })
  res.json({ ok: true })
})

adminRouter.use(requireAdmin)

adminRouter.get('/me', async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.sub } })
  res.json({ id: admin.id, email: admin.email, name: admin.name })
})

adminRouter.get('/dashboard', async (_req, res) => {
  try {
  const [products, orders, customers, paid] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.order.findMany({ where: { paymentStatus: 'PAID' } }),
  ])
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const recent = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { customer: true } })
  const low = await prisma.product.findMany({
    where: { status: { not: 'ARCHIVED' } },
  })
  const lowStock = low.filter((p) => p.stock <= p.lowStockThreshold).slice(0, 8)
  const salesByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const total = paid
      .filter((o) => {
        const t = new Date(o.createdAt)
        return t >= d && t < next
      })
      .reduce((s, o) => s + o.total, 0)
    return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total }
  })
  res.json({
    products,
    orders,
    customers,
    revenue,
    recent,
    salesByDay,
    lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.lowStockThreshold })),
  })
  } catch (err) {
    console.error(err)
    const unreachable = isDbUnreachable(err)
    return res.status(unreachable ? 503 : 500).json({
      error: unreachable ? 'Database is unreachable. Retry in a moment.' : 'Server error',
    })
  }
})

adminRouter.get('/categories', async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } }, products: { select: { id: true, name: true, sku: true, status: true } } },
  })
  res.json(
    rows.map((c) => ({
      ...c,
      productCount: c._count.products,
    })),
  )
})

adminRouter.post('/categories', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (name.length < 2) return res.status(400).json({ error: 'Category name is required' })
  const { slug, description = '', imageUrl = '', sortOrder = 0, status = 'ACTIVE', isFeatured = false } = req.body
  const nextSlug = String(slug || name).trim().toLowerCase().replace(/\s+/g, '-')
  if (!nextSlug) return res.status(400).json({ error: 'Category slug is required' })
  const row = await prisma.category.create({
    data: {
      name,
      slug: nextSlug,
      description,
      imageUrl,
      sortOrder: Number(sortOrder) || 0,
      status,
      isFeatured: Boolean(isFeatured),
    },
  })
  res.json(row)
})

adminRouter.put('/categories/reorder', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
  await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })))
  res.json({ ok: true })
})

adminRouter.put('/categories/:id', async (req, res) => {
  const { name, slug, description, imageUrl, status, isFeatured, sortOrder } = req.body || {}
  if (name != null && !String(name).trim()) return res.status(400).json({ error: 'Category name is required' })
  const row = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(name != null ? { name: String(name).trim() } : {}),
      ...(slug != null ? { slug: String(slug).trim() } : {}),
      ...(description != null ? { description } : {}),
      ...(imageUrl != null ? { imageUrl } : {}),
      ...(status != null ? { status } : {}),
      ...(isFeatured != null ? { isFeatured: Boolean(isFeatured) } : {}),
      ...(sortOrder != null ? { sortOrder: Number(sortOrder) } : {}),
    },
  })
  res.json(row)
})

adminRouter.post('/categories/:id/archive', async (req, res) => {
  const row = await prisma.category.update({ where: { id: req.params.id }, data: { status: 'ARCHIVED' } })
  res.json(row)
})

adminRouter.post('/categories/:id/restore', async (req, res) => {
  const row = await prisma.category.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } })
  res.json(row)
})

adminRouter.post('/categories/:id/assign', async (req, res) => {
  const productId = req.body?.productId
  if (!productId) return res.status(400).json({ error: 'productId required' })
  const product = await prisma.product.update({ where: { id: productId }, data: { categoryId: req.params.id } })
  res.json(product)
})

adminRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const url = await saveProductImage(req.file)
    res.json({ url })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message })
  }
})

adminRouter.delete('/upload', async (req, res) => {
  await deleteProductImageFile(req.body?.url)
  res.json({ ok: true })
})

adminRouter.get('/products', async (_req, res) => {
  const rows = await prisma.product.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { images: true, category: true, specifications: true },
  })
  res.json(rows.map(serializeProduct))
})

function productData(body) {
  return {
    name: body.name,
    slug: body.slug,
    sku: body.sku,
    categoryId: body.categoryId,
    brand: body.brand || 'INVIHUB',
    shortDescription: body.shortDescription || '',
    description: body.description || '',
    featuresJson: JSON.stringify(body.features || []),
    tagsJson: JSON.stringify(body.tags || []),
    price: Number(body.price),
    mrp: Number(body.mrp || body.price || 0),
    discount: Number(body.discount || 0),
    taxRate: Number(body.taxRate || 18),
    stock: Number(body.stock || 0),
    lowStockThreshold: Number(body.lowStockThreshold || 5),
    allowBackorders: Boolean(body.allowBackorders),
    weight: Number(body.weight || 0),
    length: Number(body.length || 0),
    width: Number(body.width || 0),
    height: Number(body.height || 0),
    status: body.status || 'ACTIVE',
    isFeatured: Boolean(body.isFeatured),
    isNew: Boolean(body.isNew),
    isBestSeller: Boolean(body.isBestSeller),
    paymentMethodsJson: JSON.stringify(body.paymentMethods),
  }
}

function parsedPaymentMethods(body) {
  const allowed = new Set(ALL_PAYMENT_METHODS)
  return [...new Set((Array.isArray(body.paymentMethods) ? body.paymentMethods : []).filter((id) => allowed.has(id)))]
}

adminRouter.post('/products', async (req, res) => {
  const paymentMethods = parsedPaymentMethods(req.body)
  if (!paymentMethods.length) return res.status(400).json({ error: 'Select at least one payment method' })
  const data = productData({ ...req.body, paymentMethods })
  const product = await prisma.product.create({
    data: {
      ...data,
      images: {
        create: (req.body.images || []).map((img, i) => ({
          url: img.url,
          alt: img.alt || data.name,
          sortOrder: i,
          isPrimary: i === 0,
        })),
      },
      specifications: {
        create: (req.body.specifications || []).map((s, i) => ({ name: s.name, value: s.value, sortOrder: i })),
      },
    },
    include: { images: true, category: true, specifications: true },
  })
  res.json(serializeProduct(product))
})

adminRouter.put('/products/:id', async (req, res) => {
  const paymentMethods = parsedPaymentMethods(req.body)
  if (!paymentMethods.length) return res.status(400).json({ error: 'Select at least one payment method' })
  const data = productData({ ...req.body, paymentMethods })
  await prisma.productImage.deleteMany({ where: { productId: req.params.id } })
  await prisma.productSpecification.deleteMany({ where: { productId: req.params.id } })
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...data,
      images: {
        create: (req.body.images || []).map((img, i) => ({
          url: img.url,
          alt: img.alt || data.name,
          sortOrder: i,
          isPrimary: i === 0,
        })),
      },
      specifications: {
        create: (req.body.specifications || []).map((s, i) => ({ name: s.name, value: s.value, sortOrder: i })),
      },
    },
    include: { images: true, category: true, specifications: true },
  })
  res.json(serializeProduct(product))
})

adminRouter.delete('/products/:id/images', async (req, res) => {
  const productId = req.params.id
  const imageId = req.body?.imageId
  const url = String(req.body?.url || '')
  const row = await prisma.productImage.findFirst({
    where: imageId ? { id: String(imageId), productId } : { productId, url },
  })
  if (row) {
    await prisma.productImage.delete({ where: { id: row.id } })
    await deleteProductImageFile(row.url)
  } else if (url) {
    await deleteProductImageFile(url)
  }
  res.json({ ok: true })
})

adminRouter.post('/products/:id/archive', async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { status: 'ARCHIVED' } })
  res.json(product)
})

adminRouter.post('/products/:id/restore', async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } })
  res.json(product)
})

adminRouter.post('/products/:id/duplicate', async (req, res) => {
  const src = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { images: true, specifications: true },
  })
  if (!src) return res.status(404).json({ error: 'Not found' })
  const copy = await prisma.product.create({
    data: {
      name: `${src.name} (copy)`,
      slug: `${src.slug}-copy-${Date.now().toString(36)}`,
      sku: `${src.sku}-COPY`,
      categoryId: src.categoryId,
      brand: src.brand,
      shortDescription: src.shortDescription,
      description: src.description,
      featuresJson: src.featuresJson,
      tagsJson: src.tagsJson,
      paymentMethodsJson: src.paymentMethodsJson,
      price: src.price,
      mrp: src.mrp,
      discount: src.discount,
      taxRate: src.taxRate,
      stock: src.stock,
      lowStockThreshold: src.lowStockThreshold,
      status: 'INACTIVE',
      images: { create: src.images.map((i) => ({ url: i.url, alt: i.alt, sortOrder: i.sortOrder, isPrimary: i.isPrimary })) },
      specifications: { create: src.specifications.map((s) => ({ name: s.name, value: s.value, sortOrder: s.sortOrder })) },
    },
    include: { images: true, category: true, specifications: true },
  })
  res.json(serializeProduct(copy))
})

adminRouter.get('/orders', async (req, res) => {
  const where = {}
  if (req.query.status) where.orderStatus = String(req.query.status)
  const rows = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { customer: true, items: true, payments: true },
  })
  res.json(rows)
})

adminRouter.get('/orders/:id', async (req, res) => {
  const row = await prisma.order.findFirst({
    where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] },
    include: { customer: true, items: true, payments: true },
  })
  if (!row) return res.status(404).json({ error: 'Not found' })
  const { passwordHash, ...customer } = row.customer || {}
  res.json({
    ...row,
    accountType: passwordHash ? 'Registered' : 'Guest',
    customer: row.customer
      ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, registered: Boolean(passwordHash) }
      : null,
  })
})

adminRouter.put('/orders/:id', async (req, res) => {
  const allowed = new Set(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  const orderStatus = String(req.body?.orderStatus || '')
  if (!allowed.has(orderStatus)) return res.status(400).json({ error: 'Invalid order status' })
  const row = await prisma.order.update({
    where: { id: req.params.id },
    data: { orderStatus },
  })
  res.json(row)
})

adminRouter.get('/inventory', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const filter = String(req.query.filter || 'all')
  const products = await prisma.product.findMany({ where: { status: { not: 'ARCHIVED' } }, orderBy: { name: 'asc' } })
  const rows = products.map((p) => {
    const health = p.stock <= 0 ? 'Out' : p.stock <= p.lowStockThreshold ? 'Low' : 'Healthy'
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
      threshold: p.lowStockThreshold,
      status: health,
    }
  })
  let list = rows
  if (q) list = list.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q))
  if (filter === 'low') list = list.filter((p) => p.status === 'Low')
  if (filter === 'out') list = list.filter((p) => p.status === 'Out')
  if (filter === 'healthy') list = list.filter((p) => p.status === 'Healthy')
  const kpis = {
    totalUnits: rows.reduce((s, p) => s + p.stock, 0),
    lowCount: rows.filter((p) => p.status === 'Low').length,
    outCount: rows.filter((p) => p.status === 'Out').length,
    stockValue: rows.reduce((s, p) => s + p.stock * p.price, 0),
  }
  res.json({ kpis, products: list })
})

adminRouter.get('/inventory/:id/history', async (req, res) => {
  const moves = await prisma.inventoryMovement.findMany({
    where: { productId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(moves)
})

adminRouter.post('/inventory/:id', async (req, res) => {
  const delta = Number(req.body.delta)
  if (!delta) return res.status(400).json({ error: 'Quantity required' })
  const reason = String(req.body.reason || 'Manual adjustment')
  const notes = String(req.body.notes || '')
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.sub } })
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { stock: { increment: delta } },
  })
  await prisma.inventoryMovement.create({
    data: { productId: product.id, delta, reason, notes, adminName: admin?.name || admin?.email || 'Admin' },
  })
  res.json(product)
})

adminRouter.get('/payments', async (_req, res) => {
  res.json(await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, include: { order: { include: { customer: true } } } }))
})

adminRouter.get('/settings', async (_req, res) => {
  res.json(await getSettings())
})

adminRouter.put('/settings', async (req, res) => {
  res.json(await saveSettings(req.body))
})
