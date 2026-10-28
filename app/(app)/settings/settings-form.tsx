"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { thresholdSchema, type ThresholdInput } from "@/lib/validations";
import { updateThresholdAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/alert";

export function SettingsForm({ defaultValue }: { defaultValue: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<ThresholdInput>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: { default_low_stock_threshold: String(defaultValue) },
  });

  async function onSubmit(values: ThresholdInput) {
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await updateThresholdAction(values.default_low_stock_threshold);

    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      const fieldMessage = result.fieldErrors?.default_low_stock_threshold;
      if (fieldMessage) {
        setFieldError("default_low_stock_threshold", { type: "server", message: fieldMessage });
      }
      return;
    }

    setSuccess(result.message ?? "Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-sm flex-col gap-4">
      <FormError message={error} />
      <FormSuccess message={success} />

      <Field
        label="Default low-stock threshold"
        htmlFor="default-threshold"
        error={errors.default_low_stock_threshold?.message}
        hint="Products at or below this quantity are flagged as low stock."
      >
        <Input
          id="default-threshold"
          inputMode="numeric"
          {...register("default_low_stock_threshold")}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
