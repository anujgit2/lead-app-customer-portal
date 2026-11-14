"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ErrorState } from "@/components/ErrorState";
import { parseApiError } from "@/lib/api-error";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import {
  forgetPendingInvite,
  leadService,
  rememberPendingInvite,
  type InvitePreview,
} from "@/services/lead.service";

/**
 * Flow for a partner's lead invitation:
 *  1. Validate the link.
 *  2. If the customer is already signed in, accept it and open the lead.
 *  3. Otherwise, if an account exists for the invited contact, ask them to sign in.
 *  4. Otherwise, send them to registration. The invite is kept, and the dashboard returns them
 *     here once the account is ready.
 */
type Phase = "checking" | "invalid" | "sign-in" | "create-account" | "accepting" | "failed";

export function LeadInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("checking");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function run() {
      try {
        const info = await leadService.validateInvite(token);
        if (cancelled) return;
        setPreview(info);
        if (info.status !== "PENDING") {
          forgetPendingInvite();
          setPhase("invalid");
          setMessage("This invite is no longer valid.");
          return;
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase("invalid");
        setMessage(parseApiError(err).message);
        return;
      }

      // Already signed in? Accept straight away.
      try {
        const { leadId } = await leadService.acceptInvite(token);
        if (cancelled) return;
        forgetPendingInvite();
        router.replace(`/leads/view/?id=${leadId}`);
        return;
      } catch (err: unknown) {
        if (cancelled) return;
        if (parseApiError(err).status !== 401) {
          forgetPendingInvite();
          setPhase("failed");
          setMessage(parseApiError(err).message);
          return;
        }
      }

      // Not signed in: sign in if an account exists, otherwise register.
      try {
        const { exists } = await leadService.accountStatus(token);
        if (cancelled) return;
        setPhase(exists ? "sign-in" : "create-account");
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase("failed");
        setMessage(parseApiError(err).message);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await authService.login({ email: email.trim(), password, rememberMe: false });
      if ("mfaRequired" in res && res.mfaRequired) {
        setMessage("Complete the verification step, then open this link again.");
        return;
      }
      setUser(res.user);
      const { leadId } = await leadService.acceptInvite(token);
      forgetPendingInvite();
      router.replace(`/leads/view/?id=${leadId}`);
    } catch (err: unknown) {
      setMessage(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const createAccount = () => {
    rememberPendingInvite(token);
    router.push("/auth/register/");
  };

  if (!token) {
    return (
      <PageShell width="narrow">
        <ErrorState compact title="Invite unavailable" message="This invite link is incomplete." />
      </PageShell>
    );
  }

  if (phase === "checking" || phase === "accepting") {
    return (
      <PageShell width="narrow">
        <p className="text-sm text-muted-foreground">Checking your invite…</p>
      </PageShell>
    );
  }

  if (phase === "invalid" || phase === "failed") {
    return (
      <PageShell width="narrow">
        <ErrorState compact title="Invite unavailable" message={message ?? "This invite cannot be used."} />
      </PageShell>
    );
  }

  if (phase === "create-account") {
    return (
      <PageShell width="narrow">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Your partner has started an application for you
          {preview?.invitedEmail ? ` (sent to ${preview.invitedEmail})` : ""}. Create an account with that
          email to continue. You will come back here to open it.
        </p>
        <button className="btn p" onClick={createAccount}>Create account</button>
        <p className="text-sm">
          Already have an account? <Link className="underline" href="/auth/login/">Sign in</Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <h1 className="text-2xl font-semibold">Sign in to continue</h1>
      <p className="text-sm text-muted-foreground">
        Sign in with the email this invite was sent to to open your application.
      </p>
      <form className="flex flex-col gap-3" onSubmit={signIn}>
        <input
          aria-label="Email"
          type="email"
          className="w-full rounded border p-2"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          aria-label="Password"
          type="password"
          className="w-full rounded border p-2"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {message && (
          <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}
        <button className="btn p" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in and open application"}
        </button>
      </form>
    </PageShell>
  );
}
