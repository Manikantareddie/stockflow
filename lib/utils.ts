import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a monetary amount with grouped thousands and two decimals. No currency
 * symbol is assumed because the app has no currency setting yet.
 */
export function formatAmount(value: number): string {
  return amountFormatter.format(Number.isFinite(value) ? value : 0);
}
