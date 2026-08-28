import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  mergeNetworkListingRow,
  networkListingCompletenessScore
} from "../scraper/playwright_extra/network_listing_merge.mjs";
import {
  collectNetworkListingsFromPayload,
  parseAllJsonishPayloads
} from "../scraper/playwright_extra/extract_feed.mjs";

test("mergeNetworkListingRow fills missing seller from fuller row", () => {
  const stub = {
    listing_id: "1",
    title: "iPhone 13",
    price_php: 18000,
    listing_seller_id: null,
    listing_seller_name: null
  };
  const full = {
    listing_id: "1",
    title: "iPhone 13 128gb",
    price_php: 18000,
    listing_seller_id: "10001",
    listing_seller_name: "Maria Santos",
    listing_is_live: true
  };
  const merged = mergeNetworkListingRow(stub, full);
  assert.equal(merged.listing_seller_id, "10001");
  assert.equal(merged.listing_seller_name, "Maria Santos");
  assert.equal(merged.listing_is_live, true);
});

test("mergeNetworkListingRow keeps seller when incoming stub is weaker", () => {
  const full = {
    listing_id: "1",
    listing_seller_id: "10001",
    listing_seller_name: "Maria Santos",
    listing_price_amount: 18000
  };
  const stub = { listing_id: "1", title: "iPhone 13", price_php: 18000 };
  const merged = mergeNetworkListingRow(full, stub);
  assert.equal(merged.listing_seller_id, "10001");
  assert.equal(merged.listing_seller_name, "Maria Santos");
});

test("parseAllJsonishPayloads reads multiple JSON objects from one body", () => {
  const payloads = parseAllJsonishPayloads('{"a":1}\n{"b":2}\n');
  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads[0], { a: 1 });
  assert.deepEqual(payloads[1], { b: 2 });
});

test("collectNetworkListingsFromPayload merges duplicate ids from facebookgraphql.json", () => {
  const samplePath = path.resolve("facebookgraphql.json");
  if (!fs.existsSync(samplePath)) {
    return;
  }
  const payload = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  const map = collectNetworkListingsFromPayload(payload);
  assert.ok(map.size >= 20);
  let withSeller = 0;
  for (const row of map.values()) {
    if (row.listing_seller_id && row.listing_seller_name) withSeller += 1;
  }
  assert.equal(withSeller, map.size);
  assert.ok(networkListingCompletenessScore([...map.values()][0]) > 0);
});
