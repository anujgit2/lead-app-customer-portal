"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseApiError } from "@/lib/api-error";
import { userInvitationService } from "@/services/user-invitation.service";
import type { UserInvitation, UserInvitationStatus } from "@/types";

const QUERY_KEY = ["user-invitations"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_LABEL: Record<UserInvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REVOKED: "Revoked",
};

const STATUS_VARIANT: Record<UserInvitationStatus, "warning" | "success" | "draft"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REVOKED: "draft",
};

export function UserInvitationsPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const invitations = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => userInvitationService.listInvitations(),
  });

  const send = useMutation({
    mutationFn: (address: string) => userInvitationService.sendInvitation(address),
    onSuccess: (created) => {
      toast.success(`Invitation sent to ${created.invitedEmail}.`);
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: unknown) => toast.error(parseApiError(err).message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => userInvitationService.revokeInvitation(id),
    onSuccess: () => {
      toast.success("Invitation revoked.");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: unknown) => toast.error(parseApiError(err).message),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    send.mutate(trimmed);
  };

  const apiError = invitations.isError ? parseApiError(invitations.error) : null;

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Invite someone"
        description="Email a registration link. The link works once and expires after a set number of days."
      />

      <Card>
        <CardHeader>
          <CardTitle>Send an invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={!!emailError}
                className="h-11 bg-background"
              />
              {emailError && <p className="text-xs text-danger">{emailError}</p>}
            </div>
            <Button type="submit" size="md" loading={send.isPending} disabled={send.isPending}>
              Send invitation
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.isError ? (
            <ErrorState
              compact
              title="Unable to load invitations"
              message={apiError?.message ?? "Something went wrong."}
              status={apiError?.status}
              onRetry={() => void invitations.refetch()}
            />
          ) : invitations.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !invitations.data || invitations.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have not sent any invitations yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invitations.data.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  revoking={revoke.isPending && revoke.variables === invitation.id}
                  onRevoke={() => revoke.mutate(invitation.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function InvitationRow({
  invitation,
  revoking,
  onRevoke,
}: {
  invitation: UserInvitation;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const expires = safeDate(invitation.expiresAt);
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{invitation.invitedEmail}</p>
        <p className="text-xs text-muted-foreground">
          Sent {safeDate(invitation.createdAt)}
          {invitation.status === "PENDING" && expires ? ` · expires ${expires}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={STATUS_VARIANT[invitation.status]}>{STATUS_LABEL[invitation.status]}</Badge>
        {invitation.status === "PENDING" && (
          <Button variant="ghost" size="sm" onClick={onRevoke} loading={revoking} disabled={revoking}>
            Revoke
          </Button>
        )}
      </div>
    </li>
  );
}

function safeDate(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date, "d MMM yyyy");
}
