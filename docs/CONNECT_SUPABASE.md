# Connect a fresh Supabase project (local setup — no secrets in chat)

Do **not** paste database passwords, service-role keys, or access tokens into chat. Keep them only in local files / Dashboards.

## 1. Create / open the project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your fresh project (or create one)
3. Wait until the project is **Healthy**

## 2. Find the project URL and anon (publishable) key

1. In the left sidebar: **Project Settings** (gear) → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL` (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Leave **service_role** key in the dashboard only. You will paste it into CLI secrets locally, never into the frontend or into chat.

## 3. Create local frontend env (this machine only)

In the repo root, create `.env.local` (gitignored):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_PATH_KEY=invihub
VITE_RAZORPAY_KEY_ID=dummy_key_not_for_live
```

Restart the Vite dev server after saving (`Ctrl+C`, then `npm run dev`).

Verify without printing secrets:

```bash
npm run go-live-check
```

## 4. Auth settings (Dashboard — keep mock-friendly signup)

**Authentication → Providers → Email**

- Enable Email
- **Confirm email: OFF** (initial test setup so register → checkout stays immediate)

**Authentication → URL configuration**

- Site URL: `http://localhost:5173` (or `http://localhost:5174` if Vite picked that port)
- Redirect URLs (add all you use):
  - `http://localhost:5173/**`
  - `http://localhost:5174/**`
  - `https://invihub-web.invihub.workers.dev`
  - `https://invihub-web.invihub.workers.dev/**`

## 5. Apply SQL migrations (when you approve remote DB changes)

From the repo root, after `npx supabase login` and linking:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Then **only after you approve**:

```bash
npx supabase db push
```

Or paste migration files in order in **SQL Editor** (same effect):

1. `supabase/migrations/20260310000001_schema.sql`
2. `supabase/migrations/20260310000002_rls.sql`
3. `supabase/migrations/20260310000003_storage.sql`
4. `supabase/migrations/20260310000004_functions.sql`
5. `supabase/migrations/20260310000005_checkout_txn.sql`

Optional catalogue seed (no admins/customers):

```bash
# SQL Editor → run supabase/seed.sql
```

## 6. First admin (SQL Editor — no default password in repo)

1. **Authentication → Users → Add user** (email + strong password)
2. Run (replace email only):

```sql
insert into public.admin_roles (user_id, email, name)
select id, email, 'INVIHUB Admin'
from auth.users
where lower(email) = lower('you@your-domain.com')
on conflict (user_id) do update
  set email = excluded.email, name = excluded.name;
```

## 7. Edge Function secrets (local CLI — do not paste into chat)

Keep **mock payments** and console email:

```bash
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174,https://invihub-web.invihub.workers.dev"
npx supabase secrets set PAYMENT_MODE=mock
npx supabase secrets set ALLOW_MOCK_PAYMENTS=true
npx supabase secrets set PAYMENT_MOCK_FAIL=false
npx supabase secrets set RAZORPAY_KEY_ID=dummy_key_not_for_live
npx supabase secrets set RAZORPAY_KEY_SECRET=dummy_secret_not_for_live
npx supabase secrets set RAZORPAY_WEBHOOK_SECRET=dummy_webhook_not_for_live
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are normally provided automatically to functions.)

## 8. Deploy functions (only after you approve)

```bash
npx supabase functions deploy shop-api
npx supabase functions deploy payment-webhook
```

## 9. Local smoke test checklist

After `.env.local` + migrations + functions:

1. Open `/shop` — categories/products from seed
2. Add to cart → guest checkout → note access code on success
3. Register / login → checkout → order appears under account
4. Guest lookup without access code fails; with code works
5. Admin login at `/invihub/admin/login`
6. Second customer cannot see first customer’s orders

## 10. Cloudflare Workers deploy (separate approval)

See `deploy/CLOUDFLARE.md` and `wrangler.toml.example`.  
Do **not** run `wrangler deploy` until you explicitly approve.
