# Seller name + multi-listing count in UI

**Date:** 2026-08-27  
**Status:** approved (chat)

## Goals

1. Surface Marketplace seller identity on public list rows, live deal cards, and the item detail page.
2. Show how many **active** listings we already track for that seller (inventory / flipper signal).
3. Include `seller_id` in the public UI for debugging (alongside name).
4. No DB backfill; no seller ratings; no seller profile page / block UX.

## Non-goals

- GraphQL seller ratings (`product_feedback` / stars) — not present in feed payloads we capture.
- Backfilling `listing_seller_name` / `listing_seller_id` on old rows.
- Denormalized seller tables or cached count columns.
- Filtering / sorting by seller.

## Data

Already stored (scraper GraphQL):

- `listings.listing_seller_id`
- `listings.listing_seller_name`

Web layer exposes on `PublicListing` / `PrivateListing`:

| Field | Source | Notes |
|---|---|---|
| `seller_id` | `listing_seller_id` | Shown in UI for debug |
| `seller_name` | `listing_seller_name` | Display label |
| `seller_active_count` | batch count query | Active rows with same `listing_seller_id` |

### Count rules

- Count = number of `listings` rows with the same `listing_seller_id` and `status = 'active'`.
- Includes the current listing (e.g. `4 active` means 4 total, not “3 others”).
- If `seller_id` is missing → leave `seller_active_count` null; show name only if present.
- If name is missing but id exists → show id + count when available.
- If both missing → hide the seller line entirely.

### Fetch approach (batch enrich)

1. Add `listing_seller_id,listing_seller_name` to listing selects in `web/lib/data.ts`.
2. After mapping page items (and private detail), collect unique non-null seller ids.
3. One follow-up query: fetch `listing_seller_id` for active listings in that id set; aggregate counts in memory.
4. Attach `seller_active_count` onto each row.

No schema migration. No scraper changes required for this feature.

## UI

Shared muted meta line (same wording everywhere):

- Name + id + count: `Maria Santos · id 1000…666 · 4 active`
- Name + id, count unknown / 1 still ok to show count: prefer always showing `N active` when count is known (including `1 active`).
- Name only (no id): `Maria Santos`
- Id only: `id 1000…666 · 4 active`
- Truncate very long names in list/cards; full name on item page. Keep full id visible (mono, selectable) for debug copy-paste.

### Surfaces

1. **Listings table** — under title, with battery/checklist block.
2. **Item detail** — in the header meta row (with location / status / age).
3. **Live deals strip + hero deal** — under title/location.

## Out of scope / later

- Seller ratings if detail GraphQL ever exposes them.
- “Other listings by this seller” cross-links.
- Block-this-seller from UI (existing discovery blocklist stays scraper-side).
