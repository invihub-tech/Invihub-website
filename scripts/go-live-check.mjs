/**
 * Prints which Supabase frontend env vars are set. Does not print secret values.
 * Usage: node scripts/go-live-check.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(name) {
  const p = resolve(process.cwd(), name)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    if (process.env[m[1]] != null) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[m[1]] = v
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const present = (k) => String(process.env[k] || '').trim().length > 0

const rows = [
  ['VITE_SUPABASE_URL', present('VITE_SUPABASE_URL') && String(process.env.VITE_SUPABASE_URL).includes('supabase'), 'Project URL'],
  ['VITE_SUPABASE_ANON_KEY', present('VITE_SUPABASE_ANON_KEY') && String(process.env.VITE_SUPABASE_ANON_KEY).length > 20, 'Anon/public key only'],
  ['VITE_ADMIN_PATH_KEY', present('VITE_ADMIN_PATH_KEY'), 'Admin URL segment'],
  ['PAYMENT_MODE', !present('PAYMENT_MODE') || process.env.PAYMENT_MODE === 'mock' || process.env.ALLOW_MOCK_PAYMENTS === 'true', 'Keep mock for test; live needs secrets in Edge Functions'],
]

let ok = true
console.log('Go-live check — Supabase frontend (values hidden)\n')
for (const [key, pass, hint] of rows) {
  console.log(`${pass ? 'OK   ' : 'NEED '} ${key} — ${hint}`)
  if (!pass) ok = false
}
console.log('')
console.log('Also configure (Dashboard / secrets, not VITE_*):')
console.log('  - Auth: confirm email OFF for test signup flow')
console.log('  - Redirect URLs for your Cloudflare + localhost origins')
console.log('  - Edge secrets: ALLOWED_ORIGINS, PAYMENT_MODE, ALLOW_MOCK_PAYMENTS')
console.log('  - Apply supabase/migrations + optional seed.sql')
console.log('  - Promote first admin via supabase/first-admin.sql')
console.log('  - Deploy shop-api + payment-webhook functions')
console.log('  - SPA fallback (public/_redirects or Workers not_found_handling)')
console.log('')
if (!ok) process.exit(1)
console.log('Frontend env looks present. Run: npm run build && npm run preview')
