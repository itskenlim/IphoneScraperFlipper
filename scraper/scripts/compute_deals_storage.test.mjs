import test from "node:test";
import assert from "node:assert/strict";

import { isStorageUnknownForDeals, STORAGE_UNKNOWN_REASON } from "./compute_deals.mjs";

test("isStorageUnknownForDeals treats null/undefined as unknown", () => {
  assert.equal(isStorageUnknownForDeals(null), true);
  assert.equal(isStorageUnknownForDeals(undefined), true);
});

test("isStorageUnknownForDeals accepts parsed storage", () => {
  assert.equal(isStorageUnknownForDeals(128), false);
  assert.equal(isStorageUnknownForDeals(64), false);
});

test("STORAGE_UNKNOWN_REASON is user-facing copy", () => {
  assert.match(STORAGE_UNKNOWN_REASON, /storage/i);
  assert.match(STORAGE_UNKNOWN_REASON, /64\/128\/256/i);
});
