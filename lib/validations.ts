import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const signupSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(60, "Organization name must be at most 60 characters"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

const INT_MAX = 2147483647;
const MONEY_MAX = 9999999999.99;

const nonNegativeIntegerString = (label: string, required = true) =>
  z
    .string()
    .trim()
    .refine((v) => (required ? v.length > 0 : true), `${label} is required`)
    .refine((v) => v === "" || /^\d+$/.test(v), `${label} must be a whole number`)
    .refine((v) => v === "" || Number(v) <= INT_MAX, `${label} is too large`);

const optionalMoneyString = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a valid amount`)
    .refine((v) => v === "" || Number(v) <= MONEY_MAX, `${label} is too large`);

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(60, "SKU must be at most 60 characters"),
  description: z.string().trim().max(1000, "Description is too long"),
  quantity_on_hand: nonNegativeIntegerString("Quantity"),
  cost_price: optionalMoneyString("Cost price"),
  selling_price: optionalMoneyString("Selling price"),
  low_stock_threshold: nonNegativeIntegerString("Threshold", false),
});

export const stockAdjustmentSchema = z.object({
  delta: z
    .string()
    .trim()
    .min(1, "Enter an adjustment amount")
    .refine((v) => /^-?\d+$/.test(v), "Adjustment must be a whole number")
    .refine((v) => Number(v) !== 0, "Adjustment cannot be zero"),
  note: z.string().trim().max(280, "Note is too long"),
});

export const thresholdSchema = z.object({
  default_low_stock_threshold: nonNegativeIntegerString("Threshold"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type ThresholdInput = z.infer<typeof thresholdSchema>;

/** Convert a validated numeric string to a number, or null when blank. */
export function toNumberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

/** Convert a validated numeric string to a number. */
export function toNumber(value: string): number {
  return Number(value);
}
