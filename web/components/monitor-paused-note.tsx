import { monitorWindowDaysForDealScore } from "@/lib/listingMonitor";
import { cn } from "@/lib/utils";

type MonitorPausedNoteProps = {
  className?: string;
  compact?: boolean;
  dealScore?: string | null;
};

export function MonitorPausedNote({ className, compact = false, dealScore }: MonitorPausedNoteProps) {
  const days = monitorWindowDaysForDealScore(dealScore);
  const text = compact
    ? `Not monitored — over ${days} days old`
    : `Not monitored — listed over ${days} days ago. Price may be outdated.`;
  return <p className={cn("text-[11px] text-muted-foreground", className)}>{text}</p>;
}
