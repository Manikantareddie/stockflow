import { formatAmount } from "@/lib/utils";
import type { ProductValue } from "@/lib/inventory";

/**
 * Dependency-free horizontal bar chart. Bars are plain divs scaled against the
 * largest value so the component stays a Server Component with no client JS.
 */
export function InventoryValueChart({ items }: { items: ProductValue[] }) {
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 0);

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const width = max > 0 ? Math.max((item.value / max) * 100, 2) : 0;
        return (
          <li key={item.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {item.name}
                <span className="ml-2 text-xs font-normal text-muted">{item.sku}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-secondary">
                {formatAmount(item.value)}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-sm bg-background"
              role="img"
              aria-label={`${item.name} stock value ${formatAmount(item.value)}`}
            >
              <div className="h-full rounded-sm bg-primary" style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
