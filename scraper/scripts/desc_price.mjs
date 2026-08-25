/**
 * Extract seller *asking* prices from Marketplace descriptions.
 * Ignores reference prices (orig / bought / SRP / retail).
 */

const AMOUNT_RE =
  /(?:₱|php\.?\s*|p\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,6}(?:\.\d+)?|\d{2,3}(?:\.\d+)?\s*k)\b/gi;

/** Cues that mean the number is history / retail, not the ask. */
const REF_TOKEN_RE =
  /\b(?:orig(?:inal)?|bought|binili|srp|retail|msrp|worth|was|purchase(?:d)?|acquisition|market\s*value)\b/gi;

/**
 * Cues that mean the number is the selling ask.
 * Prefer `price:` over bare `price` so "bought price is 15k" stays reference.
 */
const ASK_TOKEN_RE =
  /\b(?:price\s*:|selling|asking|nego|negotiable|for\s*sale|sale\s*price|last\s*price|\blp\b|promo|rush|fixed|firm)\b/gi;

/**
 * @param {string} raw
 * @returns {number | null}
 */
export function parsePhpAmountToken(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  if (!s) return null;

  if (s.endsWith("k")) {
    const n = Number.parseFloat(s.slice(0, -1));
    if (!Number.isFinite(n) || n <= 0) return null;
    const php = Math.round(n * 1000);
    return php >= 1000 && php <= 500_000 ? php : null;
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const php = Math.round(n);
  // Phone asks in PH Marketplace are almost never below 1k or above 500k in desc.
  if (php < 1000 || php > 500_000) return null;
  return php;
}

/**
 * @param {string} text
 * @param {RegExp} re
 * @returns {number} last match index, or -1
 */
function lastMatchIndex(text, re) {
  re.lastIndex = 0;
  let last = -1;
  let m;
  while ((m = re.exec(text)) !== null) last = m.index;
  return last;
}

/**
 * Last cue wins: "Binili ko 28k, selling 22,000" → ask; "orig bought price is 15k" → ref.
 * @param {string} before
 * @returns {"ref" | "ask" | null}
 */
function classifyBeforeCue(before) {
  const refIdx = lastMatchIndex(before, REF_TOKEN_RE);
  const askIdx = lastMatchIndex(before, ASK_TOKEN_RE);
  if (refIdx < 0 && askIdx < 0) return null;
  if (askIdx > refIdx) return "ask";
  if (refIdx > askIdx) return "ref";
  return null;
}

/**
 * @param {string | null | undefined} text
 * @returns {number[]}
 */
export function extractAskPricesFromDescription(text) {
  const raw = String(text || "");
  if (!raw.trim()) return [];

  const out = [];
  const seen = new Set();
  AMOUNT_RE.lastIndex = 0;
  let m;
  while ((m = AMOUNT_RE.exec(raw)) !== null) {
    const amount = parsePhpAmountToken(m[1]);
    if (amount == null) continue;

    const before = raw.slice(Math.max(0, m.index - 64), m.index);
    const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 16);
    const cue = classifyBeforeCue(before);

    if (cue === "ref") continue;

    const askLike =
      cue === "ask" ||
      /\bfor\s+(?:₱|php\.?\s*|p\s*)?$/i.test(before) ||
      /^\s*only\b/i.test(after) ||
      // "Price: ₱30,000" when colon form already in ASK_TOKEN; bare ₱ after "Price "
      /\bprice\s*:?\s*(?:₱|php\.?\s*|p\s*)?$/i.test(before);

    if (!askLike) continue;
    if (seen.has(amount)) continue;
    seen.add(amount);
    out.push(amount);
  }

  return out;
}

/**
 * Best single ask-like price from description (highest when several).
 * @param {string | null | undefined} text
 * @returns {number | null}
 */
export function extractAskPriceFromDescription(text) {
  const prices = extractAskPricesFromDescription(text);
  if (!prices.length) return null;
  return Math.max(...prices);
}

/**
 * Desc ask is high enough vs listing field to treat as bait / override.
 */
export function isMateriallyHigherDescAsk(descAsk, listingAsk, opts = {}) {
  const minRatio = opts.minRatio ?? 1.25;
  const minAbs = opts.minAbsPhp ?? 3000;
  if (!(typeof descAsk === "number" && Number.isFinite(descAsk))) return false;
  if (!(typeof listingAsk === "number" && Number.isFinite(listingAsk) && listingAsk > 0)) {
    return false;
  }
  return descAsk >= listingAsk * minRatio && descAsk - listingAsk >= minAbs;
}
