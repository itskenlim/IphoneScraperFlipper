import test from "node:test";
import assert from "node:assert/strict";

import { normalizeListingDescription } from "../scraper/playwright_extra/utils.mjs";

test("strips See less chrome and pipe-duplicated description", () => {
  const raw =
    "Iphone 13, 128GB Starlight Details: Under Warranty pa ZPA variant (local) With box and charger 90%BH (kunat2) All parts original No history of repair 18,999 may lp pa See less | Iphone 13, 128GB Starlight Details: Under Warranty pa ZPA variant (local) With box and charger 90%BH (kunat2) All parts original No history of repair 18,999 may lp pa | See less";
  const out = normalizeListingDescription(raw);
  assert.ok(out);
  assert.equal((out.match(/Iphone 13/gi) || []).length, 1);
  assert.equal(/\bsee\s+less\b/i.test(out), false);
  assert.ok(out.includes("90%BH"));
});

test("leaves unique pipe segments alone", () => {
  const out = normalizeListingDescription("Face ID working | TrueTone working | openline");
  assert.equal(out, "Face ID working TrueTone working openline");
});
