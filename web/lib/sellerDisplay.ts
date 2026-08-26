export function formatSellerLine(input: {
  seller_name?: string | null;
  seller_id?: string | null;
  seller_active_count?: number | null;
}): string | null {
  const name = (input.seller_name || "").trim() || null;
  const id = (input.seller_id || "").trim() || null;
  if (!name && !id) return null;

  const parts: string[] = [];
  if (name) parts.push(name);
  if (id) parts.push(`id ${id}`);
  if (id && typeof input.seller_active_count === "number" && Number.isFinite(input.seller_active_count)) {
    parts.push(`${Math.round(input.seller_active_count)} active`);
  }
  return parts.join(" · ");
}

export function countActiveBySellerId(
  rows: Array<{ listing_seller_id?: string | null }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = (row.listing_seller_id || "").trim();
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return map;
}

export function attachSellerActiveCounts<
  T extends { seller_id?: string | null; seller_active_count?: number | null }
>(items: T[], counts: Map<string, number>): T[] {
  return items.map((item) => {
    const id = (item.seller_id || "").trim();
    if (!id) return { ...item, seller_active_count: null };
    return { ...item, seller_active_count: counts.has(id) ? (counts.get(id) as number) : null };
  });
}
