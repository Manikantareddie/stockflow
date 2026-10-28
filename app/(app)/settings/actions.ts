"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/data";
import { thresholdSchema, toNumber } from "@/lib/validations";

export type ThresholdActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export async function updateThresholdAction(value: string): Promise<ThresholdActionResult> {
  const parsed = thresholdSchema.safeParse({ default_low_stock_threshold: value });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid threshold.";
    return {
      ok: false,
      error: message,
      fieldErrors: { default_low_stock_threshold: message },
    };
  }

  const { supabase, organization } = await getCurrentContext();

  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ default_low_stock_threshold: toNumber(parsed.data.default_low_stock_threshold) })
    .eq("id", organization.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: "Unable to update the threshold. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/settings");
  return { ok: true, message: "Default low-stock threshold updated." };
}
