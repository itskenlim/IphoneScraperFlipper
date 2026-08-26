import test from "node:test";
import assert from "node:assert/strict";

import {
  attachSellerActiveCounts,
  countActiveBySellerId,
  formatSellerLine
} from "./sellerDisplay.ts";

test("hides when both missing", () => {
  assert.equal(formatSellerLine({ seller_name: null, seller_id: null, seller_active_count: null }), null);
});

test("name + id + count", () => {
  assert.equal(
    formatSellerLine({ seller_name: "Maria Santos", seller_id: "100087109610666", seller_active_count: 4 }),
    "Maria Santos · id 100087109610666 · 4 active"
  );
});

test("name only when id missing", () => {
  assert.equal(formatSellerLine({ seller_name: "Maria", seller_id: null, seller_active_count: 3 }), "Maria");
});

test("id + count without name", () => {
  assert.equal(
    formatSellerLine({ seller_name: null, seller_id: "99", seller_active_count: 2 }),
    "id 99 · 2 active"
  );
});

test("id without count omits active suffix", () => {
  assert.equal(formatSellerLine({ seller_name: null, seller_id: "99", seller_active_count: null }), "id 99");
});

test("counts active rows per seller id", () => {
  const map = countActiveBySellerId([
    { listing_seller_id: "a" },
    { listing_seller_id: "a" },
    { listing_seller_id: "b" },
    { listing_seller_id: null }
  ]);
  assert.equal(map.get("a"), 2);
  assert.equal(map.get("b"), 1);
  assert.equal(map.has(""), false);
});

test("attachSellerActiveCounts maps counts onto items", () => {
  const counts = new Map([
    ["a", 2],
    ["b", 1]
  ]);
  const out = attachSellerActiveCounts(
    [
      { seller_id: "a", seller_active_count: null },
      { seller_id: "missing", seller_active_count: null },
      { seller_id: null, seller_active_count: null }
    ],
    counts
  );
  assert.equal(out[0].seller_active_count, 2);
  assert.equal(out[1].seller_active_count, null);
  assert.equal(out[2].seller_active_count, null);
});
