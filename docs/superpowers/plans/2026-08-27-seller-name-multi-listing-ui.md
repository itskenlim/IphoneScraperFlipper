# Seller name + multi-listing UI Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show seller name, seller id (debug), and active listing count on listings table, item page, and live deal cards.

**Architecture:** Extend `PublicListing` / `PrivateListing` with seller fields; batch-count active listings by `listing_seller_id` in `data.ts`; shared `formatSellerLine` + small React line component for all surfaces. No schema or scraper changes.

**Tech Stack:** Next.js 15, Supabase admin client, TypeScript, Tailwind

---

## File map

| File | Responsibility |
|---|---|
| `web/lib/types.ts` | Add `seller_id`, `seller_name`, `seller_active_count` |
| `web/lib/sellerDisplay.ts` | Pure format + count attach helpers (unit-testable) |
| `web/lib/sellerDisplay.test.mjs` | Node tests for format/count rules |
| `web/lib/data.ts` | Select seller cols; batch enrich counts |
| `web/components/seller-meta-line.tsx` | Shared muted seller line UI |
| `web/app/listings/page.tsx` | Show under title |
| `web/app/item/[listing_id]/page.tsx` | Show in header meta |
| `web/components/live-deals-strip.tsx` | LiveDealCard + HeroLiveDeal |

## Tasks

- [x] Types + `sellerDisplay` helpers + tests (7/7 pass)
- [x] Batch enrich seller active counts in `data.ts`
- [x] `SellerMetaLine` on listings, item page, live deals / hero
- [x] `tsc --noEmit` + sellerDisplay tests

## Spec coverage

| Spec requirement | Task |
|---|---|
| Expose seller_id, seller_name, seller_active_count | done |
| Batch count active by seller_id | done |
| Hide when both missing; name-only; id-only | done |
| Listings + item + live deals | done |
| No backfill / ratings / scraper | n/a |
