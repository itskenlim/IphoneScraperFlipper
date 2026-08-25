export type MarketModelKey = string;

export type MarketTrendPoint = {
  day: string;
  median: number;
  n: number;
};

export type MarketModelPulse = {
  key: MarketModelKey;
  modelFamily: string;
  variant: string;
  storageGb: number | null;
  label: string;
  sampleSize: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  /** Fraction change over ~14d (negative = cheaper). Null if thin. */
  changePct: number | null;
  trend: MarketTrendPoint[];
};

export type MarketPulse = {
  activeCount: number;
  scoredDealCount: number;
  modelsTracked: number;
  models: MarketModelPulse[];
  defaultKey: string | null;
  topDeals: import("@/lib/types").PublicListing[];
  updatedAt: string;
};

function formatModelFamily(mf: string): string {
  const s = mf.toLowerCase();
  if (s === "iphone_xr") return "iPhone XR";
  if (s === "iphone_xs") return "iPhone XS";
  if (s === "iphone_x") return "iPhone X";
  if (s === "iphone_se") return "iPhone SE";
  if (s === "iphone_se_2") return "iPhone SE (2020)";
  if (s === "iphone_se_3") return "iPhone SE (2022)";
  const m = /^iphone_(\d{1,2})$/.exec(s);
  if (m) return `iPhone ${m[1]}`;
  return mf.replace(/_/g, " ");
}

function formatVariant(v: string): string {
  const s = v.toLowerCase();
  if (s === "pro_max") return "Pro Max";
  if (s === "pro") return "Pro";
  if (s === "plus") return "Plus";
  if (s === "mini") return "Mini";
  if (s === "max") return "Max";
  if (s === "base") return "";
  return "";
}

export function modelPulseLabel(modelFamily: string, variant: string, storageGb: number | null): string {
  const model = formatModelFamily(modelFamily);
  const varText = formatVariant(variant);
  const storage = storageGb != null && Number.isFinite(storageGb) ? `${Math.round(storageGb)}GB` : "";
  return [model, varText, storage].filter(Boolean).join(" ");
}

export function modelSearchQuery(modelFamily: string, variant: string, storageGb: number | null): string {
  return modelPulseLabel(modelFamily, variant, storageGb);
}

export function modelKey(modelFamily: string, variant: string, storageGb: number | null): string {
  return `${modelFamily}|${variant || "base"}|${storageGb ?? "x"}`;
}
