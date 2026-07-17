"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ authed }: { authed: boolean }) {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const closeOnWide = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", closeOnWide);
    return () => mq.removeEventListener("change", closeOnWide);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
        <Link
          href="/"
          className="group inline-flex min-w-0 items-center gap-2 cursor-pointer"
          onClick={() => setMenuOpen(false)}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_18px_rgba(37,99,235,0.55)]" />
          <span className="text-sm font-semibold tracking-tight">IAASE</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">iPhone deals</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1.5 sm:flex" aria-label="Primary">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="cursor-pointer"
            onClick={toggleTheme}
          >
            <Sun className={cn("h-4 w-4", theme === "dark" ? "hidden" : "block")} />
            <Moon className={cn("h-4 w-4", theme === "dark" ? "block" : "hidden")} />
          </Button>
          <Button asChild variant="ghost" className="cursor-pointer">
            <Link href="/listings">Listings</Link>
          </Button>
          {authed ? (
            <Button asChild variant="secondary" className="cursor-pointer">
              <a href="/logout">
                <LogOut className="h-4 w-4" />
                Logout
              </a>
            </Button>
          ) : (
            <Button asChild variant="secondary" className="cursor-pointer">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            </Button>
          )}
        </nav>

        {/* Mobile: theme + menu only */}
        <div className="flex items-center gap-1 sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="cursor-pointer"
            onClick={toggleTheme}
          >
            <Sun className={cn("h-4 w-4", theme === "dark" ? "hidden" : "block")} />
            <Moon className={cn("h-4 w-4", theme === "dark" ? "block" : "hidden")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          className="border-t border-border/60 bg-background/95 sm:hidden"
          role="navigation"
          aria-label="Mobile"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-3">
            <Link
              href="/listings"
              className="cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-muted"
              onClick={() => setMenuOpen(false)}
            >
              View listings
            </Link>
            {authed ? (
              <a
                href="/logout"
                className="cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                Logout
              </a>
            ) : (
              <Link
                href="/login"
                className="cursor-pointer rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
