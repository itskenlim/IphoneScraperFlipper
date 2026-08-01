#!/usr/bin/env node
/**
 * Re-enrich active listings with weak/empty descriptions (or "Just listed" titles).
 *
 * Usage (from scraper/):
 *   node scripts/backfill_weak_descriptions.mjs
 *   node scripts/backfill_weak_descriptions.mjs --limit 50 --batch-size 10
 *   node scripts/backfill_weak_descriptions.mjs --priority 1570612457987333
 *
 * Opens a fresh browser per batch to reduce RAM pressure.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import process from "node:process";

import { loadDotenv } from "../scraper/env.mjs";
import { launchPersistentContext, resolveProfileDir } from "../scraper/playwright_extra/browser.mjs";
import { persistToDatabaseBatched } from "../scraper/playwright_extra/db.mjs";
import { recheckCandidatesChunk } from "../scraper/playwright_extra/monitor.mjs";
import {
  cleanText,
  envBool,
  isPlaceholderTitle,
  isWeakDescription
} from "../scraper/playwright_extra/utils.mjs";

loadDotenv();

function parseArgs(argv) {
  const out = {
    limit: 87,
    batchSize: 10,
    priority: ["1570612457987333"],
    concurrency: 1
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit") {
      out.limit = Math.max(1, Number.parseInt(argv[++i], 10) || out.limit);
    } else if (arg.startsWith("--limit=")) {
      out.limit = Math.max(1, Number.parseInt(arg.split("=", 2)[1], 10) || out.limit);
    } else if (arg === "--batch-size") {
      out.batchSize = Math.max(1, Number.parseInt(argv[++i], 10) || out.batchSize);
    } else if (arg.startsWith("--batch-size=")) {
      out.batchSize = Math.max(1, Number.parseInt(arg.split("=", 2)[1], 10) || out.batchSize);
    } else if (arg === "--priority") {
      const val = argv[++i];
      if (val) out.priority.push(String(val));
    } else if (arg.startsWith("--priority=")) {
      out.priority.push(arg.split("=", 2)[1]);
    } else if (arg === "--concurrency") {
      out.concurrency = Math.max(1, Math.min(2, Number.parseInt(argv[++i], 10) || 1));
    }
  }
  out.priority = [...new Set(out.priority.filter(Boolean))];
  return out;
}

function createSupabase() {
  const url = cleanText(process.env.SUPABASE_URL);
  const key = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isWeakRow(row) {
  return isWeakDescription(row?.description) || isPlaceholderTitle(row?.title);
}

async function fetchWeakCandidates(supabase, { limit, priorityIds }) {
  const pool = [];
  let from = 0;
  while (pool.length < Math.max(limit * 2, 100)) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "listing_id,url,title,description,location_raw,price_raw,price_php,status,posted_at,first_seen_at,last_seen_at,last_price_change_at,monitor_last_checked_at,condition_raw"
      )
      .eq("status", "active")
      .order("first_seen_at", { ascending: false })
      .range(from, from + 499);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (isWeakRow(row)) pool.push(row);
    }
    if (data.length < 500) break;
    from += 500;
  }

  const byId = new Map(pool.map((r) => [String(r.listing_id), r]));
  const selected = [];

  for (const id of priorityIds) {
    if (byId.has(id) && selected.length < limit) selected.push(byId.get(id));
  }
  for (const row of pool) {
    if (selected.length >= limit) break;
    if (priorityIds.includes(String(row.listing_id))) continue;
    selected.push(row);
  }
  return { poolSize: pool.length, selected, byId };
}

function scoreUpgrade(prev, next) {
  const prevDesc = cleanText(prev?.description);
  const nextDesc = cleanText(next?.description);
  const prevTitle = cleanText(prev?.title);
  const descUpgraded = Boolean(
    nextDesc &&
      (isWeakDescription(prevDesc) && !isWeakDescription(nextDesc) ||
        (nextDesc.length || 0) >= (prevDesc?.length || 0) + 20)
  );
  const titleFixed = isPlaceholderTitle(prevTitle) && !isPlaceholderTitle(next?.title);
  const stillWeak = isWeakDescription(nextDesc) || isPlaceholderTitle(next?.title);
  return { descUpgraded, titleFixed, stillWeak };
}

async function main() {
  const args = parseArgs(process.argv);
  const supabase = createSupabase();
  const { poolSize, selected, byId } = await fetchWeakCandidates(supabase, {
    limit: args.limit,
    priorityIds: args.priority
  });

  console.log(
    `[INFO] weak_pool=${poolSize} selected=${selected.length} batch_size=${args.batchSize} concurrency=${args.concurrency}`
  );
  if (!selected.length) {
    console.log("[SUMMARY] nothing_to_backfill");
    return;
  }

  const profileBase =
    process.env.PLAYWRIGHT_PROFILE_DIR_MONITOR || process.env.PLAYWRIGHT_PROFILE_DIR || ".playwright_profile";
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chromium";
  const userDataDir = resolveProfileDir(profileBase, channel);
  const headless = envBool("PLAYWRIGHT_HEADLESS", true);
  const useStealth = envBool("PLAYWRIGHT_EXTRA_USE_STEALTH", true);
  console.log(`[INFO] profile=${userDataDir} headless=${headless}`);

  const stats = {
    ok: 0,
    failed: 0,
    desc_upgraded: 0,
    title_fixed: 0,
    still_weak: 0,
    batches: 0
  };
  const runId = randomUUID();

  for (let i = 0; i < selected.length; i += args.batchSize) {
    const chunk = selected.slice(i, i + args.batchSize);
    const batchNo = Math.floor(i / args.batchSize) + 1;
    const batchTotal = Math.ceil(selected.length / args.batchSize);
    stats.batches += 1;
    console.log(`[INFO] batch ${batchNo}/${batchTotal} size=${chunk.length} ids=${chunk.map((r) => r.listing_id).join(",")}`);

    let context = null;
    try {
      // Fresh browser each batch — avoids Chromium RAM creep across many pages.
      // eslint-disable-next-line no-await-in-loop
      context = await launchPersistentContext({
        userDataDir,
        browserChannel: channel,
        headless,
        useStealth
      });
      // eslint-disable-next-line no-await-in-loop
      const { rows, failedListingIds } = await recheckCandidatesChunk({
        context,
        runId,
        queryUrl: process.env.PLAYWRIGHT_QUERY_URL || "https://www.facebook.com/marketplace/",
        gotoRetries: 2,
        delayMin: 700,
        delayMax: 1400,
        concurrency: args.concurrency,
        candidates: chunk,
        logEnabled: true,
        log: (m) => console.log(m),
        label: "enrich",
        blockImages: true,
        waitForNetworkIdle: false,
        useNetwork: true,
        saveNetworkRaw: false,
        progressBase: i,
        progressTotal: selected.length
      });

      stats.failed += (failedListingIds || []).length;
      for (const row of rows || []) {
        const prev = byId.get(String(row.listing_id));
        const score = scoreUpgrade(prev, row);
        if (score.descUpgraded) stats.desc_upgraded += 1;
        if (score.titleFixed) stats.title_fixed += 1;
        if (score.stillWeak) stats.still_weak += 1;
        stats.ok += 1;
        console.log(
          `[INFO] result listing_id=${row.listing_id} title="${cleanText(row.title)?.slice(0, 40) || "n/a"}" ` +
            `desc_len=${cleanText(row.description)?.length || 0} upgraded=${score.descUpgraded} still_weak=${score.stillWeak}`
        );
      }

      if (rows?.length) {
        // eslint-disable-next-line no-await-in-loop
        const persist = await persistToDatabaseBatched(rows, {
          log: (m) => console.log(m),
          dryRun: false,
          phase: "desc_backfill"
        });
        console.log(
          `[INFO] persist batch=${batchNo} updated=${persist.updated} unchanged=${persist.unchanged} ` +
            `fields=${JSON.stringify(persist.changedFieldCounts || {})}`
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] batch ${batchNo} failed: ${msg}`);
      if (msg.includes("SESSION_BLOCKED")) {
        console.error("[ERROR] session blocked — stop and re-bootstrap monitor login");
        break;
      }
    } finally {
      if (context) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await context.close();
        } catch {}
      }
    }

    // Brief pause between batches so the OS can reclaim Chromium memory.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 2500));
  }

  for (const id of args.priority) {
    const { data } = await supabase
      .from("listings")
      .select("listing_id,title,description,status,updated_at")
      .eq("listing_id", id)
      .maybeSingle();
    console.log(
      `[VERIFY] listing_id=${id} title="${data?.title || "n/a"}" desc_len=${(data?.description || "").length} ` +
        `preview="${(data?.description || "").slice(0, 100)}" status=${data?.status || "n/a"}`
    );
  }

  console.log("[SUMMARY]", stats);
}

main().catch((error) => {
  console.error(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
