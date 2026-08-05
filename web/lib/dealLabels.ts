/** Plain-language deal labels for public UI (A/B/C stay in DB). */

export function dealQualityLabel(score: unknown): "Great deal" | "Good deal" | "Fair deal" | null {
  const s = String(score || "").toUpperCase();
  if (s === "A") return "Great deal";
  if (s === "B") return "Good deal";
  if (s === "C") return "Fair deal";
  return null;
}

export function dealQualityTone(score: unknown): { bg: string; text: string } {
  const s = String(score || "").toUpperCase();
  if (s === "A") return { bg: "bg-emerald-600", text: "text-emerald-300" };
  if (s === "B") return { bg: "bg-amber-500", text: "text-amber-300" };
  if (s === "C") return { bg: "bg-rose-600", text: "text-rose-300" };
  return { bg: "bg-muted", text: "text-muted-foreground" };
}

/** e.g. "~10% under similar listings" */
export function underSimilarListingsCopy(belowMarketPct: number | null | undefined, formatPct: (n: number) => string): string | null {
  if (belowMarketPct == null || !Number.isFinite(belowMarketPct)) return null;
  return `~${formatPct(belowMarketPct)} under similar listings`;
}

export function isLowConfidence(value: unknown): boolean {
  return String(value || "").toLowerCase() === "low";
}

export function confidencePlainLabel(value: unknown): string | null {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "Solid comps";
  if (v === "med") return "OK comps";
  if (v === "low") return "Based on few comps";
  return null;
}
