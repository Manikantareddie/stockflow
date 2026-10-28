"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormError } from "@/components/ui/alert";

export function DeleteProductDialog({
  open,
  onOpenChange,
  productName,
  onConfirm,
  error,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onConfirm: () => void;
  error: string | null;
  pending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete product</AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes <span className="font-medium text-foreground">{productName}</span>.
          This action cannot be undone.
        </AlertDialogDescription>

        <div className="mt-4 flex flex-col gap-3">
          <FormError message={error} />
          <AlertDialogFooter className="mt-0">
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
