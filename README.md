# IAASE — iPhone Marketplace Deal Finder

Personal tooling to **discover**, **monitor**, and **score** Facebook Marketplace iPhone listings (Iloilo + nearby), then browse deals in a **public** Next.js dashboard (MVP — no login).

| Piece | Role |
|-------|------|
| **Scraper** (`scraper/`) | Playwright discovery + watchlist monitor → Supabase |
| **Web** (`web/`) | Public deal board + public listing detail |
| **Infra** (`infra/systemd/`) | Linux user timers for unattended runs |

---

## How it works

```text
Facebook Marketplace
        │
        ▼
┌───────────────────┐     ┌──────────────────┐
│  Discovery job    │────▶│  Supabase        │
│  (feed + enrich)  │     │  listings /      │
└───────────────────┘     │  deal_metrics    │
                          └────────┬─────────┘
┌───────────────────┐              │
│  Monitor job      │──────────────┤
│  (tiered recheck) │              │
└───────────────────┘              │
        │                          ▼
        │                 ┌──────────────────┐
        └────────────────▶│  Web dashboard   │
   (price / sold / desc)  │  /listings       │
                          └──────────────────┘
```

1. **Discovery** — scan Marketplace search feed, filter noise, enrich new listings (description/condition).
2. **Monitor** — recheck active watchlist with **tiered scheduling** (hot deals often; cold listings weekly). See [docs/MONITOR_SCHEDULING.md](docs/MONITOR_SCHEDULING.md).
3. **Deals** — `compute_deals.mjs` scores A/B/C vs comps and surfaces red flags.
4. **Dashboard** — browse scored listings; detail + Facebook URL are public (MVP).

**Ops shape:** dual Facebook profiles (discover vs monitor), Playwright **hybrid** (embed/GraphQL + selective DOM), and a dedicated home Linux host over SSH for timers. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Repo map

```text
IphoneScraperFlipper/
├── scraper/                 # Playwright scraper + deal engine
│   ├── .env.example         # Tuned knobs (no secrets) — copy to .env
│   ├── scripts/             # run_discover / run_monitor / compute_deals
│   ├── scraper/             # Core Node modules (playwright_extra, …)
│   └── sql/                 # Schema migrations (run in Supabase SQL editor)
├── web/                     # Next.js App Router dashboard
│   ├── .env.example
│   └── app/                 # Routes: /, /listings, /item/[id]
├── infra/systemd/           # User-level discover + monitor timers
├── docs/                    # Deep-dive docs (scheduling, designs)
├── AUTOMATION_CHEATSHEET.md # Day-to-day ops on Linux
├── DESIGN.md                # UI aesthetic (Ops Center Noir adapted for IAASE)
└── scripts/                 # snapshot_env.sh / restore_env.sh
```

---

## Quick start

### Prerequisites

- Node.js 20+ (nvm recommended)
- Supabase project (Postgres)
- Facebook accounts for Playwright persistent profiles
- Linux (recommended for systemd automation)

### 1. Clone & install

```bash
git clone <your-repo-url> IphoneScraperFlipper
cd IphoneScraperFlipper

cd scraper && npm install && cd ..
cd web && npm install && cd ..
```

### 2. Environment

```bash
cp scraper/.env.example scraper/.env
cp web/.env.example web/.env.local
# Fill SUPABASE_* and auth secrets in both files
```

After wiping env files later:

```bash
bash scripts/snapshot_env.sh   # backup working envs (gitignored)
bash scripts/restore_env.sh    # restore from backups
```

### 3. Database

Apply SQL under `scraper/sql/` in the Supabase SQL editor as needed (including `add_monitor_schedule_columns.sql` if monitor schedule columns are missing).

### 4. Bootstrap Facebook login (once per profile)

```bash
cd scraper
bash scripts/bootstrap_login.sh discover
bash scripts/bootstrap_login.sh monitor
```

### 5. Smoke test

```bash
cd scraper
bash scripts/run_discover.sh
bash scripts/run_monitor.sh
bash scripts/run_compute_deals.sh
```

```bash
cd web
npm run dev
# http://localhost:3000
```

---

## Automation (Linux)

See **[AUTOMATION_CHEATSHEET.md](AUTOMATION_CHEATSHEET.md)** and **[infra/systemd/README.md](infra/systemd/README.md)**.

Default cadence (local time):

| Job | Schedule |
|-----|----------|
| Discover | Hourly `07:00`–`23:00` + midnight |
| Monitor | Every **3 hours** `07:05`–`22:05` + `00:05` |
| Night | Quiet `01:00`–`06:59` |
| Deals | After each job (`ExecStartPost`) |

```bash
chmod +x scraper/scripts/run_*.sh scraper/scripts/bootstrap_login.sh scripts/*.sh
mkdir -p ~/.config/systemd/user
cp infra/systemd/iaase-*.service infra/systemd/iaase-*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now iaase-discover.timer
systemctl --user enable --now iaase-monitor.timer
loginctl enable-linger "$USER"   # optional: keep timers after logout
```

Telegram login alerts: set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in `scraper/.env`.

---

## Documentation index

| Doc | What it’s for |
|-----|----------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Dual accounts, hybrid scrape, home Linux SSH host |
| [AUTOMATION_CHEATSHEET.md](AUTOMATION_CHEATSHEET.md) | Timers, logs, re-login, env backup |
| [docs/MONITOR_SCHEDULING.md](docs/MONITOR_SCHEDULING.md) | Hot/warm/cold monitor tiers + env knobs |
| [infra/systemd/README.md](infra/systemd/README.md) | Installing systemd units |
| [scraper/COMMANDS.md](scraper/COMMANDS.md) | npm scripts for discover / monitor / deals |
| [web/README.md](web/README.md) | Dashboard routes, Vercel, auth notes |
| [DESIGN.md](DESIGN.md) | UI direction and density rules |
| [TODO_LIST.md](TODO_LIST.md) | Known product follow-ups |

---

## Security notes

- Never commit `.env`, `.env.local`, or Playwright profile dirs.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (`NEXT_PUBLIC_*`).
- Web dashboard is a **public MVP** (listing details and Facebook links are open). Re-add auth later if needed.
- Run discover/monitor automation on **one host** at a time against the same DB.

---

## License / status

Personal project — not affiliated with Facebook or Meta. Use responsibly and within Marketplace terms.
