"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/PageShell";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { leadService, takePendingInvite } from "@/services/lead.service";

const STATUS_LABEL: Record<string, string> = {
  CREATED: "Waiting for invite",
  INVITED: "Invited",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INFO_REQUESTED: "More information needed",
  FORWARDED: "With lender",
  CONVERTED: "Application created",
  REJECTED: "Closed",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};

export function LeadsListPage() {
  const router = useRouter();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const triedPending = useRef(false);

  // An invite accepted before sign-in is completed here, once the customer is signed in.
  useEffect(() => {
    if (triedPending.current) return;
    triedPending.current = true;
    const token = takePendingInvite();
    if (!token) return;
    leadService
      .acceptInvite(token)
      .then(({ leadId }) => router.replace(`/leads/view/?id=${leadId}`))
      .catch((err: unknown) => setInviteError(parseApiError(err).message));
  }, [router]);

  const leads = useQuery({
    queryKey: ["customer-leads"],
    queryFn: () => leadService.list(),
  });

  return (
    <PageShell>
      <header>
        <h1 className="text-2xl font-semibold">Your applications</h1>
        <p className="text-sm text-muted-foreground">Applications a partner has started for you.</p>
      </header>

      {inviteError && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {inviteError}
        </p>
      )}

      {leads.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {leads.isError && (
        <ErrorState
          compact
          title="Unable to load applications"
          message={parseApiError(leads.error).message}
          onRetry={() => leads.refetch()}
        />
      )}

      {leads.data && leads.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Open the invite link your partner sent you to get started.
        </p>
      )}

      {leads.data && leads.data.length > 0 && (
        <ul className="divide-y rounded border">
          {leads.data.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{STATUS_LABEL[lead.status] ?? lead.status}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(lead.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Link className="text-sm font-medium underline" href={`/leads/view/?id=${lead.id}`}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
