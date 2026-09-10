import dns from 'node:dns'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Node 17+ prefers IPv6; Supabase pooler AAAA often fails on Windows (Prisma P1001).
dns.setDefaultResultOrder('ipv4first')

/** invihub-web/ — not process.cwd(), which is often the parent repo folder. */
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const result = dotenv.config({ path: path.join(projectRoot, '.env'), override: true })
if (result.error) {
  console.warn(`Could not load .env from ${projectRoot}: ${result.error.message}`)
}

function withPgParams(raw) {
  let url = String(raw)
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
  if (!/^postgres(ql)?:\/\//i.test(url)) return url
  if (!/[?&]sslmode=/i.test(url)) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require'
  }
  if (!/[?&]connect_timeout=/i.test(url)) {
    url += (url.includes('?') ? '&' : '?') + 'connect_timeout=20'
  }
  return url
}

for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  if (process.env[key] == null) continue
  process.env[key] = withPgParams(process.env[key])
}
