# Security & Functional Review (Comprehensive Audit & Remediation)

## 1. Executive Status
This document tracks the comprehensive security audit and remediation performed on the INVIHUB Web codebase.

---

## 2. Remediated Vulnerabilities & Hardening

### 2.1 Missing Row Level Security (RLS) on Customization Tables (Resolved)
- **Problem:** `public.customization_requests` and `public.customization_files` were created without enabling RLS, allowing unrestricted public read/write via PostgREST with the anon key.
- **Remediation (`20260310000009_security_hardening.sql`):**
  - Enabled RLS on both tables.
  - Added authenticated owner policies (`customer_id = auth.uid()` or `public.is_admin()`).
  - Added access token hash verification (`access_token_hash`) for unauthenticated guest lookup.
  - Revoked direct client DML (`INSERT`, `UPDATE`, `DELETE`) from `anon` and `authenticated`; all updates flow strictly through Edge Functions (`service_role`).

### 2.2 Storage Upload Hardening on `customizations` Bucket (Resolved)
- **Problem:** The storage policy permitted unrestricted anonymous file uploads of any type up to 50MB.
- **Remediation (`20260310000009_security_hardening.sql`):**
  - Dropped permissive anonymous insert.
  - Added strict file extension filtering restricting uploads to safe CAD, 3D, and document formats: `.stl`, `.obj`, `.3mf`, `.step`, `.stp`, `.iges`, `.igs`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.pdf`.
  - Blocked all dangerous script/executable formats (`.html`, `.svg`, `.exe`, `.js`, `.sh`, `.php`).

### 2.3 CORS Wildcard Restriction (Resolved)
- **Problem:** `_shared/helpers.ts` allowed any origin ending in `.pages.dev` or `.workers.dev`, permitting any third-party Cloudflare site to make authorized cross-origin requests.
- **Remediation:** Restricted permitted Cloudflare origins to explicit INVIHUB production origins (`invihub-web.invihub.workers.dev`, `invihub.pages.dev`) while keeping localhost and domains defined in `ALLOWED_ORIGINS`.

### 2.4 Razorpay Webhook Event Validation (Resolved)
- **Problem:** `payment-webhook/index.ts` called `fulfill_paid_order` on any webhook without checking `body.event`, meaning `payment.failed` webhooks would incorrectly fulfill and mark orders as paid.
- **Remediation:** Added event type filtering:
  - `payment.failed`: Records payment failure (`status: 'FAILED'`) without fulfilling order.
  - `payment.captured` & `order.paid`: Safely fulfills the order.
  - All other events: Acknowledged safely without unintended side-effects.

### 2.5 Customer ID Query Bug in Customization (Resolved)
- **Problem:** `shop-api/index.ts` queried `customers` using `.eq('user_id', user.id)`. The column in `customers` is `id`. This caused a silent failure, leaving `customer_id` as `null` on all submitted requests.
- **Remediation:** Corrected query to `.eq('id', user.id)`.

### 2.6 Admin Path Obscurity Information Leak (Resolved)
- **Problem:** `src/main.jsx` redirected `/invitech/admin/login` and `/invihub/admin/login` to `${adminBase}/login`, revealing the configured admin path key to probers.
- **Remediation:** Removed the explicit redirects; unauthorized paths now return standard 404 responses.

### 2.7 Production Routing Safe Fallback (Resolved)
- **Problem:** `src/lib/supabase.js` routed `/api` to relative path when `VITE_API_URL` was set, which fails on static SPA hosting with Cloudflare Workers Assets.
- **Remediation:** Updated `functionsBase()` so `/api` is used only in development mode (`import.meta.env.DEV`), safely falling back to the Edge Function URL in production builds.

### 2.8 Content Security Policy (CSP) Flexibility (Resolved)
- **Problem:** Hardcoded specific Supabase project URL in `index.html` broke when switching environments.
- **Remediation:** Updated `index.html` CSP to allow `https://*.supabase.co`.

### 2.9 Orphaned Artifacts Cleanup (Resolved)
- Cleaned up uncommitted test images in `public/uploads/` left over from legacy Express backend.

### 2.10 Safe Product Deletion & Schema Integrity (Resolved)
- Added foreign key updates (`ON DELETE SET NULL` on `order_items`, `ON DELETE CASCADE` on `cart_items` and `inventory_movements`) so that completely deleting a product does not violate foreign key constraints while keeping immutable customer receipt data intact.
- Added backend route `DELETE /admin/products/:id` in `shop-api` and client method `api.adminDeleteProduct(id)`.
- Replaced the duplicate/copy action with a permanent delete modal workflow in `AdminProducts.jsx`.

### 2.11 Admin Products Table & Grid Views & Enhanced Filtering (Resolved)
- Added toggle between Table and Grid view with responsive cards in `AdminProducts.jsx`.
- Added multi-criteria filters: live count status tabs (All, Active, Archived, Low Stock, Out of Stock), category dropdown, search with instant clear, and sorting (Price, Stock, Name, Date).
- Replaced category images/icons with `Sl. No.` and assigned distinct, accessible button styling across all admin actions.

---

## 3. Pending Items (As Requested)

### 3.1 Razorpay Live Client Modal & Gateway Activation (PENDING)
- Currently in **mock** mode for development testing (`PAYMENT_MODE=mock`, `ALLOW_MOCK_PAYMENTS=true`).
- When ready to go live with Razorpay:
  1. Set real Razorpay credentials in Supabase secrets:
     ```bash
     npx supabase secrets set PAYMENT_MODE=live
     npx supabase secrets set ALLOW_MOCK_PAYMENTS=false
     npx supabase secrets set RAZORPAY_KEY_ID="rzp_live_..."
     npx supabase secrets set RAZORPAY_KEY_SECRET="..."
     npx supabase secrets set RAZORPAY_WEBHOOK_SECRET="..."
     ```
  2. Set `VITE_RAZORPAY_KEY_ID="rzp_live_..."` in client environment.
  3. Wire the client modal trigger (`new window.Razorpay(...)`) in `CheckoutPage.jsx`.

---

## 4. Deployment Approval Gate

To apply the latest database hardening migrations and Edge Function security patches to your Supabase project:

```bash
# 1. Push database migrations (including 20260310000009_security_hardening.sql)
npx supabase db push

# 2. Deploy updated Edge Functions
npx supabase functions deploy shop-api
npx supabase functions deploy payment-webhook

# 3. Build & Deploy Frontend (Cloudflare Workers)
npm run build
npx wrangler deploy
```
