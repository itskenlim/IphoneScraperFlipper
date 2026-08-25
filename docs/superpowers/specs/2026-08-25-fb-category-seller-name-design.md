# FB GraphQL category filter + seller name

**Date:** 2026-08-25  
**Status:** approved (chat)

## Goals

1. At discovery, drop listings whose GraphQL leaf/taxonomy category is clearly an accessory (e.g. `Cases & Skins`) or non-phone top category (clothing, misc without iPhone leaf).
2. Persist `listing_seller_name` (and category names for later cleanup/query).

## Design

- `extract_feed.mjs`: map `marketplace_listing_seller.name`, `marketplace_listing_category_name`, `marketplace_listing_leaf_vt_category_name`, virtual taxonomy name.
- `discovery_filter.mjs`: skip reason `fb_category` when leaf/taxonomy is accessory or top category is non-phone without leaf `iPhone`.
- SQL + `db.mjs` + types: `listing_seller_name`, `listing_category_name`, `listing_leaf_category_name`.
- Title-based accessory filter remains as fallback when GraphQL categories are missing.
