import test from "node:test";
import assert from "node:assert/strict";

import {
  collectSellerDescriptionLines,
  deriveDescriptionFromDetail,
  looksLikeForeignListingDescription,
  pickLongestSellerText,
  roughProductKey
} from "../scraper/playwright_extra/extract_detail.mjs";
import {
  inferDescription,
  inferTitle,
  isPlaceholderTitle,
  isWeakDescription,
  shouldPreferDescription
} from "../scraper/playwright_extra/utils.mjs";

test("isWeakDescription treats short feed titles as weak", () => {
  assert.equal(isWeakDescription(null), true);
  assert.equal(isWeakDescription(""), true);
  assert.equal(isWeakDescription("Iphone 15 128gb"), true);
  assert.equal(isWeakDescription("Iphone 14"), true);
  assert.equal(
    isWeakDescription(
      "Unit Details: Iphone 14 -White 128GB Battery: 88% Excellent condition, No history of repair"
    ),
    false
  );
});

test("shouldPreferDescription upgrades weak to full seller text", () => {
  const full =
    "🚨 FOR SALE: iPHONE 15 128GB (PINK) Storage: 128GB Color: Pink Inclusions: Complete with box";
  assert.equal(shouldPreferDescription(full, "Iphone 15 128gb"), true);
  assert.equal(shouldPreferDescription("Iphone 15 128gb", full), false);
  assert.equal(shouldPreferDescription(full, null), true);
});

test("Just listed is placeholder and skipped as title", () => {
  assert.equal(isPlaceholderTitle("Just listed"), true);
  assert.equal(isPlaceholderTitle("iPhone 15 128gb Pink"), false);
  const title = inferTitle("Just listed\nIphone 15 128gb\nPHP35,000\nIloilo City, PH-06", "Just listed");
  assert.equal(title, "Iphone 15 128gb");
});

test("discovery inferDescription does not store product title as description", () => {
  const card = "Just listed\nIphone 15 128gb\nPHP35,000\nIloilo City, PH-06";
  const title = inferTitle(card, "Just listed");
  assert.equal(title, "Iphone 15 128gb");
  assert.equal(inferDescription(card, title, "PHP35,000"), null);
});

test("collectSellerDescriptionLines skips early Message seller chrome", () => {
  const texts = [
    "Message seller",
    "Iphone 15 128gb",
    "PHP35,000",
    "Listed 14 hours ago in Iloilo City, PH-06",
    "Details",
    "Condition",
    "Used - like new",
    "🚨 FOR SALE: iPHONE 15 128GB (PINK) 🚨",
    "Storage: 128GB",
    "Color: Pink",
    "Inclusions: Complete with box, cable, and bonus phone cases!",
    "Condition: Excellent, pristine, and ready to use.",
    "⚡ Quick transactions only. No reservations without payment.",
    "Message us now to grab this beauty!",
    "Seller information",
    "Similar items"
  ];
  const lines = collectSellerDescriptionLines(texts, {
    title: "Just listed",
    priceRaw: "PHP35,000",
    maxLines: 20
  });
  const joined = lines.join(" | ");
  assert.match(joined, /FOR SALE: iPHONE 15/i);
  assert.match(joined, /Storage: 128GB/i);
  assert.ok(!isWeakDescription(joined));
  assert.ok(!lines.some((l) => /^message seller$/i.test(l)));
});

test("deriveDescriptionFromDetail rejects weak detail and uses body seller text", () => {
  const body = [
    "Just listed",
    "Iphone 14",
    "PHP20,000",
    "Listed 16 hours ago in Iloilo City, PH-06",
    "Details",
    "Condition",
    "Used - like new",
    "Unit Details: Iphone 14 -White 128GB Ios: 18.7.1 Battery: 88% Excellent condition, No history of repair No dents RFS: Upgrade Inclusions: With original box Original Charger"
  ].join("\n");

  const desc = deriveDescriptionFromDetail({
    bodyText: body,
    metaOgDescription: null,
    title: "Just listed",
    priceRaw: "PHP20,000",
    detailDescription: "Iphone 14"
  });
  assert.ok(desc);
  assert.ok(!isWeakDescription(desc));
  assert.match(desc, /Battery:\s*88%/i);
});

test("pickLongestSellerText prefers long write-up over short title", () => {
  const long =
    "Unit Details: Iphone 14 -White 128GB Battery: 88% Excellent condition, No history of repair";
  const best = pickLongestSellerText(
    ["Iphone 14", "PHP20,000", long, "Iloilo City, PH-06"],
    { title: "Just listed", priceRaw: "PHP20,000" }
  );
  assert.equal(best, long);
});

test("looksLikeForeignListingDescription catches similar-item iPhone 15 paste on iPhone 11", () => {
  const foreign =
    "Just listed PHP36,990 Iphone 15 Pro Max 256GB Openline Natural Titanium 86% Battery Health 338 Cycle count only ILOILO COMPUTER SELLER AND BUYER";
  assert.equal(
    looksLikeForeignListingDescription(foreign, { title: "Ip 11 Pro", priceRaw: "PHP13,000" }),
    true
  );
  assert.equal(roughProductKey("Ip 11 Pro"), "iphone_11_pro");
  assert.equal(roughProductKey(foreign)?.startsWith("iphone_15"), true);
});

test("deriveDescriptionFromDetail does not steal Similar items text when seller desc is short", () => {
  const body = [
    "Ip 11 Pro",
    "PHP13,000",
    "Listed a day ago in Iloilo City, PH-06",
    "Details",
    "Condition",
    "Used - Good",
    "Rush!! ara sa pic details",
    "Similar items",
    "Just listed PHP36,990 Iphone 15 Pro Max 256GB Openline Natural Titanium 86% Battery Health 338 Cycle count only ILOILO COMPUTER SELLER AND BUYER",
    "PHP36,990",
    "Iphone 15 Pro Max 256GB"
  ].join("\n");

  const desc = deriveDescriptionFromDetail({
    bodyText: body,
    metaOgDescription: null,
    title: "Ip 11 Pro",
    priceRaw: "PHP13,000",
    detailDescription: "Rush!! ara sa pic details"
  });
  assert.equal(desc, "Rush!! ara sa pic details");
  assert.ok(!/15 Pro Max/i.test(desc || ""));
});

test("deriveDescriptionFromDetail does not replace short real desc with iPad similar item", () => {
  const body = [
    "For sale iphone13",
    "PHP18,000",
    "Listed 39 minutes ago in Jordan, PH-06",
    "Details",
    "Condition",
    "New",
    "No issue",
    "Similar items",
    "iPad Mini 5 256gb with cellular updated software ios 26 Mini and cutie"
  ].join("\n");

  const desc = deriveDescriptionFromDetail({
    bodyText: body,
    metaOgDescription: null,
    title: "For sale iphone13",
    priceRaw: "PHP18,000",
    detailDescription: "No issue"
  });
  assert.equal(desc, "No issue");
  assert.ok(!/iPad/i.test(desc || ""));
});
