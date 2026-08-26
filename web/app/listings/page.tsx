import Link from "next/link";
import { unstable_cache } from "next/cache";

import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { DealQualityBadge } from "@/components/deal-quality-badge";
import { BatteryHealthPill, PublicListingChecklist } from "@/components/listing-signal-pills";
import { ListingRowChevron, ListingRowLink } from "@/components/listing-row-link";
import { ListingsPageLink, ListingsSortToggle } from "@/components/listings-sort-toggle";
import { MonitorPausedNote } from "@/components/monitor-paused-note";
import { SellerMetaLine } from "@/components/seller-meta-line";
import { LinkPendingBusy, LinkPendingDetailsCue } from "@/components/nav-pending";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPublicListings } from "@/lib/data";
import { dealQualityLabel, isLowConfidence, underSimilarListingsCopy } from "@/lib/dealLabels";
import { formatDateTime, formatPct, formatPhp, formatRelativeAge } from "@/lib/format";
import { isMonitorPaused, isWithinMonitorWindow } from "@/lib/listingMonitor";
import { parseRiskFlags } from "@/lib/riskFlags";
import type { PublicListing } from "@/lib/types";
import { Flag } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] || "" : v || "";
}

function isNearbyListing(row: PublicListing) {
  const location = String(row.location_raw || "").toLowerCase();
  return (
    location.includes("bacolod") ||
    location.includes("silay") ||
    location.includes("guimaras")
  );
}

function statusBadge(status: string) {
  const s = String(status || "active").toLowerCase();
  if (s === "sold") return <Badge className="bg-amber-500 text-white">sold</Badge>;
  if (s === "unavailable") return <Badge className="bg-slate-600 text-white">unavailable</Badge>;
  return <Badge variant="secondary">active</Badge>;
}

function buildRedFlags(value: unknown): string[] {
  const flags = parseRiskFlags(value);
  const warnings: string[] = [];

  if (flags.icloud_lock) warnings.push("iCloud / reset risk");
  if (flags.wanted_post) warnings.push("Buyer/wanted post");
  if (flags.for_parts) warnings.push("For parts / repair");
  if (flags.dead_unit) warnings.push("Doesn't turn on / dead unit");
  if (flags.water_damage) warnings.push("Water damage");
  if (flags.price_too_low) warnings.push("Tikalon price check");
  if (flags.price_mismatch) warnings.push("Listing vs description price mismatch");
  if (flags.price_unverified) warnings.push("Price far below market — unverified");
  if (flags.audio_issue) warnings.push("Audio issue");
  if (flags.face_id_not_working) warnings.push("Face ID not working");
  if (flags.screen_issue) warnings.push("Screen issue detected");
  if (flags.camera_issue) warnings.push("Camera issue detected");
  if (flags.lcd_replaced) warnings.push("LCD replaced");
  if (flags.network_locked) warnings.push("Network lock");
  if (flags.wifi_only) warnings.push("WiFi-only");
  if (flags.trutone_missing) warnings.push("TrueTone missing");
  if (flags.back_glass_replaced) warnings.push("Back glass replaced");
  if (flags.back_glass_cracked) warnings.push("Back glass cracked");
  if (flags.battery_replaced) warnings.push("Battery replaced");
  if (flags.button_issue) warnings.push("Button issue (volume/power)");
  if (flags.no_description) warnings.push("Unknown condition");

  return warnings;
}

function ListingDealSignals({
  dealScore,
  belowMarketPct,
  confidence,
  profit
}: {
  dealScore: unknown;
  belowMarketPct?: number | null;
  confidence?: unknown;
  profit?: number | null;
}) {
  if (!dealQualityLabel(dealScore)) return null;
  const under = underSimilarListingsCopy(belowMarketPct, formatPct);
  const fewComps = isLowConfidence(confidence);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <DealQualityBadge score={dealScore} />
        {under ? <span>{under}</span> : null}
        {profit != null && profit > 0 ? (
          <span className="font-medium text-foreground">
            Save <span className="font-mono">{formatPhp(profit)}</span>
          </span>
        ) : null}
      </div>
      {fewComps ? <div className="text-[11px] text-muted-foreground">based on few comps</div> : null}
    </div>
  );
}

function showDeal(row: PublicListing, nowMs: number = Date.now()) {
  const s = String(row.deal_score || "").toUpperCase();
  if (!(s === "A" || s === "B" || s === "C")) return false;
  return isWithinMonitorWindow(row.posted_at, row.first_seen_at, row.deal_score, nowMs);
}

function buildHref(params: Record<string, string>, overrides: Partial<Record<string, string>>) {
  const merged = { ...params, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (!v) continue;
    sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

export default async function Home({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const params = {
    query: asString(sp.query),
    status: asString(sp.status),
    sort: asString(sp.sort) || "deals",
    page: asString(sp.page) || "1",
    nearby: asString(sp.nearby) || "1"
  };

  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const sortMode = params.sort === "latest" ? "latest" : "deals";
  const includeNearby = params.nearby !== "0";

  const pageSize = 30;
  const cacheKey = `public-listings:${params.query || ""}:${params.status || ""}:${sortMode}:${page}:${pageSize}`;
  const getListings = unstable_cache(
    () =>
      fetchPublicListings({
        query: params.query || null,
        status: params.status || null,
        sort: sortMode,
        page,
        pageSize
      }),
    [cacheKey],
    { revalidate: 30 }
  );
  const data = await getListings();

  const filteredItems = includeNearby ? data.items : data.items.filter((row) => !isNearbyListing(row));

  const nowMs = Date.now();
  const totalListings =
    typeof data.total === "number" && Number.isFinite(data.total) ? data.total : null;
  const updatedAt =
    data.items
      .map((i) => i.last_seen_at)
      .filter(Boolean)
      .map((v) => new Date(String(v)).getTime())
      .filter((ms) => Number.isFinite(ms))
      .sort((a, b) => b - a)[0] || null;
  const hasDeals = filteredItems.some((row) => showDeal(row, nowMs));
  const showDealColumn = sortMode === "deals" || hasDeals;
  const sortLabel = sortMode === "deals" ? "best deals" : "latest";

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">Public listings</h1>
            <p className="text-xs text-muted-foreground">
              Updated {updatedAt ? formatRelativeAge(new Date(updatedAt).toISOString(), nowMs) : "—"}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <ListingsSortToggle
              sortMode={sortMode}
              dealsHref={buildHref(params, { sort: "deals", page: "1" })}
              latestHref={buildHref(params, { sort: "latest", page: "1" })}
            />
          </div>
        </div>
      </header>

      <form method="get" className="grid gap-3 rounded-xl border border-border/70 bg-card/40 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px_120px] sm:items-end">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground sm:text-xs" htmlFor="query">
              Search
            </label>
            <Input id="query" name="query" placeholder="e.g. iPhone 13 128" defaultValue={params.query} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground sm:text-xs" htmlFor="status">
                Status
              </label>
              <AutoSubmitSelect
                id="status"
                name="status"
                defaultValue={sortMode === "deals" && !params.status ? "" : params.status}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10"
              >
                {sortMode === "deals" ? (
                  <>
                    <option value="">Active only</option>
                    <option value="all">Any status</option>
                    <option value="sold">sold</option>
                    <option value="unavailable">unavailable</option>
                  </>
                ) : (
                  <>
                    <option value="">Any</option>
                    <option value="active">active</option>
                    <option value="sold">sold</option>
                    <option value="unavailable">unavailable</option>
                  </>
                )}
              </AutoSubmitSelect>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground sm:text-xs" htmlFor="nearby">
                Area
              </label>
            <AutoSubmitSelect
              id="nearby"
              name="nearby"
              defaultValue={params.nearby}
              title="Nearby = Iloilo area, Silay, Guimaras"
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10"
            >
              <option value="1">Includes nearby</option>
              <option value="0">Iloilo only</option>
            </AutoSubmitSelect>
          </div>
          </div>
          <div>
            <Button type="submit" className="w-full">
              Search
            </Button>
          </div>
        </div>

        <div className="flex sm:hidden">
          <ListingsSortToggle
            sortMode={sortMode}
            dealsHref={buildHref(params, { sort: "deals", page: "1" })}
            latestHref={buildHref(params, { sort: "latest", page: "1" })}
            fullWidth
          />
        </div>

        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="sort" value={sortMode} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {filteredItems.length} items • page {data.page} • sorted by {sortLabel}
          </span>
          <Link className="underline underline-offset-4 hover:text-foreground" href="/listings">
            Clear filters
          </Link>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Listings</CardTitle>
          <CardDescription>
            Total listings (est.): {totalListings != null ? totalListings.toLocaleString() : "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>

          {filteredItems.length ? (
            <>
              <div className="space-y-3 sm:hidden">
                {filteredItems.map((row: PublicListing) => (
                  (() => {
                    const dealVisible = showDeal(row, nowMs);
                    const dealSignals = dealVisible ? (
                      <ListingDealSignals
                        dealScore={row.deal_score}
                        belowMarketPct={row.below_market_pct}
                        confidence={row.confidence}
                        profit={row.est_profit_php}
                      />
                    ) : null;
                    const redFlags = buildRedFlags(row.risk_flags);
                    const shownRedFlags = redFlags.slice(0, 6);
                    const extraRedFlags = redFlags.length - shownRedFlags.length;
                    return (
                      <Link
                        key={row.listing_id}
                        href={`/item/${encodeURIComponent(row.listing_id)}`}
                        aria-label={`View details for ${row.public_title}`}
                        className={[
                          "group relative block cursor-pointer touch-manipulation rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm",
                          "transition-colors duration-200",
                          "hover:border-primary/40 hover:bg-muted/30",
                          "active:border-primary/50 active:bg-muted/50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        ].join(" ")}
                      >
                        <LinkPendingBusy />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium leading-snug">
                              <span>{row.public_title}</span>
                              <BatteryHealthPill batteryHealth={row.battery_health} />
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{row.location_raw || "—"}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="flex justify-end">{statusBadge(row.status)}</div>
                            <div className="mt-1 font-mono text-sm">{formatPhp(row.price_php)}</div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <PublicListingChecklist riskFlags={row.risk_flags} openline={row.openline} />
                        </div>

                        {shownRedFlags.length ? (
                          <div className="mt-3 rounded-lg border border-rose-500/60 bg-rose-500/5 p-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2 font-medium text-rose-300">
                              <Flag className="h-3 w-3" aria-hidden />
                              Red Flags Detected
                            </div>
                            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 list-disc pl-4">
                              {shownRedFlags.map((flag) => (
                                <li key={flag}>{flag}</li>
                              ))}
                              {extraRedFlags > 0 ? (
                                <li className="col-span-2 text-muted-foreground">+{extraRedFlags} more</li>
                              ) : null}
                            </ul>
                          </div>
                        ) : null}

                        {dealSignals ? (
                          <div className="mt-3">{dealSignals}</div>
                        ) : sortMode === "deals" ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="h-6 px-2 py-0 text-[11px] text-muted-foreground">
                              Unscored
                            </Badge>
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono whitespace-nowrap">
                            {formatRelativeAge(row.posted_at || row.first_seen_at, nowMs)}
                            {!row.posted_at ? " (est.)" : ""}
                          </span>
                          <LinkPendingDetailsCue />
                        </div>
                        {isMonitorPaused(row.posted_at, row.first_seen_at, row.deal_score, nowMs) ? (
                          <MonitorPausedNote compact className="mt-1" dealScore={row.deal_score} />
                        ) : null}
                      </Link>
                    );
                  })()
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead className="whitespace-nowrap">Price</TableHead>
                      <TableHead className="whitespace-nowrap">Location</TableHead>
                      {showDealColumn ? <TableHead className="whitespace-nowrap">Deal</TableHead> : null}
                      <TableHead>Status</TableHead>
                      <TableHead className="whitespace-nowrap">Posted</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">Open</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((row: PublicListing) => (
                      (() => {
                        const dealVisible = showDeal(row, nowMs);
                        const dealSignals = dealVisible ? (
                          <ListingDealSignals
                            dealScore={row.deal_score}
                            belowMarketPct={row.below_market_pct}
                            confidence={row.confidence}
                            profit={row.est_profit_php}
                          />
                        ) : null;
                        const redFlags = buildRedFlags(row.risk_flags);
                        const shownRedFlags = redFlags.slice(0, 6);
                        const extraRedFlags = redFlags.length - shownRedFlags.length;
                        return (
                      <ListingRowLink
                        key={row.listing_id}
                        href={`/item/${encodeURIComponent(row.listing_id)}`}
                        label={`View details for ${row.public_title}`}
                      >
                        <TableCell className="min-w-[320px] max-w-[420px]">
                          <div className="font-medium text-foreground transition-colors duration-200 group-hover:text-primary">
                            {row.public_title}
                          </div>
                          <SellerMetaLine
                            seller_name={row.seller_name}
                            seller_id={row.seller_id}
                            seller_active_count={row.seller_active_count}
                            truncate
                            className="mt-1 max-w-[380px]"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <BatteryHealthPill batteryHealth={row.battery_health} />
                          </div>
                          <div className="mt-2">
                            <PublicListingChecklist riskFlags={row.risk_flags} openline={row.openline} />
                          </div>
                          {shownRedFlags.length ? (
                            <div className="mt-3 rounded-lg border border-rose-500/60 bg-rose-500/5 p-2 text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-2 font-medium text-rose-300">
                                <Flag className="h-3 w-3" aria-hidden />
                                Red Flags
                              </div>
                              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 list-disc pl-4">
                                {shownRedFlags.map((flag) => (
                                  <li key={flag}>{flag}</li>
                                ))}
                                {extraRedFlags > 0 ? (
                                  <li className="col-span-2 text-muted-foreground">+{extraRedFlags} more</li>
                                ) : null}
                              </ul>
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono">{formatPhp(row.price_php)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={row.location_raw || ""}>
                          {row.location_raw || "—"}
                        </TableCell>
                        {showDealColumn ? (
                          <TableCell className="max-w-[220px]">
                            {dealSignals ? (
                              dealSignals
                            ) : sortMode === "deals" ? (
                              <span className="text-xs text-muted-foreground">Unscored</span>
                            ) : null}
                          </TableCell>
                        ) : null}
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span title={formatDateTime(row.posted_at || row.first_seen_at)}>
                            {formatRelativeAge(row.posted_at || row.first_seen_at, nowMs)}
                          </span>
                          {!row.posted_at ? <span className="ml-2 text-[11px] text-muted-foreground">(est.)</span> : null}
                          {isMonitorPaused(row.posted_at, row.first_seen_at, row.deal_score, nowMs) ? (
                            <MonitorPausedNote
                              compact
                              className="mt-1 max-w-[11rem] whitespace-normal"
                              dealScore={row.deal_score}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="w-10">
                          <ListingRowChevron />
                        </TableCell>
                      </ListingRowLink>
                        );
                      })()
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <div className="text-sm font-medium">No results</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Try widening your filters (or clear them).
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <ListingsPageLink
              href={buildHref(params, { page: String(Math.max(1, data.page - 1)) })}
              disabled={data.page <= 1}
            >
              Prev
            </ListingsPageLink>

            <div className="text-xs text-muted-foreground">Page {data.page}</div>

            <ListingsPageLink href={buildHref(params, { page: String(data.page + 1) })} disabled={!data.hasMore}>
              Next
            </ListingsPageLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
