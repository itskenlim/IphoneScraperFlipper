import { Badge } from "@/components/ui/badge";
import { dealQualityLabel, dealQualityTone } from "@/lib/dealLabels";

type DealQualityBadgeProps = {
  score: unknown;
  /** Compact pill for list cards; default matches list density. */
  size?: "sm" | "md";
};

export function DealQualityBadge({ score, size = "sm" }: DealQualityBadgeProps) {
  const label = dealQualityLabel(score);
  if (!label) return null;
  const tone = dealQualityTone(score);
  const sizeClass = size === "md" ? "h-7 px-2.5 text-xs" : "h-6 px-2 text-[11px]";
  return (
    <Badge className={`${sizeClass} border-0 font-semibold text-white ${tone.bg}`}>{label}</Badge>
  );
}
