# Monitor scheduling

Monitor checks active watchlist listings for **price**, **sold/pending**, and (in `desc` mode) **description** changes. Discovery finds new listings; monitor keeps the watchlist fresh for flip opportunities.

## Problem

A naive round-robin on `last_seen_at` treats every active listing equally. As the DB grows:

- FB page visits become the bottleneck
- Old, overpriced listings consume the same slots as new B-score deals
- Discovery and monitor both bump `last_seen_at`, blurring “last monitored” vs “last touched”

## Approach: tiered due-date scheduling

Each active listing gets a **`monitor_next_check_at`** timestamp. A run only opens listings that are **due** and **not locked out**.

| Column | Purpose |
|--------|---------|
| `monitor_next_check_at` | Earliest time to recheck this listing |
| `monitor_last_checked_at` | Last successful monitor scrape (not discovery) |
| `monitor_fail_count` | Consecutive monitor failures |
| `monitor_lockout_until` | Backoff window after failures |

### Tiers (flipper-oriented)

Classification uses **listing age**, **`deal_metrics.deal_score`**, and **`last_price_change_at`**.

| Tier | Typical profile | Default recheck interval |
|------|-----------------|--------------------------|
| **hot** | Age ≤ 3d, deal score **A/B**, or price changed within 48h | 6 hours |
| **warm** | Age 3–7d, score **C**, or older but still moving | 24 hours |
| **cold** | Age > 7d, score **D/NA/missing**, price unchanged ≥ 7d | 7 days (168h) |

**Why not drop cold listings entirely?** Sellers sometimes cut price on day 10+. A weekly cold check still catches that without spending hot-tier bandwidth on stale inventory.

### Failure backoff

Failed monitor visits (network error, block, parse failure) **do not** advance `monitor_last_checked_at`. Instead:

1. `monitor_fail_count` increments
2. `monitor_lockout_until` = exponential backoff (5m → 10m → 20m … cap 120m)

This stops one broken URL from occupying every run.

### Selection query (tiered mode)

```sql
-- Conceptual
SELECT … FROM listings
WHERE status = 'active'
  AND (monitor_lockout_until IS NULL OR monitor_lockout_until <= now())
  AND (monitor_next_check_at IS NULL OR monitor_next_check_at <= now())
ORDER BY monitor_next_check_at ASC NULLS FIRST
LIMIT :pool
```

New listings get `monitor_next_check_at = now()` on insert so the first monitor pass picks them up quickly.

## Configuration

Set in `scraper/.env`:

```env
# tiered (default) | legacy (old last_seen_at round-robin)
PLAYWRIGHT_MONITOR_SCHEDULER=tiered

PLAYWRIGHT_MONITOR_HOT_MAX_AGE_DAYS=3
PLAYWRIGHT_MONITOR_WARM_MAX_AGE_DAYS=7
PLAYWRIGHT_MONITOR_HOT_INTERVAL_HOURS=6
PLAYWRIGHT_MONITOR_WARM_INTERVAL_HOURS=24
PLAYWRIGHT_MONITOR_COLD_INTERVAL_HOURS=168
PLAYWRIGHT_MONITOR_PRICE_CHANGE_HOT_HOURS=48
PLAYWRIGHT_MONITOR_COLD_STALE_PRICE_DAYS=7
PLAYWRIGHT_MONITOR_FAIL_LOCKOUT_BASE_MINUTES=5
PLAYWRIGHT_MONITOR_FAIL_LOCKOUT_MAX_MINUTES=120
PLAYWRIGHT_MONITOR_FETCH_POOL_MULTIPLIER=3
```

## Legacy mode

`PLAYWRIGHT_MONITOR_SCHEDULER=legacy` restores the previous behavior:

- Order by `last_seen_at ASC`
- No `monitor_*` column reads/writes on fetch
- Useful for rollback or DBs without schedule columns

## Database migration

If columns are missing (or this is a fresh Supabase project):

```bash
# Run in Supabase SQL editor
scraper/sql/add_monitor_schedule_columns.sql
```

## Operations

**After env tweaks:**

```bash
bash scripts/snapshot_env.sh
```

**Logs to watch:**

```
[INFO] monitor_schedule mode=tiered due_pool=150 selected=50 tiers hot=12 warm=28 cold=10
[INFO] monitor_failures recorded=2
```

**Tuning for “spot cheap iPhones”:**

- Keep discovery frequent (new inventory)
- Rely on dashboard deal scores for browsing
- Monitor hot tier often; let cold tier breathe
- Raise `MONITOR_LIMIT` only if RAM/FB limits allow — tiering reduces wasted visits

## Code map

| File | Role |
|------|------|
| `scraper/scraper/playwright_extra/monitor_schedule.mjs` | Tier math, intervals, lockout |
| `scraper/scraper/playwright_extra/monitor.mjs` | Candidate fetch, scrape loop |
| `scraper/scraper/playwright_extra/db.mjs` | Persist schedule fields, record failures |
| `scraper/scraper/playwright_extra/jobs.mjs` | Monitor job orchestration |

## Related

- Deal scoring: `scraper/scripts/compute_deals.mjs` (run after discovery/monitor)
- DOM mode `desc`: description refresh uses monitor timestamps when available
- Automation: `infra/systemd/iaase-monitor.timer`, `MONITOR_LIMIT` in `.env`
