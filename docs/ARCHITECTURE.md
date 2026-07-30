# Architecture & ops notes

How IAASE is meant to run in practice: dual Facebook sessions, hybrid Playwright extraction, and a dedicated home Linux host.

---

## Dual Facebook accounts

Discovery and monitor use **separate Playwright persistent profiles** so one logged-out / challenged session does not take down both jobs.

| Job | Env profile | Typical dir |
|-----|-------------|-------------|
| Discovery | `PLAYWRIGHT_PROFILE_DIR_DISCOVER` | `.playwright_profile/fb_account_a` |
| Monitor | `PLAYWRIGHT_PROFILE_DIR_MONITOR` | `.playwright_profile/fb_account_b` |
| Fallback | `PLAYWRIGHT_PROFILE_DIR` | `.playwright_profile/default` |

Each directory is one Chromium user-data dir = one Facebook cookie jar.

**Bootstrap once per account (headful):**

```bash
cd scraper
bash scripts/bootstrap_login.sh discover
bash scripts/bootstrap_login.sh monitor
```

When Facebook challenges a session, only re-login that job’s profile. Telegram alerts (if configured) point at the same scripts.

Profiles are **gitignored** — copy them when migrating machines (see below), or re-bootstrap on the new host.

---

## Hybrid scrape: GraphQL / embed + DOM

Facebook Marketplace pages often expose structured listing data in **network GraphQL** responses and/or **embedded JSON** in the page HTML. Live GraphQL capture can be sparse; **embed fallback** is usually what fills price, sold flags, seller, and location.

| Source | Best for | Notes |
|--------|----------|--------|
| Network GraphQL | Structured fields when present | Often low hit rate on monitor |
| **Embed JSON** | Price, sold/pending, seller, location | Prefer this for display price |
| **DOM** | Description, condition, sold badge text | Heavier; use sparingly on monitor |

### Recommended monitor hybrid (current defaults)

```env
PLAYWRIGHT_MONITOR_USE_NETWORK=true
PLAYWRIGHT_MONITOR_EMBED_FALLBACK=true
PLAYWRIGHT_MONITOR_GRAPHQL_ONLY=false
PLAYWRIGHT_MONITOR_DOM_MODE=desc          # DOM for description when missing/stale
PLAYWRIGHT_PREFER_GRAPHQL_PRICE_RAW=true  # name is legacy — also prefers embed price
PLAYWRIGHT_MONITOR_DESC_REFRESH_HOURS=48
```

Mental model:

- **Every monitor pass:** embed/network for price + status (fast, structured).
- **DOM detail:** only when description is missing or stale (`desc` mode), or always in `full` mode.
- **Discovery enrich:** still uses full DOM for new listings so description/condition land once.

Feed-level GraphQL samples (e.g. saved JSON dumps) often include title/price/sold — **not** full description/condition — which is why enrich + intermittent DOM still matter.

Related: [MONITOR_SCHEDULING.md](MONITOR_SCHEDULING.md) (who gets checked), `scraper/.env.example` (all knobs).

---

## Home Linux “backend” host (SSH laptop)

The intended production shape is a **dedicated always-on (or mostly-on) Linux machine** on the home network:

| Role | Where |
|------|--------|
| Scraper + systemd timers | Home Linux laptop / mini PC (SSH only) |
| Supabase | Cloud (shared) |
| Web dashboard | Optional: Vercel, or same host for `npm run dev` / local preview |

You develop / edit on a daily driver; the **old laptop runs the timers**. Do **not** enable discover+monitor systemd on two machines against the same DB at once.

### Why this host

- Keeps Playwright + Chromium off your main workstation
- systemd user timers survive daily laptop sleep if linger is enabled
- SSH is enough for logs, re-login, and deploys (`git pull`, env restore)

### Typical ops over SSH

```bash
ssh user@home-linux

cd ~/dev/personal/IphoneScraperFlipper
systemctl --user list-timers --all | grep iaase
journalctl --user -u iaase-discover.service -n 100 --no-pager
journalctl --user -u iaase-monitor.service -n 100 --no-pager

# Re-login when Telegram / markers say so
cd scraper
bash scripts/bootstrap_login.sh discover   # needs a display / X11 / VNC if headful
bash scripts/bootstrap_login.sh monitor
```

Headful bootstrap on a headless SSH box usually needs a desktop session, VNC, or temporarily plugging in a display. After profiles exist, headless timer runs are fine.

### Migrate / provision the host

1. `git clone` / `git pull`
2. `npm install` in `scraper/` (and `web/` if needed)
3. Restore `scraper/.env` (+ optional `web/.env.local`) via `scripts/restore_env.sh` or scp
4. Copy `.playwright_profile/` **or** re-bootstrap logins
5. `chmod +x scraper/scripts/run_*.sh …`
6. Install systemd units (see [AUTOMATION_CHEATSHEET.md](../AUTOMATION_CHEATSHEET.md))
7. `loginctl enable-linger $USER`
8. Smoke-test one discover + one monitor run before leaving timers on

Path in unit files defaults to `~/dev/personal/IphoneScraperFlipper` — adjust if the host uses a different home path.

---

## Data ownership split

| Layer | Owner |
|-------|--------|
| Listing rows + monitor schedule columns | Scraper → Supabase |
| Deal scores / red flags | `compute_deals` (post-scrape) |
| Public UI | Next.js `web/` reading Supabase |

Web does not scrape Facebook; the home Linux host does.
