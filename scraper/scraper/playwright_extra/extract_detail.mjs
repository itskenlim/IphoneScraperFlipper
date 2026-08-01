import { DETAIL_NOISE_RE, DETAIL_STOP_RE, LISTED_IN_RE, LOCATION_LINE_RE } from "./constants.mjs";
import {
  cleanText,
  extractBestPhpPriceRaw,
  extractPrice,
  inferDescription,
  inferLocation,
  isPriceOnly,
  isWeakDescription,
  parsePhpPrice,
  shouldPreferDescription
} from "./utils.mjs";

export function looksLikeUnavailableListing(bodyText, debug) {
  const body = String(bodyText || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ");
  const markers = [
    "this listing isn't available",
    "this listing isn't available anymore",
    "this listing is not available",
    "this listing is no longer available",
    "this content isn't available",
    "something went wrong",
    "page isn't available",
    "page not found"
  ];
  for (const m of markers) {
    if (body.includes(m)) {
      if (debug) debug.match = m;
      return true;
    }
  }
  return false;
}

export function looksLikeSoldListing(bodyText, debug) {
  const body = String(bodyText || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ");
  const markers = ["this item is sold", "this listing is sold", "marked as sold"];
  for (const m of markers) {
    if (body.includes(m)) {
      if (debug) debug.match = m;
      return true;
    }
  }
  // Marketplace header badge, e.g. "Sold · iPhone 11".
  if (/\bsold\s*(?:·|•|\||-)\s+/i.test(body) || /(?:^|\n)\s*sold\s*[·•]?\s+\S/i.test(body)) {
    if (debug) debug.match = "sold_badge";
    return true;
  }
  return false;
}

export function cleanOgTitle(value) {
  const title = cleanText(value);
  if (!title) return null;
  const lowered = title.toLowerCase();
  if (lowered.includes("facebook marketplace")) return null;
  if (lowered === "marketplace") return null;
  return title;
}

function normalizeDetailDescription(value) {
  const text = cleanText(value);
  if (!text) return null;
  const parts = text
    .split("|")
    .map((p) => cleanText(p))
    .filter(Boolean);
  if (!parts.length) return null;

  if (parts[0].toLowerCase() === "condition") parts.shift();
  if (parts[0] && /^(used|new)\s*-\s*/i.test(parts[0])) parts.shift();

  const joined = cleanText(parts.join(" | "));
  return joined || null;
}

function pickPrimaryPriceRaw(texts) {
  if (!Array.isArray(texts) || !texts.length) return null;
  for (const raw of texts) {
    const line = cleanText(raw);
    if (!line) continue;
    if (isPriceOnly(line)) return extractPrice(line) || line;
  }
  // Fallback: short lines near top sometimes include separators; still prefer the first price.
  for (const raw of texts) {
    const line = cleanText(raw);
    if (!line) continue;
    if (line.length > 48) continue;
    const p = extractPrice(line);
    if (p) return p;
  }
  return null;
}

function isDetailChromeLine(line, titleClean, priceClean) {
  const lowered = String(line || "").toLowerCase();
  if (!lowered) return true;
  if (DETAIL_NOISE_RE.test(line)) return true;
  if (lowered === "condition") return true;
  if (/^(used|new)\s*-\s*/i.test(line)) return true;
  if (titleClean && lowered === titleClean) return true;
  if (priceClean && lowered === priceClean) return true;
  if (isPriceOnly(line)) return true;
  if (LOCATION_LINE_RE.test(line)) return true;
  if (/listed .+ in .+/i.test(line)) return true;
  if (/^just listed$/i.test(lowered)) return true;
  return false;
}

/** Rough product key for cross-listing contamination checks (iphone_11_pro vs iphone_15_promax). */
export function roughProductKey(text) {
  const t = String(text || "")
    .toLowerCase()
    .replace(/\+/g, " ");
  if (/\bipad\b/.test(t)) {
    const m = /\bipad\s*(mini|air|pro)?\s*(\d{1,2})?/i.exec(t);
    return `ipad_${(m?.[1] || "generic").toLowerCase()}_${m?.[2] || ""}`.replace(/_+$/, "");
  }
  // "Ip 11 Pro", "iPhone 15 Pro Max", "iphone13"
  const m =
    /\b(?:iphone|ip)\s*(\d{1,2})\s*(pro\s*max|promax|pro|plus|air|e)?/i.exec(t) ||
    /\biphone\s*(\d{1,2})\b/i.exec(t);
  if (!m) return null;
  const variant = String(m[2] || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  return `iphone_${m[1]}_${variant}`.replace(/_+$/, "");
}

function extractMentionedPrices(text) {
  const raw = String(text || "");
  const out = [];
  const re = /(?:\u20b1|php)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let match = re.exec(raw);
  while (match) {
    const n = parsePhpPrice(match[0]);
    if (n != null) out.push(n);
    match = re.exec(raw);
  }
  return out;
}

/**
 * True when candidate text looks like another Marketplace card / similar-item bleed
 * (wrong price, feed "Just listed PHP…", or different model than the listing title).
 */
export function looksLikeForeignListingDescription(value, { title = null, priceRaw = null } = {}) {
  const desc = cleanText(value);
  if (!desc) return false;

  // Feed-card paste: "Just listed PHP36,990 Iphone 15 Pro Max…"
  if (/^just listed\s*(?:\u20b1|php)?\s*\d/i.test(desc)) return true;
  if (/just listed\s*(?:\u20b1|php)\s*[\d,]+/i.test(desc) && desc.length > 60) return true;

  const listingPrice = parsePhpPrice(priceRaw);
  if (listingPrice != null) {
    const mentioned = extractMentionedPrices(desc);
    for (const p of mentioned) {
      // Another card's sticker price glued into this description.
      if (Math.abs(p - listingPrice) / listingPrice >= 0.35 && Math.abs(p - listingPrice) >= 3000) {
        return true;
      }
    }
  }

  const titleKey = roughProductKey(title);
  const descKey = roughProductKey(desc);
  if (titleKey && descKey) {
    const titleFamily = titleKey.split("_").slice(0, 2).join("_"); // iphone_11
    const descFamily = descKey.split("_").slice(0, 2).join("_");
    if (titleFamily.startsWith("iphone_") && descFamily.startsWith("ipad")) return true;
    if (titleFamily.startsWith("ipad") && descFamily.startsWith("iphone_")) return true;
    if (titleFamily !== descFamily) return true;
  }

  return false;
}

export function isAcceptableListingDescription(value, ctx = {}) {
  const desc = cleanText(value);
  if (!desc) return false;
  if (looksLikeForeignListingDescription(desc, ctx)) return false;
  return true;
}

function detailsStopIndex(texts) {
  const source = Array.isArray(texts) ? texts : [];
  for (let i = 0; i < source.length; i += 1) {
    if (DETAIL_STOP_RE.test(source[i] || "")) return i;
  }
  return source.length;
}

/** Collect seller-body lines from Marketplace detail text nodes (pure; unit-testable). */
export function collectSellerDescriptionLines(texts, { title = null, priceRaw = null, maxLines = 20 } = {}) {
  const titleClean = (cleanText(title) || "").toLowerCase();
  const priceClean = (cleanText(priceRaw) || "").toLowerCase();
  const source = Array.isArray(texts) ? texts : [];
  const lowered = source.map((t) => String(t || "").trim().toLowerCase());

  let startIdx = lowered.findIndex((t) => t === "details" || t === "detail");
  if (startIdx < 0) {
    const conditionIdx = lowered.findIndex((t) => t === "condition");
    startIdx = conditionIdx >= 0 ? conditionIdx : 0;
  }

  const seen = new Set();
  const lines = [];
  for (let i = startIdx; i < source.length; i += 1) {
    const line = cleanText(source[i]);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Ignore early chrome ("Message seller") before any seller text; stop after we have content.
    if (DETAIL_STOP_RE.test(line)) {
      if (lines.length) break;
      continue;
    }
    if (isDetailChromeLine(line, titleClean, priceClean)) continue;
    if (line.length < 4) continue;
    if (looksLikeForeignListingDescription(line, { title, priceRaw })) continue;
    lines.push(line);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

/**
 * Prefer the longest single node that looks like a real seller write-up.
 * Only call this on detail-scoped texts (after Details / before Similar items) — never page-wide.
 */
export function pickLongestSellerText(texts, { title = null, priceRaw = null, minLength = 48 } = {}) {
  const titleClean = (cleanText(title) || "").toLowerCase();
  const priceClean = (cleanText(priceRaw) || "").toLowerCase();
  let best = null;
  for (const raw of texts || []) {
    const line = cleanText(raw);
    if (!line || line.length < minLength) continue;
    if (DETAIL_STOP_RE.test(line)) continue;
    if (isDetailChromeLine(line, titleClean, priceClean)) continue;
    if (looksLikeForeignListingDescription(line, { title, priceRaw })) continue;
    if (!best || line.length > best.length) best = line;
  }
  return best;
}

function preferDescriptionCandidate(next, prev, ctx) {
  if (!isAcceptableListingDescription(next, ctx)) return false;
  if (prev && !isAcceptableListingDescription(prev, ctx)) {
    return Boolean(cleanText(next));
  }
  return shouldPreferDescription(next, prev);
}

export async function extractDetailFieldsFromPage(page, record) {
  const result = await page.evaluate((stopReSource) => {
    const stopRe = new RegExp(stopReSource, "i");
    const nodes = Array.from(
      document.querySelectorAll(
        "span[dir='auto'], div[dir='auto'], [data-ad-preview='message'], [role='article'] span, [role='main'] span"
      )
    );
    const texts = [];
    const aboveFoldTexts = [];
    const foldBottom = Math.floor(window.innerHeight * 1.6);
    for (const el of nodes) {
      const t = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (!t) continue;
      texts.push(t);
      try {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < foldBottom) {
          aboveFoldTexts.push(t);
        }
      } catch {}
    }
    const lowered = texts.map((t) => t.toLowerCase());
    let detailsIndex = lowered.findIndex((t) => t === "details" || t === "detail");
    if (detailsIndex < 0) {
      const conditionIdx = lowered.findIndex((t) => t === "condition");
      detailsIndex = conditionIdx >= 0 ? conditionIdx : 0;
    }
    // Hard-cap detail window at Similar items / seller chrome so we never scan recommendations.
    let stopIndex = texts.length;
    for (let i = detailsIndex + 1; i < texts.length; i += 1) {
      if (stopRe.test(texts[i] || "")) {
        stopIndex = i;
        break;
      }
    }
    const listedLine = texts.find((t) => /\blisted\b/i.test(t)) || null;

    let detailCondition = null;
    const conditionIdx = lowered.findIndex((t) => t === "condition");
    if (conditionIdx >= 0) {
      for (let i = conditionIdx + 1; i < Math.min(lowered.length, conditionIdx + 6); i += 1) {
        const v = texts[i];
        if (!v) continue;
        if (String(v).toLowerCase() === "condition") continue;
        detailCondition = v;
        break;
      }
    }

    return {
      allTexts: texts,
      detailTexts: texts.slice(detailsIndex, Math.min(stopIndex, detailsIndex + 120)),
      listedLine,
      aboveFoldTexts: aboveFoldTexts.slice(0, 240),
      detailCondition,
      adPreviewText: Array.from(document.querySelectorAll("[data-ad-preview='message']"))
        .map((el) => (el.innerText || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" | ")
    };
  }, DETAIL_STOP_RE.source);

  const allTexts = Array.isArray(result?.allTexts) ? result.allTexts : [];
  const detailTexts = Array.isArray(result?.detailTexts) ? result.detailTexts : [];
  const listedLine = cleanText(result?.listedLine);
  const aboveFoldTexts = Array.isArray(result?.aboveFoldTexts) ? result.aboveFoldTexts : [];
  const detailCondition = cleanText(result?.detailCondition);
  const adPreviewText = cleanText(result?.adPreviewText);
  const primaryPriceRaw = pickPrimaryPriceRaw(aboveFoldTexts);
  const ctx = { title: record.title, priceRaw: record.price_raw };

  let detailLocation = null;
  for (const raw of allTexts) {
    const line = cleanText(raw);
    if (!line) continue;
    const listed = LISTED_IN_RE.exec(line);
    if (listed && cleanText(listed[1])) {
      detailLocation = cleanText(listed[1]);
      break;
    }
    if (LOCATION_LINE_RE.test(line)) {
      detailLocation = line;
      break;
    }
    const embedded = /([A-Za-z][A-Za-z0-9 .,'-]+,\s*PH-\d{2})/i.exec(line);
    if (embedded && cleanText(embedded[1])) {
      detailLocation = cleanText(embedded[1]);
      break;
    }
  }

  const lines = collectSellerDescriptionLines(detailTexts, {
    title: record.title,
    priceRaw: record.price_raw,
    maxLines: 20
  });

  const loweredAll = allTexts.map((t) => String(t || "").trim().toLowerCase());
  const descriptionLabels = new Set([
    "description",
    "about this item",
    "deskripsyon",
    "paglalarawan"
  ]);
  let sectionDescription = null;
  const labelIdx = loweredAll.findIndex((t) => descriptionLabels.has(t));
  const stopIdx = detailsStopIndex(allTexts);
  if (labelIdx >= 0 && labelIdx < stopIdx) {
    const sectionLines = collectSellerDescriptionLines(allTexts.slice(labelIdx + 1, stopIdx), {
      title: record.title,
      priceRaw: record.price_raw,
      maxLines: 20
    });
    if (sectionLines.length) {
      sectionDescription = normalizeDetailDescription(sectionLines.join(" | "));
    }
  }

  const joinedLines = lines.length ? normalizeDetailDescription(lines.join(" | ")) : null;
  // Only longest within the detail window — never page-wide (Similar items bleed).
  const longest = pickLongestSellerText(detailTexts, {
    title: record.title,
    priceRaw: record.price_raw
  });

  let detailDescription = null;
  for (const candidate of [adPreviewText, sectionDescription, joinedLines, longest]) {
    const normalized = normalizeDetailDescription(candidate) || cleanText(candidate);
    if (preferDescriptionCandidate(normalized, detailDescription, ctx)) {
      detailDescription = normalized;
    }
  }

  return {
    detailDescription,
    detailLocation,
    listedLine,
    aboveFoldTexts,
    primaryPriceRaw,
    detailCondition,
    allTexts
  };
}

export function deriveDescriptionFromDetail({ bodyText, metaOgDescription, title, priceRaw, detailDescription }) {
  const ctx = { title, priceRaw };
  const detail = cleanText(detailDescription);
  if (detail && !isWeakDescription(detail) && isAcceptableListingDescription(detail, ctx)) return detail;

  const bodyLines = String(bodyText || "")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  // Stop body scan at Similar items — do NOT pickLongest across the whole page.
  const stopAt = detailsStopIndex(bodyLines);
  const scopedBody = bodyLines.slice(0, stopAt);
  const fromBodyLines = collectSellerDescriptionLines(scopedBody, { title, priceRaw, maxLines: 20 });
  const fromBodyJoined = fromBodyLines.length
    ? normalizeDetailDescription(fromBodyLines.join(" | "))
    : null;
  const fromBodyLongest = pickLongestSellerText(scopedBody, { title, priceRaw });
  let fromBody = null;
  for (const candidate of [fromBodyJoined, fromBodyLongest]) {
    if (preferDescriptionCandidate(candidate, fromBody, ctx)) fromBody = candidate;
  }
  if (fromBody && !isWeakDescription(fromBody) && isAcceptableListingDescription(fromBody, ctx)) {
    return fromBody;
  }

  // Keep a short real seller blurb ("No issue") rather than fishing Similar items for a longer foreign desc.
  if (detail && isAcceptableListingDescription(detail, ctx)) return detail;
  if (fromBody && isAcceptableListingDescription(fromBody, ctx)) return fromBody;

  const fallback = inferDescription(scopedBody.join("\n") || metaOgDescription || "", title, priceRaw);
  if (fallback && isAcceptableListingDescription(fallback, ctx)) return cleanText(fallback);
  return null;
}

export function derivePriceRawFromDetail({ bodyText, metaOgDescription, fallback }) {
  const head = String(bodyText || "").slice(0, 4000);

  // Prefer the first visible price (top of page) over "best"/max across the entire body,
  // because the body can include "similar items" with unrelated prices.
  return (
    extractPrice(head) ||
    extractPrice(metaOgDescription || "") ||
    extractBestPhpPriceRaw(head) ||
    extractBestPhpPriceRaw(metaOgDescription || "") ||
    cleanText(fallback)
  );
}

export function deriveLocationFromDetail({ bodyText, detailLocation, fallback }) {
  return cleanText(detailLocation) || inferLocation(bodyText || "") || cleanText(fallback);
}
