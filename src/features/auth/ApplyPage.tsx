"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ErrorState";
import { invitationService } from "@/services/invitation.service";

type ApplyState = "loading" | "error" | "redirecting";

export function ApplyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ApplyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");
  const tenant = searchParams.get("tenant");
  const isInvalidLink = !token || !tenant;

  useEffect(() => {
    if (isInvalidLink) return;

    let cancelled = false;

    async function validateAndRedirect() {
      try {
        const details = await invitationService.validateInvitation(token!, tenant!);

        if (cancelled) return;

        if (details.status !== "PENDING") {
          setState("error");
          setErrorMessage(
            details.status === "EXPIRED"
              ? "This invitation has expired. Please contact your loan officer for a new link."
              : `This invitation is no longer valid (status: ${details.status}).`
          );
          return;
        }

        const expiresAt = new Date(details.expiresAt);
        if (expiresAt.getTime() < Date.now()) {
          setState("error");
          setErrorMessage(
            "This invitation has expired. Please contact your loan officer for a new link."
          );
          return;
        }

        invitationService.saveInvitation(details, token!, tenant!);
        setState("redirecting");
        router.replace(
          `/auth/register?token=${encodeURIComponent(token!)}&tenant=${encodeURIComponent(tenant!)}`
        );
      } catch (err: unknown) {
        if (cancelled) return;
        setState("error");
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Unable to validate your invitation. Please try again or contact support.";
        setErrorMessage(message);
      }
    }

    validateAndRedirect();
    return () => {
      cancelled = true;
    };
  }, [token, tenant, router, isInvalidLink]);

  if (isInvalidLink) {
    return (
      <ErrorState
        title="Invitation not valid"
        message="Invalid invitation link. Token and tenant are required."
        code="NOT_FOUND"
      />
    );
  }

  if (state === "error") {
    return (
      <ErrorState
        title="Invitation not valid"
        message={errorMessage}
        code="NOT_FOUND"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
          <Building2 className="h-6 w-6 text-white" />
        </div>

        {(state === "loading" || state === "redirecting") && (
          <Card className="border-0 shadow-xl shadow-gray-100/50">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {state === "loading"
                    ? "Validating your invitation…"
                    : "Launching registration…"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we set up your account.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
