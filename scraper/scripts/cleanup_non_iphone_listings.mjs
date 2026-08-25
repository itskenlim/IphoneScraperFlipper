/**
 * Mark existing non-iPhone / noise listings as unavailable using the same
 * discovery filter rules as ingest.
 *
 * Usage:
 *   node scripts/cleanup_non_iphone_listings.mjs           # dry-run (default)
 *   node scripts/cleanup_non_iphone_listings.mjs --apply   # write status=unavailable
 */
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { shouldSkipAsNoise } from "../scraper/playwright_extra/discovery_filter.mjs";
import { loadDotenv } from "../scraper/env.mjs";

loadDotenv();

function cleanText(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function requireEnv(name) {
  const value = cleanText(process.env[name]);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function envInt(name, fallback) {
  const raw = cleanText(process.env[name]);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name, fallback) {
  const raw = cleanText(process.env[name]);
  if (raw == null) return fallback;
  const v = raw.toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function makeClient() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchActiveListings(supabase, pageSize = 1000) {
  const out = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const res = await supabase
      .from("listings")
      .select("listing_id,title,description,price_php,status")
      .eq("status", "active")
      .range(from, to);
    if (res.error) throw new Error(`Fetch failed: ${res.error.message}`);
    const rows = res.data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 100_000) throw new Error("Safety stop: too many active rows.");
  }
  return out;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const cfg = {
    discoveryFilterBuyers: envBool("PLAYWRIGHT_DISCOVERY_FILTER_BUYERS", true),
    discoveryRejectNonIphoneProduct: envBool("PLAYWRIGHT_DISCOVERY_REJECT_NON_IPHONE_PRODUCT", true),
    discoveryRequireIphoneModel: envBool("PLAYWRIGHT_DISCOVERY_REQUIRE_IPHONE_MODEL", true),
    discoveryMinPricePhp: envInt("PLAYWRIGHT_DISCOVERY_MIN_PRICE_PHP", 4000),
    discoveryExcludeKeywords: cleanText(process.env.PLAYWRIGHT_DISCOVERY_EXCLUDE_KEYWORDS) || ""
  };

  const supabase = makeClient();
  const rows = await fetchActiveListings(supabase);
  const byReason = new Map();
  const offenders = [];

  for (const row of rows) {
    const decision = shouldSkipAsNoise(row, cfg);
    if (!decision.skip) continue;
    // Keep priced iPhone sales that only fail soft price/swap rules out of mass cleanup?
    // Cleanup targets product-identity noise, not every historical min_price miss.
    const cleanupReasons = new Set([
      "non_iphone_product",
      "accessory",
      "exclude_keyword",
      "buyer_post",
      "no_iphone_model"
    ]);
    if (!cleanupReasons.has(decision.reason)) continue;
    offenders.push({ ...row, reason: decision.reason });
    byReason.set(decision.reason, (byReason.get(decision.reason) || 0) + 1);
  }

  console.log(`[INFO] active_listings=${rows.length} noise_candidates=${offenders.length} apply=${apply}`);
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`[INFO] reason=${reason} count=${count}`);
  }

  const sample = offenders.slice(0, 25);
  for (const row of sample) {
    const title = String(row.title || "").slice(0, 100);
    console.log(`[SAMPLE] reason=${row.reason} id=${row.listing_id} title=${title}`);
  }
  if (offenders.length > sample.length) {
    console.log(`[INFO] …and ${offenders.length - sample.length} more`);
  }

  if (!apply) {
    console.log("[DONE] dry-run only. Re-run with --apply to set status=unavailable.");
    return;
  }

  const nowIso = new Date().toISOString();
  const ids = offenders.map((r) => String(r.listing_id));
  const chunkSize = 200;
  let updated = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const res = await supabase
      .from("listings")
      .update({ status: "unavailable", updated_at: nowIso })
      .in("listing_id", chunk)
      .eq("status", "active");
    if (res.error) throw new Error(`Update failed: ${res.error.message}`);
    updated += chunk.length;
    console.log(`[INFO] marked_unavailable=${updated}/${ids.length}`);
  }

  console.log(`[DONE] marked ${ids.length} listings unavailable.`);
}

main().catch((error) => {
  console.error(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
