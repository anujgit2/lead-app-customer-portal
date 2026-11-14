"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InvitationRegisterFlow } from "@/features/auth/InvitationRegisterFlow";
import { SelfServeRegisterFlow } from "@/features/auth/SelfServeRegisterFlow";
import { resolveRegisterEntry } from "@/features/auth/register-entry";
import { invitationService } from "@/services/invitation.service";
import { userInvitationService } from "@/services/user-invitation.service";
import { clearFullSession } from "@/lib/session";
import type { InvitationDetails, RegistrationPolicy } from "@/types";
import {
  AuthScreen,
  SignInLink,
  SIGN_UP_POINTS,
  signUpAside,
} from "@/features/auth/AuthScreen";

type PageState = "loading" | "ready" | "error";

export function RegisterPageClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [invitationToken, setInvitationToken] = useState("");

  // Tenant registration policy. Null until loaded, or when the call fails;
  // the server enforces the policy either way.
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [policy, setPolicy] = useState<RegistrationPolicy | null>(null);

  // User-to-user invitation (?userInvitation=…): preview state and the invited email.
  const [userInviteState, setUserInviteState] = useState<PageState>("loading");
  const [userInviteEmail, setUserInviteEmail] = useState("");
  const [userInviteError, setUserInviteError] = useState("");

  const token = searchParams.get("token");
  const tenant = searchParams.get("tenant");
  const userInvitation = searchParams.get("userInvitation");
  const entry = resolveRegisterEntry({
    token,
    tenant,
    userInvitation,
    policy: policyLoaded ? policy : null,
  });

  // Clear all tokens and cookies when landing on register page
  useEffect(() => {
    clearFullSession();
  }, []);

  useEffect(() => {
    let cancelled = false;
    userInvitationService
      .getRegistrationConfig()
      .then((config) => {
        if (!cancelled) setPolicy(config.policy);
      })
      .catch(() => {
        if (!cancelled) setPolicy(null);
      })
      .finally(() => {
        if (!cancelled) setPolicyLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userInvitation) return;
    let cancelled = false;
    userInvitationService
      .previewUserInvitation(userInvitation)
      .then((preview) => {
        if (cancelled) return;
        setUserInviteEmail(preview.invitedEmail);
        setUserInviteState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUserInviteError(
          err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "This invitation is invalid or has expired."
        );
        setUserInviteState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userInvitation]);

  useEffect(() => {
    async function loadInvitation() {
      if (!token || !tenant) return;

      const stored = invitationService.getStoredInvitation();
      if (
        stored &&
        stored.token === token &&
        stored.tenant === tenant &&
        stored.details.status === "PENDING"
      ) {
        setInvitation(stored.details);
        setInvitationToken(stored.token);
        setState("ready");
        return;
      }

      try {
        const details = await invitationService.validateInvitation(token, tenant);

        if (details.status !== "PENDING") {
          setState("error");
          setErrorMessage(
            details.status === "EXPIRED"
              ? "This invitation has expired."
              : "This invitation is no longer valid."
          );
          return;
        }

        invitationService.saveInvitation(details, token, tenant);
        setInvitation(details);
        setInvitationToken(token);
        setState("ready");
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Unable to load invitation details.";
        setState("error");
        setErrorMessage(message);
      }
    }

    loadInvitation();
  }, [token, tenant]);

  const signUpShell = (children: React.ReactNode) => (
    <AuthScreen
      topRight={<SignInLink />}
      asideTitle={signUpAside.title}
      asideDescription={signUpAside.description}
      points={SIGN_UP_POINTS}
    >
      {children}
    </AuthScreen>
  );

  const statusScreen = (title: string, message: string, action: React.ReactNode) =>
    signUpShell(
      <div className="flex flex-col items-start gap-4">
        <AlertCircle className="h-8 w-8 text-danger" />
        <div>
          <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        {action}
      </div>
    );

  const loadingScreen = (label: string) =>
    signUpShell(
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        {label}
      </div>
    );

  // Hold the form until the policy is known, so a closed tenant never flashes it.
  if (entry.kind === "self-serve" && !policyLoaded) {
    return loadingScreen("Loading…");
  }

  if (entry.kind === "self-serve") {
    return <SelfServeRegisterFlow />;
  }

  if (entry.kind === "user-invitation") {
    if (userInviteState === "loading") return loadingScreen("Loading invitation…");
    if (userInviteState === "error") {
      return statusScreen(
        "Cannot register",
        userInviteError,
        <Button asChild variant="outline" size="md">
          <Link href="/auth/login">Sign in instead</Link>
        </Button>
      );
    }
    return (
      <SelfServeRegisterFlow
        invitation={{ token: entry.token, email: userInviteEmail }}
      />
    );
  }

  if (entry.kind === "closed") {
    return statusScreen(
      "Registration is closed",
      "New accounts are not open for this portal. Contact your loan officer for access.",
      <Button asChild variant="outline" size="md">
        <Link href="/auth/login">Sign in instead</Link>
      </Button>
    );
  }

  if (entry.kind === "invitation-required") {
    return statusScreen(
      "Registration is by invitation",
      "Ask a registered user to send you an invitation link by email. Open that link to create your account.",
      <Button asChild variant="outline" size="md">
        <Link href="/auth/login">Sign in instead</Link>
      </Button>
    );
  }

  if (entry.kind === "broken-application-invitation") {
    return statusScreen(
      "Invitation link incomplete",
      "This invitation link is missing information. Use the full link from your email, or create an account yourself.",
      <Button asChild variant="outline" size="md">
        <Link href="/auth/register">Create an account</Link>
      </Button>
    );
  }

  // entry.kind === "application-invitation"
  if (state === "loading") {
    return loadingScreen("Loading invitation…");
  }

  if (state === "error") {
    return statusScreen(
      "Cannot register",
      errorMessage,
      <Button asChild variant="outline" size="md">
        <Link href="/auth/login">Sign in instead</Link>
      </Button>
    );
  }

  if (invitation && invitationToken) {
    return (
      <InvitationRegisterFlow
        invitation={invitation}
        invitationToken={invitationToken}
      />
    );
  }

  return null;
}
