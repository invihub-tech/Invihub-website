# INVIHUB Supabase migration — setup & handoff

Local migration from Express/Prisma to Supabase. **Do not apply remote DB changes, deploy, commit, or push without explicit approval.**

## Architecture

| Layer | Role |
|--------|------|
| React/Vite SPA (Cloudflare) | Unchanged design/routes; talks to Supabase via `src/models/api.js` |
| Supabase Auth | Customer + admin login (no app password hashes) |
| Supabase Database + RLS | Catalogue public read; private data scoped; carts/checkout via Edge Functions |
| Edge Functions `shop-api`, `payment-webhook` | Cart, checkout, payments, order access, admin mutations, mock email |
| Storage `product-images` | Admin uploads; public read |

### Agreed behaviour changes
1. **Guest order access:** requires checkout email + order number + **access token** (hash stored server-side, TTL **365 days**). Token returned at checkout, saved in `localStorage`, carried on order-success / account links. Email alone is never enough.
2. **Cart token:** opaque UUID in `localStorage` (`invi_cart_token`); server stores SHA-256 only; Edge Function validates `x-cart-token`.
3. **Signup:** disable Auth email confirmation for test setup. Guest orders are **not** claimed by email on register — only `auth.uid()` linked orders or valid access token.

## Apply locally / when approved remotely

1. Create a Supabase project (fresh DB).
2. Apply migrations in order under `supabase/migrations/`.
3. Optionally run `supabase/seed.sql` (catalogue only).
4. Auth → Email: **Confirm email = OFF** (test setup).
5. Add Site URL + redirect URLs (see `deploy/CLOUDFLARE.md`).
6. Deploy Edge Functions and set secrets (placeholders only below).
7. Create first Auth user, then run `supabase/first-admin.sql` pattern.
8. Set Cloudflare `VITE_*` env and rebuild SPA with SPA fallback.

### Edge Function secrets
```
ALLOWED_ORIGINS=http://localhost:5173,https://YOUR_HOST
PAYMENT_MODE=mock
ALLOW_MOCK_PAYMENTS=true
PAYMENT_MOCK_FAIL=false
RAZORPAY_KEY_ID=dummy_key_not_for_live
RAZORPAY_KEY_SECRET=dummy_secret_not_for_live
RAZORPAY_WEBHOOK_SECRET=dummy_webhook_not_for_live
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are usually auto-injected.)

Deploy (when approved):
```bash
npx supabase functions deploy shop-api
npx supabase functions deploy payment-webhook
```

### Frontend env
Copy `.env.example` → `.env.local`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_PATH_KEY=invihub
```

```bash
npm install
npm run dev:web
```

## First admin
1. Create user in Authentication (Dashboard) with a strong password.
2. Insert into `admin_roles` using `supabase/first-admin.sql` (service/SQL only).
3. Sign in at `/${VITE_ADMIN_PATH_KEY}/admin/login`.

## File summary

| Path | Change |
|------|--------|
| `supabase/migrations/*` | Schema, RLS, storage, RPCs |
| `supabase/seed.sql` | Optional catalogue |
| `supabase/first-admin.sql` | Admin promotion template |
| `supabase/functions/shop-api` | Commerce API |
| `supabase/functions/payment-webhook` | Live Razorpay webhook |
| `supabase/functions/_shared/helpers.ts` | Shared server helpers |
| `src/models/api.js` | Same exports; Supabase Edge + Auth |
| `src/lib/cartToken.js` | localStorage cart token |
| `src/lib/orderAccess.js` | localStorage order access tokens |
| `src/lib/supabase.js` | Browser client |
| Shop account/success/checkout pages | Access-token UX only |
| `MaintenancePage` | Health via app reload (no Express `/api/health`) |
| `public/_redirects` | SPA fallback |
| `deploy/CLOUDFLARE.md` | Hosting notes |
| `server/*` | **Legacy Express** — retained for reference; not used by new frontend |

## Verification checklist

| Item | Status |
|------|--------|
| `npm run build` | See latest run |
| Visual / design parity | Untested against live (no screenshot baseline in CI) |
| Homepage / nav | Untested against Supabase |
| `/shop` direct load + refresh | Needs SPA fallback on host — config added locally |
| Catalogue / filters / product detail | Untested (needs migrated DB + functions) |
| Cart persistence (localStorage token) | Untested remotely |
| Guest checkout + access token | Untested remotely |
| Registered checkout (auth.uid link) | Untested remotely |
| Order lookup without token → denied | Untested remotely |
| Order revisit via localStorage / success link | Untested remotely |
| Register/login/logout/session | Untested remotely |
| Addresses / wishlist | Untested remotely |
| Admin login + role gate | Untested remotely |
| Admin products/categories/orders/inventory/upload | Untested remotely |
| Mock payments / console email | Untested remotely |
| Customer isolation / non-admin denial | Untested remotely |
| Live payments / real email | Intentionally not enabled |
| Remote migration applied | **Not done** (awaiting approval) |
| Cloudflare env / deploy | **Not done** (awaiting approval) |

## Blockers / remaining work
- No remote Supabase project credentials in this session → migrations/functions not applied or exercised end-to-end.
- Pre-migration e2e against Express: mutating flows already failed (`fetch failed`) in baseline.
- Express `server/` still in tree for reference; remove after remote verification if desired.
- Email remains console mock; access token is the guest revisit path (365-day expiry).
