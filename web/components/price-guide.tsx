"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { NavButtonLink } from "@/components/nav-pending";
import { PriceTrendSparkline } from "@/components/price-trend-sparkline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPct, formatPhp } from "@/lib/format";
import { modelSearchQuery, type MarketModelPulse } from "@/lib/marketPulseTypes";
import { cn } from "@/lib/utils";

function changeTone(changePct: number | null) {
  if (changePct == null || !Number.isFinite(changePct)) {
    return { label: "Stable / thin data", className: "text-muted-foreground", Icon: null as null | typeof TrendingDown };
  }
  if (changePct <= -0.03) {
    return { label: `${formatPct(Math.abs(changePct))} lower than prior weeks`, className: "text-emerald-500", Icon: TrendingDown };
  }
  if (changePct >= 0.03) {
    return { label: `${formatPct(Math.abs(changePct))} higher than prior weeks`, className: "text-amber-500", Icon: TrendingUp };
  }
  return { label: "About flat vs prior weeks", className: "text-muted-foreground", Icon: null };
}

export function PriceGuide({
  models,
  defaultKey
}: {
  models: MarketModelPulse[];
  defaultKey: string | null;
}) {
  const [selectedKey, setSelectedKey] = useState(defaultKey || models[0]?.key || "");

  const selected = useMemo(
    () => models.find((m) => m.key === selectedKey) || models[0] || null,
    [models, selectedKey]
  );

  if (!models.length || !selected) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardTitle>Local price guide</CardTitle>
          <CardDescription>Not enough similar listings yet to show fair prices.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tone = changeTone(selected.changePct);
  const listingsHref = `/listings?query=${encodeURIComponent(
    modelSearchQuery(selected.modelFamily, selected.variant, selected.storageGb)
  )}&sort=deals`;

  const chips = models.slice(0, 10);

  return (
    <section className="space-y-4" aria-labelledby="price-guide-heading">
      <div className="space-y-1">
        <h2 id="price-guide-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
          What’s a fair price in Iloilo?
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick a popular model. Typical ask is the median of similar active listings from the last 30 days.
        </p>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a model">
            {chips.map((model) => {
              const active = model.key === selected.key;
              return (
                <button
                  key={model.key}
                  type="button"
                  onClick={() => setSelectedKey(model.key)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                  aria-pressed={active}
                >
                  {model.label}
                </button>
              );
            })}
          </div>
          <div>
            <CardTitle className="text-lg">{selected.label}</CardTitle>
            <CardDescription>
              Based on {selected.sampleSize} similar listings · last 30 days
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Typical ask</div>
              <div className="mt-1 font-mono text-xl font-semibold">
                {selected.median != null ? formatPhp(selected.median) : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Usual range</div>
              <div className="mt-1 font-mono text-sm font-semibold sm:text-base">
                {selected.p25 != null && selected.p75 != null
                  ? `${formatPhp(selected.p25)} – ${formatPhp(selected.p75)}`
                  : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">14-day trend</div>
              <div className={cn("mt-1 flex items-center gap-1.5 text-sm font-medium", tone.className)}>
                {tone.Icon ? <tone.Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
                <span>{tone.label}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-muted-foreground">Daily typical price</div>
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                Last 14 days
              </Badge>
            </div>
            <PriceTrendSparkline points={selected.trend} />
          </div>

          <NavButtonLink href={listingsHref} className="w-full sm:w-auto" pendingLabel="Opening deals…">
            View {selected.label} deals
          </NavButtonLink>
        </CardContent>
      </Card>
    </section>
  );
}
