import { cleanText, envBool, envInt } from "./utils.mjs";

export const MONITOR_TIERS = ["hot", "warm", "cold"];

function parseIsoMs(value) {
  const s = cleanText(value);
  if (!s) return null;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function readMonitorScheduleConfig() {
  const scheduler = cleanText(process.env.PLAYWRIGHT_MONITOR_SCHEDULER)?.toLowerCase() || "tiered";
  return {
    scheduler: scheduler === "legacy" ? "legacy" : "tiered",
    hotMaxAgeDays: envInt("PLAYWRIGHT_MONITOR_HOT_MAX_AGE_DAYS", 3),
    warmMaxAgeDays: envInt("PLAYWRIGHT_MONITOR_WARM_MAX_AGE_DAYS", 7),
    hotIntervalHours: envInt("PLAYWRIGHT_MONITOR_HOT_INTERVAL_HOURS", 6),
    warmIntervalHours: envInt("PLAYWRIGHT_MONITOR_WARM_INTERVAL_HOURS", 24),
    coldIntervalHours: envInt("PLAYWRIGHT_MONITOR_COLD_INTERVAL_HOURS", 168),
    priceChangeHotHours: envInt("PLAYWRIGHT_MONITOR_PRICE_CHANGE_HOT_HOURS", 48),
    coldStalePriceDays: envInt("PLAYWRIGHT_MONITOR_COLD_STALE_PRICE_DAYS", 7),
    /** Stop visiting non-deal listings older than this (comps still use last-known prices). */
    maxMonitorAgeDays: envInt("PLAYWRIGHT_MONITOR_MAX_AGE_DAYS", 7),
    /** A/B/C deals stay on the monitor queue longer so Best deals stay fresh. */
    maxDealMonitorAgeDays: envInt("PLAYWRIGHT_MONITOR_DEAL_MAX_AGE_DAYS", 14),
    failLockoutBaseMinutes: envInt("PLAYWRIGHT_MONITOR_FAIL_LOCKOUT_BASE_MINUTES", 5),
    failLockoutMaxMinutes: envInt("PLAYWRIGHT_MONITOR_FAIL_LOCKOUT_MAX_MINUTES", 120),
    fetchPoolMultiplier: envInt("PLAYWRIGHT_MONITOR_FETCH_POOL_MULTIPLIER", 3)
  };
}

export function listingAgeMs(listing, nowMs = Date.now()) {
  const anchor = parseIsoMs(listing?.posted_at) ?? parseIsoMs(listing?.first_seen_at) ?? parseIsoMs(listing?.last_seen_at);
  if (anchor == null) return null;
  return Math.max(0, nowMs - anchor);
}

export function hoursSince(value, nowMs = Date.now()) {
  const ms = parseIsoMs(value);
  if (ms == null) return null;
  return (nowMs - ms) / (1000 * 60 * 60);
}

export function daysSince(value, nowMs = Date.now()) {
  const hrs = hoursSince(value, nowMs);
  if (hrs == null) return null;
  return hrs / 24;
}

export function normalizeDealScore(dealScore) {
  const score = String(dealScore || "").toUpperCase();
  if (score === "A" || score === "B" || score === "C" || score === "D" || score === "NA") return score;
  return null;
}

/** Resolve deal score from a flat field or nested `deal` / `deal_metrics` join. */
export function dealScoreFromListing(listing) {
  if (!listing || typeof listing !== "object") return null;
  const direct = normalizeDealScore(listing.deal_score);
  if (direct) return direct;
  const deal = listing.deal ?? listing.deal_metrics;
  if (Array.isArray(deal)) return normalizeDealScore(deal[0]?.deal_score);
  if (deal && typeof deal === "object") return normalizeDealScore(deal.deal_score);
  return null;
}

/**
 * Classify an active listing for monitor cadence.
 * hot  — new, strong deal score, or recent price movement
 * warm — mid-age / middling score; still worth periodic checks
 * cold — old, weak score, stale price (flipper tail)
 */
export function computeMonitorTier(listing, dealScore, config, nowMs = Date.now()) {
  const score = normalizeDealScore(dealScore) ?? dealScoreFromListing(listing);
  const ageMs = listingAgeMs(listing, nowMs);
  const ageDays = ageMs == null ? null : ageMs / (24 * 60 * 60 * 1000);

  if (score === "A" || score === "B") return "hot";

  const priceChangeHrs = hoursSince(listing?.last_price_change_at, nowMs);
  if (priceChangeHrs != null && priceChangeHrs <= config.priceChangeHotHours) return "hot";

  if (ageDays != null && ageDays <= config.hotMaxAgeDays) return "hot";

  if (ageDays != null && ageDays > config.warmMaxAgeDays) {
    const priceStale =
      listing?.last_price_change_at == null ||
      (daysSince(listing.last_price_change_at, nowMs) ?? 0) >= config.coldStalePriceDays;
    if ((score === "D" || score === "NA" || score == null) && priceStale) return "cold";
    if (score === "C") return "warm";
    return "cold";
  }

  return "warm";
}

export function intervalHoursForTier(tier, config) {
  if (tier === "hot") return Math.max(1, config.hotIntervalHours);
  if (tier === "cold") return Math.max(1, config.coldIntervalHours);
  return Math.max(1, config.warmIntervalHours);
}

export function addHoursIso(iso, hours) {
  const ms = parseIsoMs(iso) ?? Date.now();
  return new Date(ms + hours * 60 * 60 * 1000).toISOString();
}

export function computeNextCheckAt(listing, dealScore, config, nowIso = new Date().toISOString()) {
  const nowMs = parseIsoMs(nowIso) ?? Date.now();
  const tier = computeMonitorTier(listing, dealScore, config, nowMs);
  const hours = intervalHoursForTier(tier, config);
  return { tier, nextCheckAt: addHoursIso(nowIso, hours) };
}

export function lockoutMinutes(failCount, config) {
  const count = Math.max(1, Number(failCount) || 1);
  const base = Math.max(1, config.failLockoutBaseMinutes);
  const max = Math.max(base, config.failLockoutMaxMinutes);
  const exponent = Math.min(Math.max(0, count - 1), 8);
  return Math.min(max, base * 2 ** exponent);
}

export function computeFailureLockout(failCount, config, nowMs = Date.now()) {
  const minutes = lockoutMinutes(failCount, config);
  return new Date(nowMs + minutes * 60 * 1000).toISOString();
}

export function isListingDueForMonitor(listing, nowMs = Date.now()) {
  const lockoutMs = parseIsoMs(listing?.monitor_lockout_until);
  if (lockoutMs != null && lockoutMs > nowMs) return false;

  const nextMs = parseIsoMs(listing?.monitor_next_check_at);
  if (nextMs == null) return true;
  return nextMs <= nowMs;
}

/** Age cap for this listing: deals (A/B/C) use the longer deal window. */
export function maxMonitorAgeDaysForListing(listing, config) {
  const score = dealScoreFromListing(listing);
  const baseMax = Math.max(1, config?.maxMonitorAgeDays ?? 7);
  const dealMax = Math.max(baseMax, config?.maxDealMonitorAgeDays ?? 14);
  if (score === "A" || score === "B" || score === "C") return dealMax;
  return baseMax;
}

/** True when the listing is past its monitor age cap (posted/first seen). */
export function isTooOldToMonitor(listing, config, nowMs = Date.now()) {
  const maxDays = maxMonitorAgeDaysForListing(listing, config);
  const ageMs = listingAgeMs(listing, nowMs);
  if (ageMs == null) return false;
  return ageMs > maxDays * 24 * 60 * 60 * 1000;
}

export function isEligibleForMonitor(listing, config, nowMs = Date.now()) {
  return isListingDueForMonitor(listing, nowMs) && !isTooOldToMonitor(listing, config, nowMs);
}

export function countMonitorTiers(candidates) {
  const counts = { hot: 0, warm: 0, cold: 0, unknown: 0 };
  for (const row of candidates || []) {
    const tier = cleanText(row?._monitor_tier)?.toLowerCase();
    if (tier === "hot" || tier === "warm" || tier === "cold") counts[tier] += 1;
    else counts.unknown += 1;
  }
  return counts;
}

export function attachMonitorTier(candidate, config, nowMs = Date.now()) {
  const dealScore = dealScoreFromListing(candidate);
  const tier = computeMonitorTier(candidate, dealScore, config, nowMs);
  return { ...candidate, deal_score: dealScore, _monitor_tier: tier };
}
