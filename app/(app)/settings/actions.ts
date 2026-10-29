"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/data";
import { memberRoleSchema, thresholdSchema, toNumber } from "@/lib/validations";

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

export type TeamActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  code?: string;
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) {
    code += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
  }
  return code;
}

export async function updateMemberRoleAction(
  userId: string,
  role: string,
): Promise<TeamActionResult> {
  const parsedRole = memberRoleSchema.safeParse(role);
  if (!parsedRole.success) {
    return { ok: false, error: "Invalid role." };
  }

  const { supabase, organization, user } = await getCurrentContext();

  if (user.id === userId) {
    return { ok: false, error: "You cannot change your own role." };
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ role: parsedRole.data })
    .eq("id", userId)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: "Unable to update that member. Please try again." };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Role updated." };
}

export async function removeMemberAction(userId: string): Promise<TeamActionResult> {
  const { supabase, organization, user } = await getCurrentContext();

  if (user.id === userId) {
    return { ok: false, error: "You cannot remove yourself from the organization." };
  }

  const { data: deleted, error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return { ok: false, error: "Unable to remove that member. Please try again." };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Member removed." };
}

export async function createInviteAction(): Promise<TeamActionResult> {
  const { supabase, organization, profile, user } = await getCurrentContext();

  if (profile.role !== "owner") {
    return { ok: false, error: "Only owners can create invite codes." };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateInviteCode();
    const { error } = await supabase.from("organization_invites").insert({
      organization_id: organization.id,
      code,
      role: "member",
      created_by: user.id,
      expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    });

    if (!error) {
      revalidatePath("/settings");
      return { ok: true, code, message: "Invite code created. It expires in 7 days." };
    }

    if (error.code !== "23505") break;
  }

  return { ok: false, error: "Unable to create an invite code. Please try again." };
}

export async function revokeInviteAction(inviteId: string): Promise<TeamActionResult> {
  const { supabase, organization, profile } = await getCurrentContext();

  if (profile.role !== "owner") {
    return { ok: false, error: "Only owners can revoke invite codes." };
  }

  const { data: deleted, error } = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return { ok: false, error: "Unable to revoke that invite code." };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Invite code revoked." };
}
