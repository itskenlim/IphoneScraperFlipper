import test from "node:test";
import assert from "node:assert/strict";

import {
  hasIphoneModel,
  looksLikeNonIphoneProduct,
  shouldSkipAsNoise
} from "../scraper/playwright_extra/discovery_filter.mjs";

const baseCfg = {
  discoveryFilterBuyers: true,
  discoveryRejectNonIphoneProduct: true,
  discoveryRequireIphoneModel: true,
  discoveryMinPricePhp: 4000,
  discoveryExcludeKeywords: ""
};

test("hasIphoneModel matches full and shorthand forms", () => {
  assert.equal(hasIphoneModel("iPhone 13 Pro 128gb", ""), true);
  assert.equal(hasIphoneModel("iphone16 256 openline", ""), true);
  assert.equal(hasIphoneModel("IP16 256gb 100% BH", ""), true);
  assert.equal(hasIphoneModel("IP 15 Pro Max factory unlock", ""), true);
  assert.equal(hasIphoneModel("Iphone 7Plus 128Gb", ""), true);
  assert.equal(hasIphoneModel("IPHONE 13PROMAX -256GB", ""), true);
  assert.equal(hasIphoneModel("Rush+rush+iPhone+15", ""), true);
  assert.equal(hasIphoneModel("iPhone 16e 128GB", ""), true);
  assert.equal(hasIphoneModel("iPhone Air 17 256 Sky Blue", ""), true);
  assert.equal(hasIphoneModel("for sale laptop only", ""), false);
  assert.equal(hasIphoneModel("IP address setup guide", ""), false);
});

test("Techno / Redmi listings are non-iphone products", () => {
  assert.equal(looksLikeNonIphoneProduct("Techno camon 40 premier", ""), true);
  assert.equal(looksLikeNonIphoneProduct("Redmi note 50 pro 5g", ""), true);
  assert.equal(
    looksLikeNonIphoneProduct(
      "FOR SWAP SA IP16 or for SALE - Acer Aspire 3 15.6-inch - Intel Core i3",
      ""
    ),
    true
  );
  assert.equal(looksLikeNonIphoneProduct("Selling Dell Latitude i5", ""), true);
  assert.equal(looksLikeNonIphoneProduct("iPhone 14 Pro Max 256gb openline", ""), false);
});

test("system unit only does not mean desktop PC", () => {
  assert.equal(
    looksLikeNonIphoneProduct("Iphone 13 white 128gb", "lady own system unit only wala ng box"),
    false
  );
});

test("Acer swap/for-sale listing is dropped as non_iphone_product", () => {
  const decision = shouldSkipAsNoise(
    {
      title:
        "FOR SWAP SA IP16 or for SALE - Acer Aspire 3 15.6-inch - Intel Core i3 processor NO ISSUES",
      description: "COMPLETE SET Bag Charger",
      price_php: 12000
    },
    baseCfg
  );
  assert.equal(decision.skip, true);
  assert.equal(decision.reason, "non_iphone_product");
});

test("swap for iPhone while selling laptop is dropped", () => {
  const decision = shouldSkipAsNoise(
    {
      title: "For sale Acer Aspire / willing swap sa iPhone 16",
      price_php: 15000
    },
    baseCfg
  );
  assert.equal(decision.skip, true);
  assert.equal(decision.reason, "non_iphone_product");
});

test("real iPhone listing is kept", () => {
  const decision = shouldSkipAsNoise(
    {
      title: "iPhone 13 128gb 100% BH openline Iloilo",
      price_php: 14500
    },
    baseCfg
  );
  assert.equal(decision.skip, false);
  assert.equal(decision.reason, null);
});

test("IP16 shorthand phone sale is kept when no non-phone product", () => {
  const decision = shouldSkipAsNoise(
    {
      title: "IP16 128gb openline rush",
      price_php: 38000
    },
    baseCfg
  );
  assert.equal(decision.skip, false);
});

test("listing without any iPhone model is dropped when require model", () => {
  const decision = shouldSkipAsNoise(
    {
      title: "Phone for sale cheap rush",
      price_php: 8000
    },
    baseCfg
  );
  assert.equal(decision.skip, true);
  assert.equal(decision.reason, "no_iphone_model");
});

test("buyer wanted posts are dropped", () => {
  const decision = shouldSkipAsNoise(
    { title: "LF iPhone 13 128gb budget 12k", price_php: null },
    baseCfg
  );
  assert.equal(decision.skip, true);
  assert.equal(decision.reason, "buyer_post");
});

test("swap with no price is dropped", () => {
  const decision = shouldSkipAsNoise(
    { title: "iPhone 12 swap lang sa 13", price_php: null },
    baseCfg
  );
  assert.equal(decision.skip, true);
  assert.equal(decision.reason, "swap_no_price");
});
