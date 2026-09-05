import { prisma } from './prisma.js'

const defaults = {
  storeName: 'INVIHUB Shop',
  email: 'invihub@gmail.com',
  phone: '7022149521',
  shippingCharge: 100,
  freeShippingThreshold: 5000,
  taxRate: 18,
  estimatedDeliveryDaysMin: 5,
  estimatedDeliveryDaysMax: 10,
}

export async function getSettings() {
  const row = await prisma.storeSetting.findUnique({ where: { id: 'default' } })
  if (!row) return defaults
  return { ...defaults, ...JSON.parse(row.json) }
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch }
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', json: JSON.stringify(next) },
    update: { json: JSON.stringify(next) },
  })
  return next
}
