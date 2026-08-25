# Accessory filter + Tikalon hard-block

**Date:** 2026-08-24  
**Status:** approved

## Problem

1. Accessory listings (`Iphone 13 case`, tempered glass, chargers) match iPhone model regex and can score as Great deals (e.g. ₱150 vs phone comps).
2. `price_too_low` (Tikalon) is only a warning; absurd asks still display as A/B/C deals.

## Goals

- **Option C:** Drop accessory listings at discovery; cleanup existing; hard-block Tikalon so deals never display until ask rises (monitor + recompute).
- Do **not** drop real phones that mention bonus accessories (`with case`, `free case`, `includes case`, `kasama case`, etc.).

## Design

### Discovery (`discovery_filter.mjs`)

- Add `looksLikeAccessoryListing(title, description?)`.
- Detect accessory-as-product phrasing (case/cover/tempered glass/screen protector/charger/cable/film/pouch as the item being sold, often with an iPhone model token).
- Carve-outs when accessory token is preceded by bonus language: `with`, `free`, `includes`, `include`, `plus`, `kasama`, `bonus`, `complete with`, `comes with`.
- `shouldSkipAsNoise` → `{ skip: true, reason: "accessory" }` when accessory-as-product.
- Cleanup script includes `accessory` in product-identity cleanup reasons.

### Deals (`compute_deals.mjs`)

- Add `price_too_low` to `hardBlock` → deal score `NA`, reason `❌ Tikalon price check`.
- Threshold unchanged: `DEALS_COMP_PRICE_MIN_PHP` (default 2000).
- Monitor price updates + recompute clear the flag when ask rises above the floor.

### UI

- Listings: no deal badge when score is `NA` (existing `showDeal`).
- Item: treat `price_too_low` like other hard blocks for verdict copy when score is `NA`.

## Out of scope

- Changing Tikalon floor or discovery min price defaults.
- LLM / fuzzy accessory detection.
