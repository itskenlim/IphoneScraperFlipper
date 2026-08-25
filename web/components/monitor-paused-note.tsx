import { MONITOR_MAX_AGE_DAYS } from "@/lib/listingMonitor";
import { cn } from "@/lib/utils";

type MonitorPausedNoteProps = {
  className?: string;
  compact?: boolean;
};

export function MonitorPausedNote({ className, compact = false }: MonitorPausedNoteProps) {
  const text = compact
    ? `Not monitored — over ${MONITOR_MAX_AGE_DAYS} days old`
    : `Not monitored — listed over ${MONITOR_MAX_AGE_DAYS} days ago. Price may be outdated.`;
  return <p className={cn("text-[11px] text-muted-foreground", className)}>{text}</p>;
}
