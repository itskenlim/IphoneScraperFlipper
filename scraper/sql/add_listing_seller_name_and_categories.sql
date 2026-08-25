-- Seller name + Marketplace category fields from GraphQL feed.
-- Run once in Supabase SQL editor.

alter table if exists public.listings
  add column if not exists listing_seller_name text null,
  add column if not exists listing_category_name text null,
  add column if not exists listing_leaf_category_name text null,
  add column if not exists listing_taxonomy_name text null;
