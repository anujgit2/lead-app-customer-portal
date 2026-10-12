"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InvitationRegisterFlow } from "@/features/auth/InvitationRegisterFlow";
import { SelfServeRegisterFlow } from "@/features/auth/SelfServeRegisterFlow";
import { invitationService } from "@/services/invitation.service";
import type { InvitationDetails } from "@/types";
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

  const token = searchParams.get("token");
  const tenant = searchParams.get("tenant");
  // No invitation params at all means a self-serve signup from the landing page.
  // Exactly one param means a broken invitation link, which should not silently
  // downgrade an invited user into a self-serve account.
  const isSelfServe = !token && !tenant;
  const isBrokenInvitationLink = !isSelfServe && (!token || !tenant);

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

  if (isSelfServe) {
    return <SelfServeRegisterFlow />;
  }

  if (isBrokenInvitationLink) {
    return (
      <AuthScreen
        topRight={<SignInLink />}
        asideTitle={signUpAside.title}
        asideDescription={signUpAside.description}
        points={SIGN_UP_POINTS}
      >
        <div className="flex flex-col items-start gap-4">
          <AlertCircle className="h-8 w-8 text-danger" />
          <div>
            <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">
              Invitation link incomplete
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This invitation link is missing information. Use the full link from your email, or create an account yourself.
            </p>
          </div>
          <Button asChild variant="outline" size="md">
            <Link href="/auth/register">Create an account</Link>
          </Button>
        </div>
      </AuthScreen>
    );
  }

  if (state === "loading") {
    return (
      <AuthScreen
        topRight={<SignInLink />}
        asideTitle={signUpAside.title}
        asideDescription={signUpAside.description}
        points={SIGN_UP_POINTS}
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading invitation…
        </div>
      </AuthScreen>
    );
  }

  if (state === "error") {
    return (
      <AuthScreen
        topRight={<SignInLink />}
        asideTitle={signUpAside.title}
        asideDescription={signUpAside.description}
        points={SIGN_UP_POINTS}
      >
        <div className="flex flex-col items-start gap-4">
          <AlertCircle className="h-8 w-8 text-danger" />
          <div>
            <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">Cannot register</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{errorMessage}</p>
          </div>
          <Button asChild variant="outline" size="md">
            <Link href="/auth/login">Sign in instead</Link>
          </Button>
        </div>
      </AuthScreen>
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
