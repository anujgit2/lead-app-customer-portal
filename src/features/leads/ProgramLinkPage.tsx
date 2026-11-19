"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { leadService, rememberPendingProgramLink } from "@/services/lead.service";

/**
 * Opened from a partner's share link. A signed-in customer with a verified email gets their application
 * and is taken to it. Anyone else is asked to sign in or create an account first. After that, the
 * link is opened again, and the application is created.
 */
type Phase = "checking" | "invalid" | "needs-account" | "claiming" | "failed";

export function ProgramLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("checking");
  const [title, setTitle] = useState("Start your application");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function run() {
      try {
        const info = await leadService.validateProgramLink(token);
        if (cancelled) return;
        setTitle(`Start your ${info.programName} application`);
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase("invalid");
        setMessage(parseApiError(err).message);
        return;
      }

      setPhase("claiming");
      try {
        const { leadId } = await leadService.claimProgramLink(token);
        if (cancelled) return;
        router.replace(`/leads/view/?id=${leadId}`);
      } catch (err: unknown) {
        if (cancelled) return;
        const parsed = parseApiError(err);
        if (parsed.status === 401) {
          // Keep the link for after sign-in or registration.
          rememberPendingProgramLink(token);
          setPhase("needs-account");
          return;
        }
        setPhase("failed");
        setMessage(parsed.message);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (!token) {
    return (
      <PageShell width="narrow">
        <ErrorState compact title="Link incomplete" message="This link is missing its token." />
      </PageShell>
    );
  }

  if (phase === "checking" || phase === "claiming") {
    return (
      <PageShell width="narrow">
        <p className="text-sm text-muted-foreground">Opening your application…</p>
      </PageShell>
    );
  }

  if (phase === "invalid" || phase === "failed") {
    return (
      <PageShell width="narrow">
        <ErrorState compact title="Link unavailable" message={message ?? "This link cannot be used."} />
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Sign in, or create an account with a verified email, to start. You will come back here to open your application.
      </p>
      <div className="flex flex-col gap-3">
        <Link className="btn p" href="/auth/login/">Sign in</Link>
        <Link className="btn" href="/auth/register/">Create account</Link>
      </div>
    </PageShell>
  );
}
