"use client";

import Link from "next/link";

import { LinkPendingLabel } from "@/components/nav-pending";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListingsSortToggleProps = {
  sortMode: "deals" | "latest";
  dealsHref: string;
  latestHref: string;
  className?: string;
  fullWidth?: boolean;
};

export function ListingsSortToggle({
  sortMode,
  dealsHref,
  latestHref,
  className,
  fullWidth = false
}: ListingsSortToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border bg-background/60 p-1",
        fullWidth && "w-full",
        className
      )}
      role="group"
      aria-label="Sort listings"
    >
      <Button
        asChild
        size="sm"
        variant={sortMode === "deals" ? "secondary" : "ghost"}
        className={cn("h-9 px-3 text-xs cursor-pointer", fullWidth && "flex-1")}
      >
        <Link href={dealsHref} prefetch aria-current={sortMode === "deals" ? "page" : undefined}>
          <LinkPendingLabel idle="Best deals" pendingLabel="Sorting…" />
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={sortMode === "latest" ? "secondary" : "ghost"}
        className={cn("h-9 px-3 text-xs cursor-pointer", fullWidth && "flex-1")}
      >
        <Link href={latestHref} prefetch aria-current={sortMode === "latest" ? "page" : undefined}>
          <LinkPendingLabel idle="Latest" pendingLabel="Sorting…" />
        </Link>
      </Button>
    </div>
  );
}

type ListingsPageLinkProps = {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

export function ListingsPageLink({ href, children, disabled, className }: ListingsPageLinkProps) {
  if (disabled) {
    return (
      <Button variant="outline" className={cn("min-w-[120px] cursor-pointer", className)} disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" className={cn("min-w-[120px] cursor-pointer", className)}>
      <Link href={href} prefetch>
        <LinkPendingLabel idle={children} pendingLabel="Loading…" />
      </Link>
    </Button>
  );
}
