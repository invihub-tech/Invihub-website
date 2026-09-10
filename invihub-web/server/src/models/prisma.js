import '../lib/env.js'
import { PrismaClient } from '@prisma/client'

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let last
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await query(args)
          } catch (err) {
            last = err
            const unreachable = err?.code === 'P1001' || /Can't reach database/i.test(String(err?.message || ''))
            if (!unreachable || attempt === 2) throw err
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          }
        }
        throw last
      },
    },
  })
}

export const prisma =
  globalThis.prisma && globalThis.prismaUrl === process.env.DATABASE_URL ? globalThis.prisma : createClient()

globalThis.prisma = prisma
globalThis.prismaUrl = process.env.DATABASE_URL
