# Comps-gated description price (bait) detection

**Date:** 2026-08-25  
**Status:** approved (chat)

## Problem

Sellers put a fake low Marketplace price field (e.g. ₱12,345) while the real ask is in the description (`Price: ₱30,000 only!`). Deals score as “Great” against comps. Naive “any number in desc” fails on `orig bought 15k`.

## Approach

1. Score with listing `price_php` first.
2. If ask is **massively under comps** (≥45% below p50), scan the description.
3. Extract only **ask-like** prices (`Price:`, `selling`, `nego`, `₱X only`, …). Ignore `orig` / `binili` / `SRP` / `retail` / `bought`.
4. **Desc ask found and materially higher** than listing → rescore using desc ask (do not overwrite `listings.price_php`); set `price_mismatch` + `desc_ask_php`.
5. **No ask-like desc price** → hard-block (`price_unverified`, score `NA`).
6. Existing Tikalon (`price_too_low`) still hard-blocks absolute floors.

## Out of scope

- Cleanup / deleting accessory rows (user will query/delete later).
- Mutating scraped `listings.price_php` from description text.
