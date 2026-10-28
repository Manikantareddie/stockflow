"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY: StockAdjustmentInput = { delta: "", note: "" };

export function AdjustStockDialog({
  open,
  onOpenChange,
  productName,
  currentQuantity,
  onSubmit,
  error,
  success,
  fieldErrors,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  currentQuantity: number;
  onSubmit: (values: StockAdjustmentInput) => void;
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string>;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  useEffect(() => {
    for (const [key, message] of Object.entries(fieldErrors)) {
      setError(key as keyof StockAdjustmentInput, { type: "server", message });
    }
  }, [fieldErrors, setError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {productName} currently has {currentQuantity} unit
            {currentQuantity === 1 ? "" : "s"} on hand.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormError message={error} />
          <FormSuccess message={success} />

          <Field
            label="Adjustment"
            htmlFor="adjust-delta"
            error={errors.delta?.message}
            hint="Use a positive number to add stock and a negative number to remove it"
          >
            <Input id="adjust-delta" inputMode="numeric" placeholder="e.g. 10 or -3" {...register("delta")} />
          </Field>

          <Field
            label="Note"
            htmlFor="adjust-note"
            error={errors.note?.message}
            hint="The note is for your reference in this dialog only."
          >
            <Input id="adjust-note" placeholder="Optional" {...register("note")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Applying..." : "Apply adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
