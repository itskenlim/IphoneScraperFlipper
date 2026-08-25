/** Match scraper PLAYWRIGHT_MONITOR_MAX_AGE_DAYS (default 7). */
export const MONITOR_MAX_AGE_DAYS = 7;

export function listingPostedAtMs(postedAt?: string | null, firstSeenAt?: string | null): number | null {
  const raw = postedAt || firstSeenAt;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isMonitorPaused(
  postedAt?: string | null,
  firstSeenAt?: string | null,
  nowMs: number = Date.now()
): boolean {
  const postedMs = listingPostedAtMs(postedAt, firstSeenAt);
  if (postedMs == null) return false;
  return nowMs - postedMs > MONITOR_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}
