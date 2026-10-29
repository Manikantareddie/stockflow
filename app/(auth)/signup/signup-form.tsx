"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { signUpAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/alert";

const initialState: AuthActionState = { error: null, success: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const {
    register,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onSubmit" });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Field
        label="Organization name"
        htmlFor="organizationName"
        error={errors.organizationName?.message}
        hint="Skip this if you were given an invite code below."
      >
        <Input
          id="organizationName"
          placeholder="Acme Supplies"
          autoComplete="organization"
          {...register("organizationName")}
        />
      </Field>

      <Field
        label="Invite code"
        htmlFor="inviteCode"
        error={errors.inviteCode?.message}
        hint="Join an existing team instead of creating a new organization."
      >
        <Input
          id="inviteCode"
          placeholder="Optional"
          autoComplete="off"
          {...register("inviteCode")}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters"
      >
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
      </Field>

      <Field
        label="Confirm password"
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
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
