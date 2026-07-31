import { DETAIL_NOISE_RE, DETAIL_STOP_RE, LISTED_IN_RE, LOCATION_LINE_RE } from "./constants.mjs";
import {
  cleanText,
  extractBestPhpPriceRaw,
  extractPrice,
  inferDescription,
  inferLocation,
  isPriceOnly,
  isWeakDescription,
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
    lines.push(line);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

/** Prefer the longest single node that looks like a real seller write-up. */
export function pickLongestSellerText(texts, { title = null, priceRaw = null, minLength = 48 } = {}) {
  const titleClean = (cleanText(title) || "").toLowerCase();
  const priceClean = (cleanText(priceRaw) || "").toLowerCase();
  let best = null;
  for (const raw of texts || []) {
    const line = cleanText(raw);
    if (!line || line.length < minLength) continue;
    if (DETAIL_STOP_RE.test(line)) continue;
    if (isDetailChromeLine(line, titleClean, priceClean)) continue;
    if (!best || line.length > best.length) best = line;
  }
  return best;
}

export async function extractDetailFieldsFromPage(page, record) {
  const result = await page.evaluate(() => {
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
      detailTexts: texts.slice(detailsIndex, detailsIndex + 120),
      listedLine,
      aboveFoldTexts: aboveFoldTexts.slice(0, 240),
      detailCondition,
      adPreviewText: Array.from(document.querySelectorAll("[data-ad-preview='message']"))
        .map((el) => (el.innerText || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" | ")
    };
  });

  const allTexts = Array.isArray(result?.allTexts) ? result.allTexts : [];
  const detailTexts = Array.isArray(result?.detailTexts) ? result.detailTexts : [];
  const listedLine = cleanText(result?.listedLine);
  const aboveFoldTexts = Array.isArray(result?.aboveFoldTexts) ? result.aboveFoldTexts : [];
  const detailCondition = cleanText(result?.detailCondition);
  const adPreviewText = cleanText(result?.adPreviewText);
  const primaryPriceRaw = pickPrimaryPriceRaw(aboveFoldTexts);

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
  if (labelIdx >= 0) {
    const sectionLines = collectSellerDescriptionLines(allTexts.slice(labelIdx + 1), {
      title: record.title,
      priceRaw: record.price_raw,
      maxLines: 20
    });
    if (sectionLines.length) {
      sectionDescription = normalizeDetailDescription(sectionLines.join(" | "));
    }
  }

  const joinedLines = lines.length ? normalizeDetailDescription(lines.join(" | ")) : null;
  const longest = pickLongestSellerText(allTexts, {
    title: record.title,
    priceRaw: record.price_raw
  });

  // Prefer the strongest seller text we can find (long single node often wins over short fragments).
  let detailDescription = normalizeDetailDescription(adPreviewText) || sectionDescription || null;
  for (const candidate of [joinedLines, longest]) {
    if (shouldPreferDescription(candidate, detailDescription)) {
      detailDescription = candidate;
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
  const detail = cleanText(detailDescription);
  if (detail && !isWeakDescription(detail)) return detail;

  const bodyLines = String(bodyText || "")
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  const fromBodyLines = collectSellerDescriptionLines(bodyLines, { title, priceRaw, maxLines: 20 });
  const fromBodyJoined = fromBodyLines.length
    ? normalizeDetailDescription(fromBodyLines.join(" | "))
    : null;
  const fromBodyLongest = pickLongestSellerText(bodyLines, { title, priceRaw });
  let fromBody = null;
  for (const candidate of [fromBodyJoined, fromBodyLongest]) {
    if (shouldPreferDescription(candidate, fromBody)) fromBody = candidate;
  }
  if (fromBody && !isWeakDescription(fromBody)) return fromBody;

  if (shouldPreferDescription(detail, fromBody)) return detail;
  if (fromBody) return fromBody;

  const fallback = inferDescription(bodyText || metaOgDescription || "", title, priceRaw);
  return cleanText(fallback);
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
