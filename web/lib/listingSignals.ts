import { parseRiskFlags } from "@/lib/riskFlags";

export const STORAGE_UNKNOWN_LABEL = "Storage unknown — no price estimate";
export const STORAGE_UNKNOWN_TITLE =
  "Seller didn't list storage (64/128/256GB), so we can't compare fairly against similar listings.";

/** True when deal scoring was skipped because storage could not be parsed. */
export function isStorageUnknown(riskFlags: unknown, storageGb?: number | null): boolean {
  const flags = parseRiskFlags(riskFlags);
  if (flags.storage_unknown) return true;
  return storageGb == null;
}
