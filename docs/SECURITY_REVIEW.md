# Security & functional review (local migration)

## Console `startTime` / `reportAllChanges` error
This stack (`VM86`, `et.reportAllChanges`) is **not** from INVIHUB app code. It comes from an injected browser/extension script. Safe to ignore for shop functionality. The real shop issue was missing `VITE_SUPABASE_*` (empty catalogue). Shop home now surfaces a clear configuration error instead of a blank page.

## Checkout totals & stock
- Totals are computed in `checkout_create_order` from **DB product prices**, not client-supplied amounts.
- Product rows are locked `FOR UPDATE`; stock decrement runs in the **same transaction** as order/items/payment insert and cart clear (`20260310000005_checkout_txn.sql`).
- Edge Function still pre-validates stock/methods for clearer 400s; RPC is authoritative.

## Payment confirmation cannot be forged
- Mock `POST /checkout/confirm` requires cart-token hash match **or** authenticated `customer_id` owner; blocked unless `mockPaymentsAllowed()`.
- Live mode rejects mock confirm; webhook requires HMAC with `RAZORPAY_WEBHOOK_SECRET` (`payment-webhook`, `verify_jwt=false` only for that function).
- Guest order detail requires email + access token hash (not email/order number alone).

## Admin operations
- All `/admin/*` except login/logout go through `requireAdmin` → `admin_roles` row for `auth.uid()`.
- No client INSERT policy on `admin_roles` (users cannot self-promote).
- Catalogue mutations use service role only after that check.

## Edge auth & CORS
- Guests: `Authorization: Bearer <anon key>` + `x-cart-token` (hash looked up server-side).
- Signed-in: Bearer access token; profile/cart attach via `/customers/ensure`.
- CORS allows listed headers including `x-cart-token`; `ALLOWED_ORIGINS` must include localhost + workers.dev; disallowed origins get **403** (no reflected ACAO).

## Residual risks / not verified live
- Online gateway create runs **after** the transactional reserve (if Razorpay fails mid-flight, stock may stay reserved — same class of issue as many checkouts; mock path avoids live calls).
- Local Supabase (`supabase start`) **not run**: Docker Desktop engine was not running on this machine.
- Customer A/B isolation, admin denial, and full checkout paths need a linked project + deployed functions.

## Workers SPA
- Use `wrangler.toml` `[assets] not_found_handling = "single-page-application"` — **not** `public/_redirects` (Pages-only).

## Deployment approval gate (do not run until you say so)

```bash
# After linking + approving DB:
npx supabase db push
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174,https://invihub-web.invihub.workers.dev"
npx supabase secrets set PAYMENT_MODE=mock
npx supabase secrets set ALLOW_MOCK_PAYMENTS=true
npx supabase secrets set PAYMENT_MOCK_FAIL=false
npx supabase functions deploy shop-api
npx supabase functions deploy payment-webhook

# Cloudflare Workers (separate approval):
# copy wrangler.toml.example → wrangler.toml
npm run build
npx wrangler deploy
```
