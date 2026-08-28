#!/usr/bin/env node
/**
 * Analyze seller coverage in a discovery JSON dump.
 * Usage: node scripts/analyze_discovery_seller.mjs [path/to/discovery-*.json]
 */
import fs from "node:fs";
import path from "node:path";

function isGraphqlLike(row) {
  return Boolean(
    row?.listing_price_amount != null ||
      typeof row?.listing_is_live === "boolean" ||
      row?.listing_seller_id ||
      row?.listing_location_city
  );
}

function main() {
  const arg = process.argv[2];
  const logsDir = path.resolve("logs");
  let target = arg ? path.resolve(arg) : null;
  if (!target) {
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.startsWith("discovery-") && f.endsWith(".json"))
      .map((f) => ({ f, m: fs.statSync(path.join(logsDir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    if (!files.length) {
      console.error("No discovery-*.json in logs/");
      process.exit(1);
    }
    target = path.join(logsDir, files[0].f);
  }

  const rows = JSON.parse(fs.readFileSync(target, "utf8"));
  const gql = rows.filter(isGraphqlLike);
  const dom = rows.filter((r) => !isGraphqlLike(r));
  const withId = rows.filter((r) => r.listing_seller_id);
  const withName = rows.filter((r) => r.listing_seller_name);
  const withBoth = rows.filter((r) => r.listing_seller_id && r.listing_seller_name);

  console.log(`file=${target}`);
  console.log(`total=${rows.length}`);
  console.log(`graphql_like=${gql.length} dom_only=${dom.length}`);
  console.log(`with_seller_id=${withId.length} with_seller_name=${withName.length} with_both=${withBoth.length}`);
  console.log(`seller_id_rate=${rows.length ? ((withId.length / rows.length) * 100).toFixed(1) : 0}%`);

  const missing = rows.filter((r) => !r.listing_seller_id);
  if (missing.length) {
    console.log("\nMissing seller (first 10):");
    for (const row of missing.slice(0, 10)) {
      console.log(`  ${row.listing_id}  ${String(row.title || "").slice(0, 50)}  gql=${isGraphqlLike(row)}`);
    }
  }
}

main();
