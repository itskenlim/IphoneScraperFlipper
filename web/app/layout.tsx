import type { Metadata } from "next";
import { Suspense } from "react";
import { Fira_Code, Fira_Sans } from "next/font/google";

import "@/app/globals.css";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteHeader } from "@/components/site/header";
import { ThemeProvider } from "@/components/theme-provider";

const fontSans = Fira_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"]
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "IAASE — Affordable iPhones in Iloilo",
  description: "Find fair-priced Marketplace iPhones in Iloilo with deal scores, savings estimates, and risk flags."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-3 pb-10 pt-6 text-xs text-muted-foreground sm:px-4 lg:px-6">
            <div className="border-t border-border/70 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">IAASE</div>
                  <div className="text-xs text-muted-foreground">
                    iPhone listings for Iloilo and nearby.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>About</span>
                  <span>•</span>
                  <span>How scoring works</span>
                  <span>•</span>
                  <span>Contact</span>
                </div>
                <div className="text-[11px] text-muted-foreground sm:text-right">
                  Auto-updating listings
                </div>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
