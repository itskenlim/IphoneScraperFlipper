import test from "node:test";
import assert from "node:assert/strict";

import {
  collectSellerDescriptionLines,
  deriveDescriptionFromDetail,
  pickLongestSellerText
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
