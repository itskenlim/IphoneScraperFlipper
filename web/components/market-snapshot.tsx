import { Activity, BadgePercent, Smartphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatPhp } from "@/lib/format";
import type { MarketPulse } from "@/lib/marketPulseTypes";

export function MarketSnapshot({ pulse }: { pulse: MarketPulse }) {
  const featured = pulse.models.find((m) => m.key === pulse.defaultKey) || pulse.models[0] || null;

  const items = [
    {
      label: "Active listings",
      value: pulse.activeCount.toLocaleString(),
      helper: "Currently buyable on Marketplace",
      icon: Smartphone
    },
    {
      label: "Fair deals now",
      value: pulse.scoredDealCount.toLocaleString(),
      helper: "Priced below similar phones",
      icon: BadgePercent
    },
    {
      label: featured ? `${featured.label} typical` : "Models tracked",
      value: featured?.median != null ? formatPhp(featured.median) : String(pulse.modelsTracked),
      helper: featured
        ? `Based on ${featured.sampleSize} similar listings`
        : "Configs with enough comps",
      icon: Activity
    }
  ];

  return (
    <section aria-label="Live market snapshot" className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="border-border/70 bg-card/70">
          <CardContent className="flex min-h-[120px] flex-col justify-center gap-2 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <item.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              {item.label}
            </div>
            <div className="text-lg font-semibold text-foreground">
              <span className="font-mono" style={{ textShadow: "0 0 12px rgba(37,99,235,0.35)" }}>
                {item.value}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{item.helper}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
