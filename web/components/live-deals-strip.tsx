import { DealQualityBadge } from "@/components/deal-quality-badge";
import { NavButtonLink, LinkPendingBusy, LinkPendingDetailsCue } from "@/components/nav-pending";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dealQualityLabel, underSimilarListingsCopy } from "@/lib/dealLabels";
import { formatPct, formatPhp } from "@/lib/format";
import type { PublicListing } from "@/lib/types";
import Link from "next/link";

function LiveDealCard({ row }: { row: PublicListing }) {
  const under = underSimilarListingsCopy(row.below_market_pct, formatPct);
  const label = dealQualityLabel(row.deal_score);
  return (
    <Link
      href={`/item/${encodeURIComponent(row.listing_id)}`}
      className="group relative block cursor-pointer rounded-xl border border-border/70 bg-card/70 p-4 transition-colors duration-200 hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View ${row.public_title}`}
    >
      <LinkPendingBusy />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{row.public_title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.location_raw || "Iloilo area"}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-semibold">{formatPhp(row.price_php)}</div>
          {label ? <div className="mt-1 flex justify-end"><DealQualityBadge score={row.deal_score} /></div> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{under || "Compared to similar listings"}</span>
        {row.est_profit_php != null && row.est_profit_php > 0 ? (
          <span className="font-medium text-foreground">
            Save <span className="font-mono">{formatPhp(row.est_profit_php)}</span>
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex justify-end">
        <LinkPendingDetailsCue />
      </div>
    </Link>
  );
}

export function LiveDealsStrip({ deals }: { deals: PublicListing[] }) {
  if (!deals.length) return null;

  return (
    <section className="space-y-4" aria-labelledby="live-deals-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="live-deals-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
            Deals worth a look
          </h2>
          <p className="text-sm text-muted-foreground">Live from Marketplace — scored against similar phones.</p>
        </div>
        <Badge variant="outline" className="text-[11px] text-muted-foreground">
          Updated regularly
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {deals.map((row) => (
          <LiveDealCard key={row.listing_id} row={row} />
        ))}
      </div>
      <NavButtonLink href="/listings?sort=deals" variant="outline" pendingLabel="Opening listings…">
        Browse all deals
      </NavButtonLink>
    </section>
  );
}

/** Hero-side live preview replacing the old static mock. */
export function HeroLiveDeal({ deal }: { deal: PublicListing | null }) {
  if (!deal) {
    return (
      <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-[0_0_30px_rgba(37,99,235,0.12)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Live market</CardTitle>
          <CardDescription>Fresh listings are still warming up.</CardDescription>
        </CardHeader>
        <CardContent>
          <NavButtonLink href="/listings" className="w-full" pendingLabel="Opening listings…">
            View listings
          </NavButtonLink>
        </CardContent>
      </Card>
    );
  }

  const under = underSimilarListingsCopy(deal.below_market_pct, formatPct);

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-[0_0_30px_rgba(37,99,235,0.12)]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Live deal</CardTitle>
        <CardDescription>A real listing from Iloilo Marketplace right now.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{deal.public_title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{deal.location_raw || "Iloilo area"} · active</div>
          </div>
          <DealQualityBadge score={deal.deal_score} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <div className="text-muted-foreground">Asking</div>
            <div className="font-mono text-sm">{formatPhp(deal.price_php)}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <div className="text-muted-foreground">Vs similar</div>
            <div className="font-mono text-sm">
              {deal.below_market_pct != null ? formatPct(deal.below_market_pct) : "—"}
            </div>
          </div>
          <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-2 sm:col-span-1">
            <div className="text-muted-foreground">Est. savings</div>
            <div className="font-mono text-sm">
              {deal.est_profit_php != null && deal.est_profit_php > 0 ? formatPhp(deal.est_profit_php) : "—"}
            </div>
          </div>
        </div>
        {under ? <p className="text-xs text-muted-foreground">{under}</p> : null}
        <NavButtonLink
          href={`/item/${encodeURIComponent(deal.listing_id)}`}
          className="w-full"
          pendingLabel="Opening deal…"
        >
          Open this listing
        </NavButtonLink>
      </CardContent>
    </Card>
  );
}
