"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/data";
import {
  productSchema,
  toNumber,
  toNumberOrNull,
  stockAdjustmentSchema,
  type ProductInput,
  type StockAdjustmentInput,
} from "@/lib/validations";

export type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  quantity?: number;
};

function revalidateInventory() {
  revalidatePath("/dashboard");
  revalidatePath("/products");
}

function firstIssueFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createProductAction(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid product.",
      fieldErrors: firstIssueFieldErrors(parsed.error.issues),
    };
  }

  const { supabase, organization, user } = await getCurrentContext();
  const data = parsed.data;

  const { error } = await supabase.from("products").insert({
    organization_id: organization.id,
    name: data.name,
    sku: data.sku,
    description: data.description === "" ? null : data.description,
    quantity_on_hand: toNumber(data.quantity_on_hand),
    cost_price: toNumberOrNull(data.cost_price),
    selling_price: toNumberOrNull(data.selling_price),
    low_stock_threshold: toNumberOrNull(data.low_stock_threshold),
    last_updated_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A product with this SKU already exists in your organization.",
        fieldErrors: { sku: "This SKU is already in use." },
      };
    }
    return { ok: false, error: "Unable to create the product. Please try again." };
  }

  revalidateInventory();
  return { ok: true, message: "Product created." };
}

export async function updateProductAction(
  id: string,
  input: ProductInput,
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid product.",
      fieldErrors: firstIssueFieldErrors(parsed.error.issues),
    };
  }

  const { supabase, organization, user } = await getCurrentContext();
  const data = parsed.data;

  const { data: updated, error } = await supabase
    .from("products")
    .update({
      name: data.name,
      sku: data.sku,
      description: data.description === "" ? null : data.description,
      quantity_on_hand: toNumber(data.quantity_on_hand),
      cost_price: toNumberOrNull(data.cost_price),
      selling_price: toNumberOrNull(data.selling_price),
      low_stock_threshold: toNumberOrNull(data.low_stock_threshold),
      last_updated_by: user.id,
    })
    .eq("id", id)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A product with this SKU already exists in your organization.",
        fieldErrors: { sku: "This SKU is already in use." },
      };
    }
    return { ok: false, error: "Unable to update the product. Please try again." };
  }

  if (!updated) {
    return { ok: false, error: "Product not found." };
  }

  revalidateInventory();
  return { ok: true, message: "Product updated." };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const { supabase, organization } = await getCurrentContext();

  const { data: deleted, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Unable to delete the product. Please try again." };
  }

  if (!deleted) {
    return { ok: false, error: "Product not found." };
  }

  revalidateInventory();
  return { ok: true, message: "Product deleted." };
}

export async function adjustStockAction(
  productId: string,
  input: StockAdjustmentInput,
): Promise<ActionResult> {
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid adjustment.",
      fieldErrors: firstIssueFieldErrors(parsed.error.issues),
    };
  }

  const { supabase } = await getCurrentContext();

  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_delta: toNumber(parsed.data.delta),
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("negative stock")) {
      return { ok: false, error: "Adjustment would result in negative stock." };
    }
    if (message.includes("must not be zero")) {
      return { ok: false, error: "Adjustment cannot be zero." };
    }
    if (message.includes("not found")) {
      return { ok: false, error: "Product not found." };
    }
    return { ok: false, error: "Unable to adjust stock. Please try again." };
  }

  revalidateInventory();
  revalidatePath(`/products/${productId}`);
  return { ok: true, message: "Stock updated.", quantity: data ?? undefined };
}

/** Escape a single CSV field. */
function csvEscape(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function exportProductsCsvAction(): Promise<{ ok: boolean; csv?: string; error?: string }> {
  const { supabase, organization } = await getCurrentContext();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { ok: false, error: "Unable to export products." };
  }

  const header = ["Name", "SKU", "Quantity", "Threshold", "Cost price", "Selling price"];
  const rows = (data ?? []).map((p) => [
    csvEscape(p.name),
    csvEscape(p.sku),
    csvEscape(p.quantity_on_hand),
    csvEscape(p.low_stock_threshold ?? organization.default_low_stock_threshold),
    csvEscape(p.cost_price),
    csvEscape(p.selling_price),
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n") + "\r\n";
  return { ok: true, csv };
}
