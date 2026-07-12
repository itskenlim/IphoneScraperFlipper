#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRAPER_BACKUP="${ROOT}/scraper/.env.backup"
SCRAPER_DEST="${ROOT}/scraper/.env"
WEB_BACKUP="${ROOT}/web/.env.local.backup"
WEB_DEST="${ROOT}/web/.env.local"

restored=0

if [[ -f "${SCRAPER_BACKUP}" ]]; then
  cp "${SCRAPER_BACKUP}" "${SCRAPER_DEST}"
  echo "[OK] restored ${SCRAPER_DEST} from ${SCRAPER_BACKUP}"
  restored=1
else
  echo "[WARN] missing ${SCRAPER_BACKUP} — run: bash scripts/snapshot_env.sh"
fi

if [[ -f "${WEB_BACKUP}" ]]; then
  cp "${WEB_BACKUP}" "${WEB_DEST}"
  echo "[OK] restored ${WEB_DEST} from ${WEB_BACKUP}"
  restored=1
else
  echo "[WARN] missing ${WEB_BACKUP} — run: bash scripts/snapshot_env.sh"
fi

if [[ "${restored}" -eq 0 ]]; then
  echo "[INFO] no backups found; copy templates instead:"
  echo "  cp scraper/.env.example scraper/.env"
  echo "  cp web/.env.example web/.env.local"
  exit 1
fi
