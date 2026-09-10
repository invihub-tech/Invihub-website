import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { serializeProduct } from '../lib/serialize.js'

export const publicRouter = Router()

function activeProductQuery(extra = {}) {
  return { status: 'ACTIVE', ...extra }
}

publicRouter.get('/categories', async (_req, res) => {
  const rows = await prisma.category.findMany({
    where: { status: 'ACTIVE', NOT: { name: '' } },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
  })
  res.json(
    rows
      .filter((c) => c.name.trim() && c.slug.trim())
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      })),
  )
})

publicRouter.get('/products', async (req, res) => {
  const { category, minPrice, maxPrice, stock, sort, featured, isNew, q } = req.query
  const where = activeProductQuery()
  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: String(category) } })
    if (cat) where.categoryId = cat.id
    else where.categoryId = '__none__'
  }
  if (minPrice) where.price = { ...(where.price || {}), gte: Number(minPrice) }
  if (maxPrice) where.price = { ...(where.price || {}), lte: Number(maxPrice) }
  if (stock === 'in') where.stock = { gt: 0 }
  if (stock === 'out') where.stock = { lte: 0 }
  if (featured === '1') where.isFeatured = true
  if (isNew === '1') where.isNew = true
  if (q) {
    const term = String(q)
    where.OR = [
      { name: { contains: term } },
      { sku: { contains: term } },
      { shortDescription: { contains: term } },
      { description: { contains: term } },
      { tagsJson: { contains: term } },
    ]
  }

  let orderBy = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { price: 'asc' }
  if (sort === 'price_desc') orderBy = { price: 'desc' }
  if (sort === 'newest') orderBy = { createdAt: 'desc' }
  if (sort === 'featured') orderBy = { isFeatured: 'desc' }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: { images: true, category: true, specifications: true, orderItems: true },
  })

  let list = products.map((p) => {
    const sold = p.orderItems.reduce((s, i) => s + i.quantity, 0)
    return { ...serializeProduct(p), sold }
  })
  if (sort === 'best') list = list.sort((a, b) => b.sold - a.sold)
  res.json(list)
})

publicRouter.get('/products/:slug', async (req, res) => {
  const p = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { images: true, category: true, specifications: true },
  })
  if (!p || p.status !== 'ACTIVE') return res.status(404).json({ error: 'Not found' })
  const related = await prisma.product.findMany({
    where: { status: 'ACTIVE', categoryId: p.categoryId, NOT: { id: p.id } },
    take: 3,
    include: { images: true, category: true, specifications: true },
  })
  res.json({ product: serializeProduct(p), related: related.map(serializeProduct) })
})

publicRouter.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.json([])
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: q } },
        { sku: { contains: q } },
        { shortDescription: { contains: q } },
        { description: { contains: q } },
        { tagsJson: { contains: q } },
        { category: { name: { contains: q } } },
      ],
    },
    include: { images: true, category: true, specifications: true },
    take: 24,
  })
  res.json(products.map(serializeProduct))
})

publicRouter.get('/settings', async (_req, res) => {
  const { getSettings } = await import('../lib/settings.js')
  res.json(await getSettings())
})
