import { prisma } from '../lib/prisma.js'
import { randomUUID } from 'node:crypto'
import { parsePaymentMethods } from './payments/methods.js'
import { cookieOpts } from './security.js'

export async function getOrCreateCart(req, res) {
  let token = req._cartToken || req.cookies?.cart_token
  if (!token) {
    token = randomUUID()
    res.cookie('cart_token', token, cookieOpts(1000 * 60 * 60 * 24 * 30))
  }
  req._cartToken = token
  let cart = await prisma.cart.findUnique({
    where: { token },
    include: { items: { include: { product: { include: { images: true, category: true } } } } },
  })
  if (!cart) {
    cart = await prisma.cart.create({
      data: { token },
      include: { items: { include: { product: { include: { images: true, category: true } } } } },
    })
  }
  return cart
}

export function serializeCart(cart) {
  return {
    id: cart.id,
    items: cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: serializeProduct(item.product),
    })),
  }
}

export function serializeProduct(p) {
  if (!p) return null
  const images = (p.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    shortDescription: p.shortDescription,
    description: p.description,
    features: JSON.parse(p.featuresJson || '[]'),
    tags: JSON.parse(p.tagsJson || '[]'),
    price: p.price,
    mrp: p.mrp,
    discount: p.discount,
    taxRate: p.taxRate,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    status: p.status,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    paymentMethods: parsePaymentMethods(p.paymentMethodsJson),
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, isPrimary: i.isPrimary })),
    specifications: (p.specifications || []).map((s) => ({ id: s.id, name: s.name, value: s.value })),
    inStock: p.stock > 0,
  }
}
