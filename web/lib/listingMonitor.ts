/** Match scraper PLAYWRIGHT_MONITOR_MAX_AGE_DAYS (default 7). */
export const MONITOR_MAX_AGE_DAYS = 7;

/** Match scraper PLAYWRIGHT_MONITOR_DEAL_MAX_AGE_DAYS (default 14) for A/B/C deals. */
export const MONITOR_DEAL_MAX_AGE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function listingPostedAtMs(postedAt?: string | null, firstSeenAt?: string | null): number | null {
  const raw = postedAt || firstSeenAt;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function monitorWindowDaysForDealScore(dealScore?: string | null): number {
  const s = String(dealScore || "").toUpperCase();
  if (s === "A" || s === "B" || s === "C") return MONITOR_DEAL_MAX_AGE_DAYS;
  return MONITOR_MAX_AGE_DAYS;
}

/** Still within the window we monitor (and trust for Best deals). */
export function isWithinMonitorWindow(
  postedAt?: string | null,
  firstSeenAt?: string | null,
  dealScore?: string | null,
  nowMs: number = Date.now()
): boolean {
  const postedMs = listingPostedAtMs(postedAt, firstSeenAt);
  if (postedMs == null) return true;
  const maxDays = monitorWindowDaysForDealScore(dealScore);
  return nowMs - postedMs <= maxDays * DAY_MS;
}

export function isMonitorPaused(
  postedAt?: string | null,
  firstSeenAt?: string | null,
  dealScore?: string | null,
  nowMs: number = Date.now()
): boolean {
  return !isWithinMonitorWindow(postedAt, firstSeenAt, dealScore, nowMs);
}
