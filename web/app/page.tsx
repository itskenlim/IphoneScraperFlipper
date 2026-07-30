import { BadgePercent, Clock, Flag, Radar, ShieldCheck } from "lucide-react";

import { ListingSignalPills } from "@/components/listing-signal-pills";
import { NavButtonLink } from "@/components/nav-pending";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const previewRiskFlags = {
  face_id_working: true,
  trutone_working: true,
  lcd_replaced: true,
  network_locked: false,
  no_description: false
};

const stats = [
  { label: "Fair prices", value: "Find cheaper phones", helper: "See what’s priced below typical" },
  { label: "Risk checks", value: "Buy with more confidence", helper: "Face ID, screen, locks, and more" },
  { label: "Fresh listings", value: "Catch deals early", helper: "Listings checked on a schedule" }
];

const steps = [
  {
    title: "We scan new listings",
    description: "Fresh posts from Iloilo Marketplace show up quickly.",
    icon: Radar
  },
  {
    title: "We check price and condition",
    description: "We compare similar phones so you can tell if the price is fair.",
    icon: ShieldCheck
  },
  {
    title: "We flag risks and savings",
    description: "See red flags and how much you might save vs typical prices.",
    icon: BadgePercent
  }
];

const benefits = [
  {
    title: "Spot problems before you buy",
    description: "See red flags early so you avoid costly mistakes."
  },
  {
    title: "Know if the price is fair",
    description: "We compare similar listings so you don’t overpay."
  },
  {
    title: "Find cheaper iPhones faster",
    description: "Great for students and anyone shopping on a budget."
  },
  {
    title: "See only fresh listings",
    description: "Stay ahead with listings checked regularly."
  }
];

export default function Home() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Find affordable iPhones in Iloilo — without the guesswork.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Compare Marketplace prices, estimate how much you can save, and spot risky phones before you
            message the seller.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <NavButtonLink href="/listings" className="min-w-[160px]" pendingLabel="Opening listings…">
              View Listings
            </NavButtonLink>
          </div>
        </div>

        <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-[0_0_30px_rgba(37,99,235,0.12)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>See if the price looks fair.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">iPhone 12 Pro 128GB</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Iloilo City · active</span>
                  <Badge
                    variant="outline"
                    className="border-border bg-muted/40 text-[11px] text-muted-foreground"
                  >
                    Just posted
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="bg-emerald-600 text-white">
                  Good Deal?
                </Badge>
                <span className="text-xs text-muted-foreground">Confidence: Medium</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-muted/30 p-2">
                <div className="text-muted-foreground">Below typical</div>
                <div className="font-mono text-sm">22%</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-2">
                <div className="text-muted-foreground">Est. savings</div>
                <div className="font-mono text-sm">Save ₱1,500</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-2">
                <div className="text-muted-foreground">Good deal?</div>
                <div className="font-mono text-sm">Yes</div>
              </div>
            </div>
            <ListingSignalPills
              variant="detail"
              maxWarnings={2}
              riskFlags={previewRiskFlags}
              batteryHealth={87}
              openline={true}
            />
            <div className="rounded-lg border border-rose-500/60 bg-rose-500/5 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-rose-300">
                <Flag className="h-4 w-4" />
                Red Flags
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>LCD replaced</li>
                <li>Screen issue likely</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/70 bg-card/70">
            <CardContent className="flex min-h-[120px] flex-col justify-center gap-2 p-4">
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              <div className="text-lg font-semibold text-foreground">
                <span className="font-mono" style={{ textShadow: "0 0 12px rgba(37,99,235,0.35)" }}>
                  {stat.value}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{stat.helper}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">How it works</h2>
          <p className="text-sm text-muted-foreground">Built for buyers shopping local Marketplace phones.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title} className="h-full border-border/70 bg-card/70">
              <CardContent className="flex min-h-[140px] flex-col justify-center gap-3 p-4">
                <step.icon className="h-5 w-5 text-primary" aria-hidden />
                <div className="text-sm font-semibold">{step.title}</div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">So you know what’s worth messaging.</p>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Why it helps</h2>
          <p className="text-sm text-muted-foreground">
            Useful whether you’re a student on a budget or just want a fair local deal.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="border-border/70 bg-card/70">
              <CardContent className="flex min-h-[140px] flex-col justify-center gap-3 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <BadgePercent className="h-4 w-4 text-primary" aria-hidden />
                  {benefit.title}
                </div>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Built on real marketplace data</CardTitle>
            <CardDescription>Local price context you can trust.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" aria-hidden />
              Based on real Iloilo Marketplace listings.
            </div>
            <div className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-primary" aria-hidden />
              Analyzes price, condition, and listing details.
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              Listings are checked regularly.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Ready to browse?</CardTitle>
            <CardDescription>See what’s available near you right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <NavButtonLink href="/listings" className="w-full" pendingLabel="Opening listings…">
              View listings
            </NavButtonLink>
            <p className="text-xs text-muted-foreground">Compare prices and risks before you buy.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
