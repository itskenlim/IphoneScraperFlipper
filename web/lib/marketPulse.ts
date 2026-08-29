import "server-only";

import { unstable_cache } from "next/cache";

import { compareBestDeals, fetchPublicListings } from "@/lib/data";
import {
  modelKey,
  modelPulseLabel,
  type MarketModelPulse,
  type MarketPulse,
  type MarketTrendPoint
} from "@/lib/marketPulseTypes";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COMP_MIN = 2000;
const COMP_MAX = 130000;
const WINDOW_DAYS = 30;
const TREND_DAYS = 14;
const MIN_SAMPLE = 5;

function cleanText(value: unknown): string | null {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  const cleaned = s.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function parseIsoMs(value: unknown): number | null {
  const s = cleanText(value);
  if (!s) return null;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function quantile(sorted: number[], q: number): number | null {
  const n = sorted.length;
  if (!n) return null;
  if (n === 1) return sorted[0];
  const pos = (n - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base];
  const b = sorted[Math.min(n - 1, base + 1)];
  return a + rest * (b - a);
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

type RawRow = {
  listing_id: string;
  price_php: number | null;
  status: string | null;
  posted_at: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  deal?:
    | { deal_score?: string | null; est_profit_php?: number | null }
    | Array<{ deal_score?: string | null; est_profit_php?: number | null }>;
  feat?:
    | {
        model_family?: string | null;
        variant?: string | null;
        storage_gb?: number | null;
      }
    | Array<{
        model_family?: string | null;
        variant?: string | null;
        storage_gb?: number | null;
      }>;
};

async function loadMarketPulseUncached(): Promise<MarketPulse> {
  const supabase = supabaseAdmin();
  const nowMs = Date.now();
  const cutoffMs = nowMs - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const [activeRes, windowRes, dealsRes] = await Promise.all([
    supabase.from("listings").select("listing_id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("listings")
      .select(
        "listing_id,price_php,status,posted_at,first_seen_at,last_seen_at,deal:deal_metrics(deal_score,est_profit_php),feat:listing_features(model_family,variant,storage_gb)"
      )
      .eq("status", "active")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(3000),
    fetchPublicListings({ sort: "deals", status: "active", page: 1, pageSize: 6 })
  ]);

  if (activeRes.error) throw new Error(activeRes.error.message);
  if (windowRes.error) throw new Error(windowRes.error.message);

  const rows = (windowRes.data || []) as unknown as RawRow[];
  const buckets = new Map<
    string,
    {
      modelFamily: string;
      variant: string;
      storageGb: number | null;
      prices: { price: number; timeMs: number }[];
    }
  >();

  let scoredDealCount = 0;

  for (const row of rows) {
    const feat = Array.isArray(row.feat) ? row.feat[0] : row.feat;
    const deal = Array.isArray(row.deal) ? row.deal[0] : row.deal;
    const modelFamily = cleanText(feat?.model_family)?.toLowerCase();
    if (!modelFamily) continue;

    const variant = cleanText(feat?.variant)?.toLowerCase() || "base";
    const storageRaw = feat?.storage_gb;
    const storageGb =
      typeof storageRaw === "number" && Number.isFinite(storageRaw)
        ? Math.round(storageRaw)
        : typeof storageRaw === "string" && Number.isFinite(Number(storageRaw))
          ? Math.round(Number(storageRaw))
          : null;

    const price =
      typeof row.price_php === "number" && Number.isFinite(row.price_php) ? Number(row.price_php) : null;
    if (price == null || price < COMP_MIN || price > COMP_MAX) continue;

    const timeMs =
      parseIsoMs(row.posted_at) ?? parseIsoMs(row.first_seen_at) ?? parseIsoMs(row.last_seen_at);
    if (timeMs == null || timeMs < cutoffMs) continue;

    const score = String(deal?.deal_score || "").toUpperCase();
    const profit = typeof deal?.est_profit_php === "number" ? deal.est_profit_php : null;
    if ((score === "A" || score === "B" || score === "C") && profit != null && profit > 0) {
      scoredDealCount += 1;
    }

    const key = modelKey(modelFamily, variant, storageGb);
    if (!buckets.has(key)) {
      buckets.set(key, { modelFamily, variant, storageGb, prices: [] });
    }
    buckets.get(key)!.prices.push({ price, timeMs });
  }

  const models: MarketModelPulse[] = [];
  for (const [key, bucket] of buckets) {
    const prices = bucket.prices.map((p) => p.price).sort((a, b) => a - b);
    if (prices.length < MIN_SAMPLE) continue;

    const recentCutoff = nowMs - TREND_DAYS * 24 * 60 * 60 * 1000;
    const olderCutoff = nowMs - TREND_DAYS * 2 * 24 * 60 * 60 * 1000;
    const recent = bucket.prices
      .filter((p) => p.timeMs >= recentCutoff)
      .map((p) => p.price)
      .sort((a, b) => a - b);
    const older = bucket.prices
      .filter((p) => p.timeMs >= olderCutoff && p.timeMs < recentCutoff)
      .map((p) => p.price)
      .sort((a, b) => a - b);

    let changePct: number | null = null;
    if (recent.length >= 3 && older.length >= 3) {
      const recentMed = quantile(recent, 0.5);
      const olderMed = quantile(older, 0.5);
      if (recentMed != null && olderMed != null && olderMed > 0) {
        changePct = (recentMed - olderMed) / olderMed;
      }
    }

    const byDay = new Map<string, number[]>();
    for (const p of bucket.prices) {
      if (p.timeMs < recentCutoff) continue;
      const d = dayKey(p.timeMs);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(p.price);
    }
    const trend: MarketTrendPoint[] = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, vals]) => {
        const sorted = vals.slice().sort((a, b) => a - b);
        return { day, median: quantile(sorted, 0.5) as number, n: sorted.length };
      })
      .filter((p) => Number.isFinite(p.median));

    models.push({
      key,
      modelFamily: bucket.modelFamily,
      variant: bucket.variant,
      storageGb: bucket.storageGb,
      label: modelPulseLabel(bucket.modelFamily, bucket.variant, bucket.storageGb),
      sampleSize: prices.length,
      median: quantile(prices, 0.5),
      p25: quantile(prices, 0.25),
      p75: quantile(prices, 0.75),
      changePct,
      trend
    });
  }

  models.sort((a, b) => b.sampleSize - a.sampleSize);

  const preferred = [
    "iphone_13|base|128",
    "iphone_14|base|128",
    "iphone_11|base|128",
    "iphone_12|base|128",
    "iphone_15|base|128",
    "iphone_16|base|128",
    "iphone_air|base|256"
  ];
  const defaultKey = preferred.find((k) => models.some((m) => m.key === k)) || models[0]?.key || null;

  const topDeals = [...(dealsRes.items || [])].sort(compareBestDeals).slice(0, 3);

  return {
    activeCount: typeof activeRes.count === "number" ? activeRes.count : 0,
    scoredDealCount,
    modelsTracked: models.length,
    models: models.slice(0, 24),
    defaultKey,
    topDeals,
    updatedAt: new Date().toISOString()
  };
}

export async function fetchMarketPulse(): Promise<MarketPulse> {
  const getCached = unstable_cache(loadMarketPulseUncached, ["market-pulse-v1"], { revalidate: 120 });
  return getCached();
}

export type { MarketModelPulse, MarketPulse, MarketTrendPoint } from "@/lib/marketPulseTypes";
export { modelPulseLabel, modelSearchQuery } from "@/lib/marketPulseTypes";
