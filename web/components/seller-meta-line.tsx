import { formatSellerLine } from "@/lib/sellerDisplay";
import { cn } from "@/lib/utils";

type SellerMetaLineProps = {
  seller_name?: string | null;
  seller_id?: string | null;
  seller_active_count?: number | null;
  truncate?: boolean;
  className?: string;
};

export function SellerMetaLine({
  seller_name,
  seller_id,
  seller_active_count,
  truncate = false,
  className
}: SellerMetaLineProps) {
  const line = formatSellerLine({ seller_name, seller_id, seller_active_count });
  if (!line) return null;

  return (
    <div className={cn("text-xs text-muted-foreground", truncate && "truncate", className)} title={line}>
      {line}
    </div>
  );
}
