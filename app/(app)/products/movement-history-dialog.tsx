"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, FormError } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Product, StockMovement } from "@/lib/types";
import { getProductMovementsAction } from "./actions";

const REASON_LABELS: Record<string, string> = {
  created: "Created",
  adjustment: "Manual adjustment",
  edit: "Edited",
};

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function MovementHistoryDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setMovements([]);

    getProductMovementsAction(product.id).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? "Unable to load stock history.");
        return;
      }
      setMovements(result.movements ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [open, product]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock history</DialogTitle>
          <DialogDescription>
            {product
              ? `Every change recorded for ${product.name} (${product.sku}).`
              : "Every change recorded for this product."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <FormError message={error} />

          {loading ? (
            <p className="px-1 py-6 text-center text-sm text-secondary">Loading history...</p>
          ) : movements.length === 0 && !error ? (
            <EmptyState
              title="No history yet"
              description="Changes to this product's stock will appear here."
            />
          ) : (
            <ol className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
              {movements.map((movement) => (
                <li key={movement.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        movement.delta > 0
                          ? "text-sm font-medium text-status-ok"
                          : "text-sm font-medium text-destructive"
                      }
                    >
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta} units
                    </span>
                    <Badge variant="neutral">{reasonLabel(movement.reason)}</Badge>
                  </div>
                  <p className="text-xs text-secondary">
                    New total: {movement.quantity_after} · {formatTimestamp(movement.created_at)}
                  </p>
                  {movement.note ? (
                    <p className="text-xs text-secondary">{movement.note}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
