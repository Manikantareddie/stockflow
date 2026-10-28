"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { effectiveThreshold, isLowStock } from "@/lib/inventory";
import type { Organization, Product, StockFilter } from "@/lib/types";
import {
  adjustStockAction,
  createProductAction,
  deleteProductAction,
  exportProductsCsvAction,
  updateProductAction,
} from "./actions";
import type { ProductInput, StockAdjustmentInput } from "@/lib/validations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, FormSuccess } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductsToolbar } from "./products-toolbar";
import { ProductFormDialog } from "./product-form-dialog";
import { AdjustStockDialog } from "./adjust-stock-dialog";
import { DeleteProductDialog } from "./delete-product-dialog";

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toFixed(2);
}

export function ProductsView({
  products,
  organization,
  search,
  filter,
}: {
  products: Product[];
  organization: Organization;
  search: string;
  filter: StockFilter;
}) {
  const router = useRouter();

  const [flash, setFlash] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [formPending, setFormPending] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustFieldErrors, setAdjustFieldErrors] = useState<Record<string, string>>({});
  const [adjustPending, setAdjustPending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [exporting, setExporting] = useState(false);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormError(null);
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function openAdjust(product: Product) {
    setAdjustTarget(product);
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustFieldErrors({});
  }

  async function handleSubmitProduct(values: ProductInput) {
    setFormPending(true);
    setFormError(null);
    setFormFieldErrors({});

    const result = editing
      ? await updateProductAction(editing.id, values)
      : await createProductAction(values);

    setFormPending(false);

    if (!result.ok) {
      setFormError(result.error ?? "Something went wrong.");
      setFormFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setFlash(result.message ?? "Saved.");
    router.refresh();
  }

  async function handleAdjust(values: StockAdjustmentInput) {
    if (!adjustTarget) return;
    setAdjustPending(true);
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustFieldErrors({});

    const result = await adjustStockAction(adjustTarget.id, values);

    setAdjustPending(false);

    if (!result.ok) {
      setAdjustError(result.error ?? "Something went wrong.");
      setAdjustFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setAdjustSuccess(
      `Stock updated. ${adjustTarget.name} now has ${result.quantity ?? 0} unit${
        result.quantity === 1 ? "" : "s"
      } on hand.`,
    );
    setFlash("Stock adjusted.");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError(null);

    const result = await deleteProductAction(deleteTarget.id);

    setDeletePending(false);

    if (!result.ok) {
      setDeleteError(result.error ?? "Something went wrong.");
      return;
    }

    setDeleteTarget(null);
    setFlash(result.message ?? "Deleted.");
    router.refresh();
  }

  async function handleExport() {
    setExporting(true);
    const result = await exportProductsCsvAction();
    setExporting(false);

    if (!result.ok || !result.csv) {
      setFlash(result.error ?? "Unable to export products.");
      return;
    }

    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stockflow-products.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasAnyProducts = products.length > 0;
  const filtering = Boolean(search) || filter !== "all";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Products</h1>
        <p className="text-sm text-secondary">
          Manage the inventory for {organization.name}.
        </p>
      </div>

      <FormSuccess message={flash} />

      <ProductsToolbar
        search={search}
        filter={filter}
        onNewProduct={openCreate}
        onExport={handleExport}
        exporting={exporting}
      />

      <Card>
        <CardContent className="px-0 pt-5">
          {!hasAnyProducts ? (
            filtering ? (
              <EmptyState
                title="No matching products"
                description="Try a different search term or stock-status filter."
              />
            ) : (
              <EmptyState
                title="No products yet"
                description="Add your first product to start tracking stock."
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Stock status</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const low = isLowStock(product, organization);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-secondary">{product.sku}</TableCell>
                      <TableCell>{product.quantity_on_hand}</TableCell>
                      <TableCell>
                        <Badge variant={low ? "low" : "ok"}>
                          {low ? "Low stock" : "In stock"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMoney(product.selling_price)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openEdit(product)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openAdjust(product)}>
                              <SlidersHorizontal className="h-4 w-4" />
                              Adjust stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setDeleteError(null);
                                setDeleteTarget(product);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {hasAnyProducts ? (
        <p className="text-xs text-muted">
          {products.length} product{products.length === 1 ? "" : "s"}
          {filtering ? " matching your filters" : ""}. Effective low-stock threshold:{" "}
          {organization.default_low_stock_threshold} unless a product overrides it.
        </p>
      ) : null}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setFormError(null);
            setFormFieldErrors({});
          }
        }}
        product={editing}
        onSubmit={handleSubmitProduct}
        error={formError}
        fieldErrors={formFieldErrors}
        pending={formPending}
      />

      <AdjustStockDialog
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustTarget(null);
            setAdjustError(null);
            setAdjustSuccess(null);
            setAdjustFieldErrors({});
          }
        }}
        productName={adjustTarget?.name ?? ""}
        currentQuantity={adjustTarget?.quantity_on_hand ?? 0}
        onSubmit={handleAdjust}
        error={adjustError}
        success={adjustSuccess}
        fieldErrors={adjustFieldErrors}
        pending={adjustPending}
      />

      <DeleteProductDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        productName={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
        error={deleteError}
        pending={deletePending}
      />
    </div>
  );
}
