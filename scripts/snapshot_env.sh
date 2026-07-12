#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRAPER_SRC="${ROOT}/scraper/.env"
SCRAPER_BACKUP="${ROOT}/scraper/.env.backup"
WEB_SRC="${ROOT}/web/.env.local"
WEB_BACKUP="${ROOT}/web/.env.local.backup"

if [[ ! -f "${SCRAPER_SRC}" ]]; then
  echo "[ERROR] missing ${SCRAPER_SRC}"
  exit 1
fi

cp "${SCRAPER_SRC}" "${SCRAPER_BACKUP}"
echo "[OK] snapshot ${SCRAPER_BACKUP}"

if [[ -f "${WEB_SRC}" ]]; then
  cp "${WEB_SRC}" "${WEB_BACKUP}"
  echo "[OK] snapshot ${WEB_BACKUP}"
else
  echo "[WARN] skipped web — missing ${WEB_SRC}"
fi

echo "[INFO] backups are gitignored; copy them off-machine if you want extra safety"
