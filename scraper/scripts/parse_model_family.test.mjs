import test from "node:test";
import assert from "node:assert/strict";

import { parseModelFamily } from "./compute_deals.mjs";

test("plain numbered model", () => {
  assert.equal(parseModelFamily("iPhone 16 128GB"), "iphone_16");
  assert.equal(parseModelFamily("iPhone 13 Pro Max"), "iphone_13");
});

test("plain XR", () => {
  assert.equal(parseModelFamily("iPhone XR 64gb openline"), "iphone_xr");
});

test("XR modified to look like iPhone 16 prefers XR", () => {
  assert.equal(parseModelFamily("iPhone XR modified to Iphone 16"), "iphone_xr");
  assert.equal(parseModelFamily("XR mod to look like iPhone 16"), "iphone_xr");
  assert.equal(parseModelFamily("iphone xr housing converted to 15 pro look"), "iphone_xr");
});

test("letter chassis + numbered without explicit mod still prefers older", () => {
  assert.equal(parseModelFamily("iPhone XR to Iphone 16"), "iphone_xr");
});

test("two numbered models without mod keep first-match numbered behavior", () => {
  // Swap copy — not a chassis mod; keep legacy first numbered hit.
  assert.equal(parseModelFamily("sale IP11 or swap sa IP15"), "iphone_11");
});

test("preferred swap target in title does not override unit for sale in description", () => {
  const text =
    "FOR SALE OR SWAP (prefered iphone 15)\nIphone 13, 128GB Starlight Details: Under Warranty pa ZPA variant";
  assert.equal(parseModelFamily(text), "iphone_13");
  assert.equal(parseModelFamily("FOR SALE OR SWAP (preferred iPhone 16)\nSelling iPhone 12 64gb"), "iphone_12");
  assert.equal(parseModelFamily("iPhone 14 128 openline willing swap sa iPhone 15 Pro"), "iphone_14");
});

test("single modern model unchanged", () => {
  assert.equal(parseModelFamily("iPhone 15 128gb Face ID working"), "iphone_15");
});

test("iPhone 16e / 17e numbered models", () => {
  assert.equal(parseModelFamily("iPhone 16e 128GB"), "iphone_16");
  assert.equal(parseModelFamily("Iphone 16E"), "iphone_16");
  assert.equal(parseModelFamily("Iphone 17E 256gb openline For SALE/SWAP"), "iphone_17");
  assert.equal(parseModelFamily("IP16e"), "iphone_16");
});

test("iPhone Air is its own model family", () => {
  assert.equal(parseModelFamily("iPhone 17 Air"), "iphone_air");
  assert.equal(parseModelFamily("Iphone 17 air"), "iphone_air");
  assert.equal(parseModelFamily("iPhone Air"), "iphone_air");
  assert.equal(parseModelFamily("iPhone Air 17 256 Sky Blue"), "iphone_air");
});

test("iPhone 18–20 numbered models", () => {
  assert.equal(parseModelFamily("iPhone 18 Pro"), "iphone_18");
  assert.equal(parseModelFamily("IP20 Pro Max"), "iphone_20");
});
