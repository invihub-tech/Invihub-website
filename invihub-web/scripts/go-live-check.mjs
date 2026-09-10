/**
 * Prints which go-live env vars are set. Does not print secret values.
 * Usage: node scripts/go-live-check.mjs
 */
import '../server/src/lib/env.js'

const present = (k) => {
  const v = String(process.env[k] || '').trim()
  return v.length > 0 && !v.startsWith('file:')
}

const rows = [
  ['DATABASE_URL', present('DATABASE_URL') && process.env.DATABASE_URL.startsWith('postgresql'), 'Postgres URI (pooler 6543)'],
  ['DIRECT_URL', present('DIRECT_URL') && String(process.env.DIRECT_URL).startsWith('postgresql'), 'Postgres URI (direct 5432)'],
  ['JWT_SECRET', String(process.env.JWT_SECRET || '').length >= 24 && process.env.JWT_SECRET !== 'change-this-dev-secret', '24+ chars, not the demo secret'],
  ['ADMIN_PASSWORD', String(process.env.ADMIN_PASSWORD || '').length >= 12, '12+ characters'],
  ['ALLOWED_ORIGINS', String(process.env.ALLOWED_ORIGINS || '').includes('http'), 'localhost for dev; https://your-domain in production'],
  ['VITE_ADMIN_PATH_KEY', Boolean(process.env.VITE_ADMIN_PATH_KEY || process.env.ADMIN_PATH_KEY), 'Must match ADMIN_PATH_KEY at build time'],
]

let ok = true
console.log('Go-live check (values hidden)\n')
for (const [key, pass, hint] of rows) {
  console.log(`${pass ? 'OK   ' : 'NEED '} ${key} — ${hint}`)
  if (!pass) ok = false
}
console.log('')
if (!ok) {
  console.log('Next: create a Supabase project → Settings → Database.')
  console.log('Put Direct (5432) in DIRECT_URL and pooler (6543) in DATABASE_URL.')
  console.log('Then: npm run db:generate && npm run db:push && npm run db:seed')
  process.exit(1)
}
console.log('Database URLs look like Postgres. Run:')
console.log('  npm run db:generate')
console.log('  npm run db:push')
console.log('  npm run db:seed')
console.log('  npm run dev')
