import './src/lib/env.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'invihub-admin', 10)
  await prisma.admin.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@invihub.com' },
    update: { passwordHash, name: 'INVIHUB Admin' },
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@invihub.com',
      passwordHash,
      name: 'INVIHUB Admin',
    },
  })

  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      json: JSON.stringify({
        storeName: 'INVIHUB Shop',
        email: 'invihub@gmail.com',
        phone: '7022149521',
        shippingCharge: 100,
        freeShippingThreshold: 5000,
        taxRate: 18,
        estimatedDeliveryDaysMin: 5,
        estimatedDeliveryDaysMax: 10,
      }),
    },
  })

  const cats = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic products and systems developed by INVIHUB.', sortOrder: 1, imageUrl: '/images/work-electronics.png' },
    { name: 'Robotics', slug: 'robotics', description: 'Robotic kits and motion systems.', sortOrder: 2, imageUrl: '/images/service-automation.png' },
    { name: 'Educational Kits', slug: 'educational-kits', description: 'Hands-on kits for learning and prototyping.', sortOrder: 3, imageUrl: '/images/process-innovate.png' },
    { name: 'Engineering Products', slug: 'engineering-products', description: 'Engineered products built for real-world use.', sortOrder: 4, imageUrl: '/images/hero-product.png' },
  ]
  const catRows = {}
  for (const c of cats) {
    catRows[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    })
  }

  const products = [
    {
      name: 'INVI E-BOX',
      slug: 'invi-e-box',
      sku: 'INV-EB-001',
      categoryId: catRows['engineering-products'].id,
      shortDescription: 'Extension box with increased capacity and surge-safe utility for up to 15 two-pin plugs.',
      description: 'The INVI E-BOX is a compact, patent-approved junction box designed for high-density plug access with surge protection for everyday devices.',
      featuresJson: JSON.stringify(['Increased capacity', 'Efficient design', 'Multiple configurations', 'Compact construction']),
      tagsJson: JSON.stringify(['ebox', 'power', 'engineering']),
      paymentMethodsJson: JSON.stringify(['RAZORPAY', 'UPI', 'COD', 'BANK']),
      price: 2499,
      mrp: 2999,
      stock: 25,
      isFeatured: true,
      isNew: true,
      isBestSeller: true,
      specs: [
        { name: 'Material', value: 'ABS' },
        { name: 'Input', value: '230V' },
        { name: 'Plug capacity', value: 'Up to 15 × 2-pin' },
        { name: 'Dimensions', value: 'Compact stackable' },
      ],
    },
    {
      name: '6 DOF Robotic Arm',
      slug: '6-dof-robotic-arm',
      sku: 'INV-RA-006',
      categoryId: catRows.robotics.id,
      shortDescription: 'Education DIY robotic arm kit with 6 degrees of freedom.',
      description: 'A six-axis educational robotic arm kit for learning kinematics, control, and mechatronics assembly.',
      featuresJson: JSON.stringify(['6 degrees of freedom', 'DIY assembly', 'Education ready']),
      tagsJson: JSON.stringify(['robotic', 'arm', 'diy', 'kit']),
      paymentMethodsJson: JSON.stringify(['RAZORPAY', 'UPI', 'COD', 'BANK']),
      price: 8999,
      mrp: 9999,
      stock: 8,
      isFeatured: true,
      isNew: true,
      specs: [
        { name: 'Axes', value: '6 DOF' },
        { name: 'Use', value: 'Education / DIY' },
      ],
    },
    {
      name: 'Prosthetic Hand',
      slug: 'prosthetic-hand',
      sku: 'INV-PH-001',
      categoryId: catRows['educational-kits'].id,
      shortDescription: 'Educational DIY kit that can be interfaced with a microcontroller to control all five fingers individually.',
      description: 'A five-finger prosthetic hand trainer kit for microcontroller-based actuation and sensing experiments.',
      featuresJson: JSON.stringify(['Individual finger control', 'Microcontroller ready', 'Educational kit']),
      tagsJson: JSON.stringify(['prosthetic', 'hand', 'education']),
      paymentMethodsJson: JSON.stringify(['RAZORPAY', 'UPI', 'COD', 'BANK']),
      price: 6499,
      mrp: 7499,
      stock: 3,
      isFeatured: true,
      isNew: false,
      specs: [
        { name: 'Fingers', value: '5' },
        { name: 'Interface', value: 'Microcontroller' },
      ],
    },
  ]

  for (const p of products) {
    const { specs, ...data } = p
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: {
        ...data,
        specifications: { create: specs.map((s, i) => ({ ...s, sortOrder: i })) },
      },
    })
    await prisma.productImage.deleteMany({
      where: { productId: product.id, url: { startsWith: '/images/' } },
    })
  }

  console.log('Seed complete. Admin:', process.env.ADMIN_EMAIL || 'admin@invihub.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
