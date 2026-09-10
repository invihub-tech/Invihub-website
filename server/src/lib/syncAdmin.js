import { prisma } from './prisma.js'
import { hashPassword } from './auth.js'

export async function syncAdminFromEnv() {
  const email = String(process.env.ADMIN_EMAIL || 'admin@invihub.com').trim().toLowerCase()
  const password = String(process.env.ADMIN_PASSWORD || 'invihub-admin')
  if (!email.includes('@') || password.length < 12) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD in .env look invalid (password must be 12+ characters); skip admin sync')
    return
  }
  const passwordHash = await hashPassword(password)
  const already = await prisma.admin.findUnique({ where: { email } })
  if (already) {
    await prisma.admin.update({ where: { id: already.id }, data: { passwordHash } })
    console.log(`Admin login synced from .env (${email})`)
    return
  }
  const existing = await prisma.admin.findFirst()
  if (existing) {
    await prisma.admin.update({
      where: { id: existing.id },
      data: { email, passwordHash, name: existing.name || 'INVIHUB Admin' },
    })
    console.log(`Admin email updated from .env to ${email}`)
    return
  }
  await prisma.admin.create({
    data: { email, passwordHash, name: 'INVIHUB Admin' },
  })
  console.log(`Admin account created from .env (${email})`)
}
