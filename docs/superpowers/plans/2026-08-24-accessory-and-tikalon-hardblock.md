# Accessory filter + Tikalon hard-block Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Drop accessory-as-product listings at discovery/cleanup, and hard-block Tikalon (`price_too_low`) so absurd asks never show as A/B/C deals.

**Architecture:** Extend `discovery_filter.mjs` with accessory product detection + bonus carve-outs; wire into `shouldSkipAsNoise` and cleanup reasons; add `price_too_low` to `hardBlock` in `compute_deals.mjs`; light UI verdict copy.

**Tech Stack:** Node test runner, existing scraper filter + deals pipeline, Next.js item page.

---

## File map

| File | Change |
|---|---|
| `scraper/scraper/playwright_extra/discovery_filter.mjs` | `looksLikeAccessoryListing`, skip reason `accessory` |
| `scraper/scripts/discovery_filter.test.mjs` | keep/drop accessory cases |
| `scraper/scripts/cleanup_non_iphone_listings.mjs` | add `accessory` to cleanup reasons |
| `scraper/scripts/compute_deals.mjs` | hard-block `price_too_low` |
| `web/app/item/[listing_id]/page.tsx` | Tikalon hard-block verdict copy |

## Tasks

- [x] TDD: accessory keep/drop tests
- [x] Implement `looksLikeAccessoryListing` + wire skip
- [x] Cleanup reason `accessory`
- [x] Hard-block Tikalon in `compute_deals`
- [x] Item page copy
- [x] Run discovery_filter tests
