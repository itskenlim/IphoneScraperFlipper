"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top bar that flashes on route changes so navigations feel acknowledged
 * even when the destination is a slow dynamic page.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams?.toString() || ""}`;
  const [active, setActive] = useState(false);
  const prevKey = useRef(key);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;

    // Route completed — briefly finish then hide.
    setActive(true);
    const done = window.setTimeout(() => setActive(false), 280);
    timers.current.push(done);
    return () => {
      window.clearTimeout(done);
    };
  }, [key]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      setActive(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
      aria-hidden={!active}
    >
      <div
        className={[
          "h-full origin-left bg-primary transition-transform duration-300 ease-out",
          active ? "scale-x-100 animate-pulse" : "scale-x-0"
        ].join(" ")}
        style={{ transformOrigin: "left center" }}
      />
    </div>
  );
}
