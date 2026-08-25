import { BadgePercent, Clock, Radar, ShieldCheck } from "lucide-react";

import { HeroLiveDeal, LiveDealsStrip } from "@/components/live-deals-strip";
import { MarketSnapshot } from "@/components/market-snapshot";
import { NavButtonLink } from "@/components/nav-pending";
import { PriceGuide } from "@/components/price-guide";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMarketPulse } from "@/lib/marketPulse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function Home() {
  const pulse = await fetchMarketPulse();
  const heroDeal = pulse.topDeals[0] ?? null;

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
            <NavButtonLink href="/listings?sort=deals" className="min-w-[160px]" pendingLabel="Opening listings…">
              View deals
            </NavButtonLink>
            <NavButtonLink
              href="/listings?sort=latest"
              variant="outline"
              className="min-w-[160px]"
              pendingLabel="Opening listings…"
            >
              Newest listings
            </NavButtonLink>
          </div>
        </div>

        <HeroLiveDeal deal={heroDeal} />
      </section>

      <MarketSnapshot pulse={pulse} />

      <PriceGuide models={pulse.models} defaultKey={pulse.defaultKey} />

      <LiveDealsStrip deals={pulse.topDeals} />

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
            <NavButtonLink href="/listings?sort=deals" className="w-full" pendingLabel="Opening listings…">
              View listings
            </NavButtonLink>
            <p className="text-xs text-muted-foreground">Compare prices and risks before you buy.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
