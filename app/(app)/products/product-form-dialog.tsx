"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validations";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const EMPTY_PRODUCT_FORM: ProductInput = {
  name: "",
  sku: "",
  description: "",
  quantity_on_hand: "0",
  cost_price: "",
  selling_price: "",
  low_stock_threshold: "",
};

export function productToFormValues(product: Product): ProductInput {
  return {
    name: product.name,
    sku: product.sku,
    description: product.description ?? "",
    quantity_on_hand: String(product.quantity_on_hand),
    cost_price: product.cost_price === null ? "" : String(product.cost_price),
    selling_price: product.selling_price === null ? "" : String(product.selling_price),
    low_stock_threshold:
      product.low_stock_threshold === null ? "" : String(product.low_stock_threshold),
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  error,
  fieldErrors,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSubmit: (values: ProductInput) => void;
  error: string | null;
  fieldErrors: Record<string, string>;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_PRODUCT_FORM,
    mode: "onSubmit",
  });

  useEffect(() => {
    if (open) {
      reset(product ? productToFormValues(product) : EMPTY_PRODUCT_FORM);
    }
  }, [open, product, reset]);

  useEffect(() => {
    for (const [key, message] of Object.entries(fieldErrors)) {
      setError(key as keyof ProductInput, { type: "server", message });
    }
  }, [fieldErrors, setError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Update this product's details."
              : "Add a product to your organization's inventory."}
          </DialogDescription>
        </DialogHeader>

        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormError message={error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="product-name" error={errors.name?.message}>
              <Input id="product-name" {...register("name")} />
            </Field>

            <Field label="SKU" htmlFor="product-sku" error={errors.sku?.message}>
              <Input id="product-sku" {...register("sku")} />
            </Field>
          </div>

          <Field label="Description" htmlFor="product-description" error={errors.description?.message}>
            <Textarea id="product-description" rows={3} {...register("description")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quantity on hand"
              htmlFor="product-quantity"
              error={errors.quantity_on_hand?.message}
            >
              <Input id="product-quantity" inputMode="numeric" {...register("quantity_on_hand")} />
            </Field>

            <Field
              label="Low-stock threshold"
              htmlFor="product-threshold"
              error={errors.low_stock_threshold?.message}
              hint="Leave blank to use the organization default"
            >
              <Input id="product-threshold" inputMode="numeric" {...register("low_stock_threshold")} />
            </Field>

            <Field label="Cost price" htmlFor="product-cost" error={errors.cost_price?.message}>
              <Input id="product-cost" inputMode="decimal" {...register("cost_price")} />
            </Field>

            <Field
              label="Selling price"
              htmlFor="product-price"
              error={errors.selling_price?.message}
            >
              <Input id="product-price" inputMode="decimal" {...register("selling_price")} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
