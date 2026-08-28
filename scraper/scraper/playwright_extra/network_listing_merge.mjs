import { cleanText } from "./utils.mjs";

const NETWORK_MERGE_KEYS = [
  "url",
  "title",
  "description",
  "location_raw",
  "price_raw",
  "price_php",
  "listing_status",
  "listing_price_amount",
  "listing_price_formatted",
  "listing_strikethrough_price",
  "listing_is_live",
  "listing_is_sold",
  "listing_is_pending",
  "listing_is_hidden",
  "listing_seller_id",
  "listing_seller_name",
  "listing_category_name",
  "listing_leaf_category_name",
  "listing_taxonomy_name",
  "listing_location_city",
  "listing_location_state",
  "posted_at"
];

function fieldPresent(key, value) {
  if (key.startsWith("listing_is_")) return typeof value === "boolean";
  if (key === "listing_price_amount" || key === "price_php") {
    return value != null && Number.isFinite(Number(value));
  }
  return !!cleanText(value);
}

/** Higher = more GraphQL fields filled (seller weighted highest). */
export function networkListingCompletenessScore(row) {
  if (!row) return 0;
  let score = 0;
  if (cleanText(row.listing_seller_id)) score += 8;
  if (cleanText(row.listing_seller_name)) score += 4;
  if (row.listing_price_amount != null && Number.isFinite(Number(row.listing_price_amount))) score += 2;
  if (cleanText(row.listing_price_formatted)) score += 1;
  if (typeof row.listing_is_live === "boolean") score += 1;
  if (typeof row.listing_is_sold === "boolean") score += 1;
  if (cleanText(row.listing_category_name)) score += 1;
  if (cleanText(row.listing_leaf_category_name)) score += 1;
  if (cleanText(row.listing_location_city)) score += 1;
  if (cleanText(row.description)) score += 1;
  return score;
}

/** Merge two normalized network listing rows, preferring fuller GraphQL data. */
export function mergeNetworkListingRow(existing, incoming) {
  if (!existing) return incoming || null;
  if (!incoming) return existing || null;

  const merged = { ...existing };
  for (const key of NETWORK_MERGE_KEYS) {
    const exOk = fieldPresent(key, existing[key]);
    const inOk = fieldPresent(key, incoming[key]);
    if (!exOk && inOk) {
      merged[key] = incoming[key];
    }
  }

  const exScore = networkListingCompletenessScore(existing);
  const inScore = networkListingCompletenessScore(incoming);
  if (inScore > exScore) {
    for (const key of NETWORK_MERGE_KEYS) {
      if (fieldPresent(key, incoming[key])) merged[key] = incoming[key];
    }
  }

  return merged;
}
