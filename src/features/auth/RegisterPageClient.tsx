"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InvitationRegisterFlow } from "@/features/auth/InvitationRegisterFlow";
import { SelfServeRegisterFlow } from "@/features/auth/SelfServeRegisterFlow";
import { invitationService } from "@/services/invitation.service";
import type { InvitationDetails } from "@/types";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <Card className="border-0 shadow-xl shadow-gray-100/50">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <h1 className="text-lg font-semibold">Invitation link incomplete</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  This invitation link is missing information. Use the full link
                  from your email, or create an account yourself.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/auth/register">Create an account</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl shadow-gray-100/50 w-full max-w-md">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading invitation…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <Card className="border-0 shadow-xl shadow-gray-100/50">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <h1 className="text-lg font-semibold">Cannot register</h1>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/auth/login">Sign in instead</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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
