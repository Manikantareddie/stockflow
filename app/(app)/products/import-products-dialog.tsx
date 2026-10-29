"use client";

import { useEffect, useRef, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_LISTED_ERRORS = 8;

export function ImportProductsDialog({
  open,
  onOpenChange,
  onSubmit,
  error,
  success,
  rowErrors,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (csvText: string) => void;
  error: string | null;
  success: string | null;
  rowErrors: { line: number; message: string }[];
  pending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCsvText("");
    setFileName("");
    setReadError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  const rowCount = csvText ? Math.max(parseCsv(csvText).length - 1, 0) : 0;
  const listedErrors = rowErrors.slice(0, MAX_LISTED_ERRORS);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReadError(null);
    try {
      setCsvText(await file.text());
      setFileName(file.name);
    } catch {
      setCsvText("");
      setFileName("");
      setReadError("Unable to read that file. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with the columns Name, SKU, Quantity, Threshold, Cost price and Selling
            price. Only Name and SKU are required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <FormError message={error ?? readError} />
          <FormSuccess message={success} />

          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={pending}
              className="block w-full cursor-pointer rounded-md border border-border bg-background text-sm text-secondary file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/20"
            />
            {fileName ? (
              <p className="text-xs text-muted">
                {fileName} — {rowCount} data row{rowCount === 1 ? "" : "s"} detected.
              </p>
            ) : (
              <p className="text-xs text-muted">
                You can export your current products first to use as a template.
              </p>
            )}
          </div>

          {listedErrors.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-xs font-medium text-destructive">
                {rowErrors.length} row{rowErrors.length === 1 ? "" : "s"} could not be imported:
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-destructive">
                {listedErrors.map((rowError) => (
                  <li key={rowError.line}>
                    Line {rowError.line}: {rowError.message}
                  </li>
                ))}
              </ul>
              {rowErrors.length > listedErrors.length ? (
                <p className="mt-1 text-xs text-destructive">
                  +{rowErrors.length - listedErrors.length} more
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => onSubmit(csvText)}
              disabled={pending || !csvText}
            >
              {pending ? "Importing..." : "Import products"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
