import test from "node:test";
import assert from "node:assert/strict";

import { parseVariant } from "./compute_deals.mjs";

test("e variant for 16e / 17e", () => {
  assert.equal(parseVariant("iPhone 16e 128GB", "iphone_16"), "e");
  assert.equal(parseVariant("Iphone 16E", "iphone_16"), "e");
  assert.equal(parseVariant("Iphone 17E 256gb", "iphone_17"), "e");
  assert.equal(parseVariant("IP16e openline", "iphone_16"), "e");
});

test("16e does not steal pro/plus variants", () => {
  assert.equal(parseVariant("iPhone 16 Pro Max", "iphone_16"), "pro_max");
  assert.equal(parseVariant("iPhone 16 Plus", "iphone_16"), "plus");
  assert.equal(parseVariant("iPhone 16 128GB", "iphone_16"), "base");
});

test("iPhone Air stays base variant", () => {
  assert.equal(parseVariant("iPhone 17 Air 256gb", "iphone_air"), "base");
});
