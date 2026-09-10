# Cloudflare Workers (workers.dev) — SPA routing

Your live host is `https://invihub-web.invihub.workers.dev/`. That is **Workers**, not Pages.

## Important
`public/_redirects` is a **Pages** convention. It does **not** configure SPA fallback on Workers Static Assets. Use Wrangler `assets.not_found_handling` instead.

## Required Wrangler settings (before deploy — approval needed)

Use root `wrangler.toml.example` (copy to `wrangler.toml` when deploying):

```toml
name = "invihub-web"
compatibility_date = "2024-09-23"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

This serves `index.html` with HTTP 200 for `/shop`, `/shop/cart`, `/invihub/admin/...`, etc., so refresh and deep links work.

## Deploy flow (do not run until approved)

```bash
npm run build
npx wrangler deploy
```

Ensure Cloudflare Worker env has `VITE_*` values available at **build** time if you build on Cloudflare; if you build locally, bake them into the Vite build via `.env.production.local` then deploy `dist/`.

## Retired
Nginx `/api` proxy and Express are not part of this Workers deployment. The browser calls Supabase Edge Functions directly.
