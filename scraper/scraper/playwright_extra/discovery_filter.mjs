/**
 * Discovery noise filter: keep iPhone seller listings, drop swap/junk/non-phone gear.
 * Used by jobs.mjs (ingest) and cleanup scripts (existing rows).
 */

import { looksLikeBuyerWantedPost } from "./utils.mjs";

/**
 * Normalize Marketplace title quirks: `iPhone+15`, `13PROMAX`, `7Plus`.
 */
export function normalizeListingText(value) {
  let s = String(value || "");
  s = s.replace(/\+/g, " ");
  // Split glued variant tokens onto the model number.
  s = s.replace(/([0-9]|se|x|xs|xr)(promax|pro|plus|max|mini|e)\b/gi, "$1 $2");
  s = s.replace(/\b(pro)(max)\b/gi, "$1 $2");
  return s.replace(/\s+/g, " ").trim();
}

/** Full "iPhone 13" / "iphone 16e" / "iPhone Air" style (after normalize). */
export const IPHONE_MODEL_RE =
  /\biphone\s*(?:air(?:\s*1[7-9])?|se(?:\s*[23])?|x[rs]?|1[1-7](?:\s*e)?|[7-9])(?:\s*(?:pro(?:\s*max)?|plus|max|mini))?\b/i;

/**
 * Common PH Marketplace shorthand: IP11, IP 13, IP15PRO, ip16, IP16e.
 */
export const IPHONE_SHORTHAND_RE =
  /\bip\s*(?:air(?:\s*1[7-9])?|se|x[rs]?|1[1-7](?:\s*e)?|[7-9])(?:\s*(?:pro(?:\s*max)?|plus|max|mini))?\b/i;

/**
 * Non-iPhone products that show up in "query=iphone" results (swap-for-iPhone, wrong category).
 */
export const NON_IPHONE_PRODUCT_RE =
  /\b(?:acer|aspire|laptop|notebook|chromebook|macbook|imac|desktop\s*pc|pc\s*unit|intel\s*core|core\s*i[3579]|ryzen|thinkpad|ideapad|pavilion|inspiron|vivobook|zenbook|legion|predator|nitro|rog\s*strix|dell|lenovo|asus|huawei\s*matebook|microsoft\s*surface|ipad|apple\s*watch|samsung\s*galaxy|xiaomi|redmi|oppo|vivo|realme|infinix|tecno|techno|nokia|motorola|oneplus|android\s*phone|gaming\s*laptop|ultrabook|camon)\b/i;

export const DEFAULT_EXCLUDE_KEYWORDS = [
  "acer",
  "aspire",
  "laptop",
  "notebook",
  "macbook",
  "chromebook",
  "intel core",
  "dell",
  "lenovo",
  "thinkpad",
  "asus",
  "ipad",
  "samsung galaxy",
  "xiaomi",
  "redmi",
  "oppo",
  "vivo",
  "android",
  "tecno",
  "techno",
  "infinix"
];

export function parseKeywordList(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function mergeExcludeKeywords(cfgKeywords) {
  const fromCfg = parseKeywordList(cfgKeywords);
  const set = new Set([...DEFAULT_EXCLUDE_KEYWORDS, ...fromCfg]);
  return [...set];
}

export function hasIphoneModel(title, description) {
  const text = normalizeListingText(`${title || ""} ${description || ""}`);
  if (!text) return false;
  return IPHONE_MODEL_RE.test(text) || IPHONE_SHORTHAND_RE.test(text);
}

export function looksLikeNonIphoneProduct(title, description) {
  const text = normalizeListingText(`${title || ""} ${description || ""}`);
  if (!text) return false;
  return NON_IPHONE_PRODUCT_RE.test(text);
}

/**
 * @param {object} row
 * @param {object} cfg
 * @returns {{ skip: boolean, reason: string | null }}
 */
export function shouldSkipAsNoise(row, cfg = {}) {
  const titleRaw = String(row?.title || "");
  const title = normalizeListingText(titleRaw).toLowerCase();
  const description = String(row?.description || "");
  const price = row?.price_php;

  if (cfg.discoveryFilterBuyers !== false) {
    if (looksLikeBuyerWantedPost(titleRaw)) return { skip: true, reason: "buyer_post" };
  }

  // Strong signal: listing is clearly offering a non-iPhone product (even if it says "swap sa IP16").
  if (cfg.discoveryRejectNonIphoneProduct !== false) {
    if (looksLikeNonIphoneProduct(titleRaw, description)) {
      return { skip: true, reason: "non_iphone_product" };
    }
  }

  const keywords =
    cfg.discoveryExcludeKeywordsMerged ||
    mergeExcludeKeywords(cfg.discoveryExcludeKeywords);
  for (const k of keywords) {
    if (k && title.includes(k)) return { skip: true, reason: "exclude_keyword" };
  }

  const swapLike = /\bswap\b/i.test(title) || /\bswap\b/i.test(description);
  if (swapLike) {
    if (!(typeof price === "number" && Number.isFinite(price) && price >= (cfg.discoveryMinPricePhp || 0))) {
      return { skip: true, reason: "swap_no_price" };
    }
  }

  const hasModel = hasIphoneModel(titleRaw, description);
  const requireModel = cfg.discoveryRequireIphoneModel !== false;
  if (requireModel) {
    if (!hasModel) return { skip: true, reason: "no_iphone_model" };
  }

  if (Number.isFinite(cfg.discoveryMinPricePhp) && cfg.discoveryMinPricePhp > 0) {
    if (typeof price === "number" && Number.isFinite(price) && price < cfg.discoveryMinPricePhp) {
      return { skip: true, reason: "min_price" };
    }
    if (price == null) {
      if (requireModel && hasModel) {
        return { skip: false, reason: null };
      }
      return { skip: true, reason: "no_price" };
    }
  }

  return { skip: false, reason: null };
}
