"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function backTarget(pathname: string | null): { href: string; label: string } | null {
  if (!pathname || pathname === "/") return null;
  if (pathname.startsWith("/item/")) return { href: "/listings", label: "Back" };
  if (pathname.startsWith("/listings")) return { href: "/", label: "Back" };
  return { href: "/", label: "Back" };
}

export function SiteHeader() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const naturalBack = backTarget(pathname);
  // Latch click so the spinner stays visible until the route actually changes
  // (avoids useLinkStatus cutting the indicator mid-navigation).
  const [pendingBack, setPendingBack] = useState<{ href: string; label: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPendingBack(null);
  }, [pathname]);

  const back = pendingBack ?? naturalBack;
  const isPending = Boolean(pendingBack);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
        <Link href="/" className="group inline-flex min-w-0 items-center gap-2 cursor-pointer">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_18px_rgba(37,99,235,0.55)]" />
          <span className="text-sm font-semibold tracking-tight">IAASE</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">iPhone deals</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="cursor-pointer"
            onClick={toggleTheme}
          >
            {mounted ? (
              <>
                <Sun className={cn("h-4 w-4", theme === "dark" ? "hidden" : "block")} />
                <Moon className={cn("h-4 w-4", theme === "dark" ? "block" : "hidden")} />
              </>
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {back ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(
                "cursor-pointer gap-1.5 border-border px-2.5 sm:px-3",
                isPending && "pointer-events-none opacity-80"
              )}
            >
              <Link
                href={back.href}
                prefetch
                aria-busy={isPending}
                aria-label={isPending ? "Going back" : "Go back"}
                onClick={(e) => {
                  if (isPending) {
                    e.preventDefault();
                    return;
                  }
                  window.dispatchEvent(new Event("iaase:navigate"));
                  setPendingBack(back);
                }}
              >
                {isPending ? (
                  <span className="inline-flex items-center gap-1.5" aria-live="polite">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    <span>Back</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{back.label}</span>
                  </span>
                )}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
