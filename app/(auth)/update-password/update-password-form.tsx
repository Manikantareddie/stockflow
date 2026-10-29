"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { updatePasswordSchema, type UpdatePasswordInput } from "@/lib/validations";
import { updatePasswordAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/alert";

const initialState: AuthActionState = { error: null, success: null };

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);
  const {
    register,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema), mode: "onSubmit" });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />

      <Field
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters."
      >
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating..." : "Update password"}
      </Button>

      <p className="text-center text-sm text-secondary">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </p>
    </form>
  );
}
