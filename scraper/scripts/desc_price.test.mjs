import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAskPriceFromDescription,
  extractAskPricesFromDescription,
  isMateriallyHigherDescAsk,
  parsePhpAmountToken
} from "./desc_price.mjs";

test("parsePhpAmountToken handles commas and k suffix", () => {
  assert.equal(parsePhpAmountToken("30,000"), 30000);
  assert.equal(parsePhpAmountToken("30k"), 30000);
  assert.equal(parsePhpAmountToken("12,345"), 12345);
  assert.equal(parsePhpAmountToken("500"), null);
});

test("extracts ask-like Price: line from bait listing", () => {
  const desc =
    "FOR SALE: iPhone 15 Plus 128GB – Pink. Price: ₱30,000 only! Can give lp for sure buyer • 100% Battery Health";
  assert.equal(extractAskPriceFromDescription(desc), 30000);
});

test("ignores orig / bought / SRP reference prices", () => {
  assert.equal(
    extractAskPriceFromDescription("Selling iPhone 13 128gb for ₱13,000. Orig bought price is ₱15,000"),
    13000
  );
  assert.equal(
    extractAskPriceFromDescription("iPhone 14 openline. Binili ko 28k, selling 22,000 nego"),
    22000
  );
  assert.equal(extractAskPriceFromDescription("SRP 45,000 retail. Nice unit."), null);
  assert.deepEqual(extractAskPricesFromDescription("orig 15000 bought 14000"), []);
});

test("isMateriallyHigherDescAsk detects bait gap", () => {
  assert.equal(isMateriallyHigherDescAsk(30000, 12345), true);
  assert.equal(isMateriallyHigherDescAsk(15000, 13000), false);
  assert.equal(isMateriallyHigherDescAsk(16000, 13000), false); // < 3k abs and < 25%
  assert.equal(isMateriallyHigherDescAsk(20000, 13000), true);
});
