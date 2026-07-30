"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Must render as a descendant of `next/link` Link for pending status. */
export function LinkPendingLabel({
  idle,
  pendingLabel = "Loading…"
}: {
  idle: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{idle}</>;
  return (
    <span className="inline-flex items-center gap-2" aria-live="polite">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      <span>{pendingLabel}</span>
    </span>
  );
}

type NavButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  prefetch?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

/** Button-styled Link with instant pending feedback while the route loads. */
export function NavButtonLink({
  href,
  children,
  pendingLabel = "Loading…",
  className,
  prefetch = true,
  variant = "default",
  size = "default"
}: NavButtonLinkProps) {
  return (
    <Button asChild variant={variant} size={size} className={cn("cursor-pointer", className)}>
      <Link href={href} prefetch={prefetch}>
        <LinkPendingLabel idle={children} pendingLabel={pendingLabel} />
      </Link>
    </Button>
  );
}
