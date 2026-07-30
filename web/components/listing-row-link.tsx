"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useTransition,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { ChevronRight, Loader2 } from "lucide-react";

import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ListingRowPendingContext = createContext(false);

export function useListingRowPending() {
  return useContext(ListingRowPendingContext);
}

type ListingRowLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  label: string;
};

export function ListingRowLink({ href, children, className, label }: ListingRowLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function go() {
    if (isPending) return;
    window.dispatchEvent(new Event("iaase:navigate"));
    startTransition(() => {
      router.push(href);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  }

  return (
    <ListingRowPendingContext.Provider value={isPending}>
      <TableRow
        role="link"
        tabIndex={isPending ? -1 : 0}
        aria-label={label}
        aria-busy={isPending}
        className={cn(
          "group cursor-pointer touch-manipulation transition-colors duration-200",
          "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          isPending && "bg-muted/50 opacity-70 pointer-events-none",
          className
        )}
        onClick={go}
        onKeyDown={onKeyDown}
      >
        {children}
      </TableRow>
    </ListingRowPendingContext.Provider>
  );
}

export function ListingRowChevron({ className }: { className?: string }) {
  const pending = useListingRowPending();
  if (pending) {
    return <Loader2 className={cn("h-4 w-4 animate-spin text-primary", className)} aria-hidden />;
  }
  return (
    <ChevronRight
      className={cn(
        "h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary",
        className
      )}
      aria-hidden
    />
  );
}
