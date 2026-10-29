"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationInvite, Profile } from "@/lib/types";
import {
  createInviteAction,
  removeMemberAction,
  revokeInviteAction,
  updateMemberRoleAction,
} from "./actions";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function TeamSection({
  members,
  invites,
  currentUserId,
  isOwner,
}: {
  members: Profile[];
  invites: OrganizationInvite[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function run(id: string, action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setPendingId(id);
    setError(null);
    setSuccess(null);

    const result = await action();

    setPendingId(null);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    setSuccess(result.message ?? "Saved.");
    router.refresh();
  }

  async function handleCreateInvite() {
    setCreating(true);
    setError(null);
    setSuccess(null);

    const result = await createInviteAction();

    setCreating(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    setSuccess(result.message ?? "Invite code created.");
    router.refresh();
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess(`Copied ${code} to your clipboard.`);
    } catch {
      setError("Copy failed. Please select the code manually.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <FormError message={error} />
      <FormSuccess message={success} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {isOwner ? <TableHead className="w-24 text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const busy = pendingId === member.id;
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.email}
                  {isSelf ? <span className="ml-2 text-xs text-muted">(you)</span> : null}
                </TableCell>
                <TableCell>
                  {isOwner && !isSelf ? (
                    <Select
                      value={member.role}
                      disabled={busy}
                      onValueChange={(value) =>
                        run(member.id, () => updateMemberRoleAction(member.id, value))
                      }
                    >
                      <SelectTrigger className="w-32" aria-label={`Role for ${member.email}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="neutral">{member.role === "owner" ? "Owner" : "Member"}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-secondary">{formatDate(member.created_at)}</TableCell>
                {isOwner ? (
                  <TableCell className="text-right">
                    {isSelf ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => run(member.id, () => removeMemberAction(member.id))}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        {busy ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {isOwner ? (
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Invite codes</p>
              <p className="text-xs text-secondary">
                Share a code so a teammate can join this organization when they sign up.
              </p>
            </div>
            <Button variant="outline" onClick={handleCreateInvite} disabled={creating}>
              {creating ? "Creating..." : "Create invite code"}
            </Button>
          </div>

          {invites.length === 0 ? (
            <p className="text-xs text-muted">No active invite codes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {invite.code}
                    </span>
                    <span className="text-xs text-muted">
                      Member · expires {invite.expires_at ? formatDate(invite.expires_at) : "never"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(invite.code)}>
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingId === invite.id}
                      onClick={() => run(invite.id, () => revokeInviteAction(invite.id))}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {pendingId === invite.id ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
