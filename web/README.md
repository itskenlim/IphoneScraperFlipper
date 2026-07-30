# IAASE Dashboard (web)

Next.js (App Router) dashboard for Marketplace listings — **public MVP** (no login):

- `/` landing
- `/listings` deal board
- `/item/[listing_id]` full detail + “Open on Facebook” / message seller
- `/api/public/listings` public list API
- `/api/private/listing/[listing_id]` detail API (name is legacy; publicly readable)

## Deal scoring

If `deal_metrics` is present in the DB, the public list will show:

- Deal score (A/B/C only)
- % below market (vs comps median)
- Confidence
- Estimated profit (simple conservative estimate)

## Local dev

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Vercel

- Set Vercel Project Root to `web/`
- Add env vars (server-only):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser (don’t use `NEXT_PUBLIC_*`).
- Listing details (description, Facebook URL) are intentionally public for this MVP.
