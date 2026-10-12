"use client";

import { Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { ProfileSearchPicker } from "@/features/profiles/components/ProfileSearchPicker";
import { parseApiError } from "@/lib/api-error";
import { applicationService } from "@/services/application.service";
import { profileService } from "@/services/profile.service";
import type { CustomerProfileSummary, FormData } from "@/types";
import {
  fieldValuesFromProfile,
  prefillWizardFormData,
} from "@/features/profiles/utils/prefill-wizard";

const CREATED_PREFIX = "loan-start:";

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function readStoredApplicationId(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeApplicationId(key: string, id: string) {
  try {
    sessionStorage.setItem(key, id);
  } catch {
    /* the in-memory id still prevents a second create in this mount */
  }
}

function clearStoredApplicationId(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore storage failures */
  }
}

function NewLoanApplicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams?.get("programId");
  const programCode = searchParams?.get("programCode");
  const programKey = programId || programCode;
  const customerProfileId = searchParams?.get("customerProfileId");
  const versionRaw = searchParams?.get("customerProfileVersionNo");
  const createdId = useRef<string | null>(null);
  const returnParams = new URLSearchParams();
  if (programId) returnParams.set("programId", programId);
  if (programCode) returnParams.set("programCode", programCode);
  const returnTo = `/loan-application/new?${returnParams.toString()}`;

  const { isError, error, refetch, isFetching } = useQuery({
    queryKey: ["create-application", programKey, customerProfileId],
    queryFn: async () => {
      if (!programKey || !customerProfileId) {
        throw { message: "Choose a profile before starting an application.", status: 400 };
      }
      const storageKey = `${CREATED_PREFIX}${programKey}:${customerProfileId}`;
      let applicationId = createdId.current ?? readStoredApplicationId(storageKey);
      let resolvedProgramId = programId ?? undefined;
      let resolvedProgramCode = programCode ?? undefined;

      if (applicationId) {
        try {
          const existing = await applicationService.getApplication(applicationId);
          resolvedProgramId = existing.programId || programId || undefined;
          resolvedProgramCode = existing.programCode || programCode || undefined;
        } catch (lookupError) {
          if (parseApiError(lookupError).status !== 404) throw lookupError;
          applicationId = null;
          createdId.current = null;
          clearStoredApplicationId(storageKey);
        }
      }

      if (!applicationId) {
        const versionNo = await resolveProfileVersion(customerProfileId, versionRaw);
        const app = await applicationService.createApplication(programKey, {
          customerProfileId,
          customerProfileVersionNo: versionNo,
        });
        applicationId = app.id;
        createdId.current = app.id;
        storeApplicationId(storageKey, app.id);
        resolvedProgramId = app.programId || programId || undefined;
        resolvedProgramCode = app.programCode || programCode || undefined;
      }

      await prefillFromProfile(applicationId, customerProfileId, resolvedProgramId || programKey);

      const resumeQuery = new URLSearchParams({ id: applicationId });
      if (resolvedProgramId) resumeQuery.set("programId", resolvedProgramId);
      if (resolvedProgramCode) resumeQuery.set("programCode", resolvedProgramCode);
      router.replace(`/loan-application/resume?${resumeQuery.toString()}`);
      return { id: applicationId };
    },
    enabled: !!programKey && !!customerProfileId,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  if (!programKey) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorState
          compact
          title="No program selected"
          message="Choose a loan program from the dashboard to start an application."
        />
      </div>
    );
  }

  if (!customerProfileId) {
    return (
      <div className="mx-auto max-w-xl space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Choose a profile</h1>
          <p className="mt-1 text-sm font-normal text-slate-500">
            The application is filled from this customer profile.
          </p>
        </div>
        <ProfileSearchPicker
          onSelect={(profile: CustomerProfileSummary) => {
            const next = new URLSearchParams(returnParams);
            next.set("customerProfileId", profile.id);
            next.set("customerProfileVersionNo", String(profile.currentVersionNo));
            router.replace(`/loan-application/new?${next.toString()}`);
          }}
        />
        <Button asChild variant="outline" size="md">
          <Link href={`/profiles/new?returnTo=${encodeURIComponent(returnTo)}`}>Create a profile</Link>
        </Button>
      </div>
    );
  }

  if (isError && !isFetching) {
    const apiError = parseApiError(error);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorState
          compact
          title="Unable to start application"
          message={apiError.message}
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  return <LoadingState message="Creating your application..." />;
}

async function resolveProfileVersion(profileId: string, versionRaw: string | null): Promise<number> {
  const parsed = versionRaw === null ? Number.NaN : Number(versionRaw);
  if (Number.isFinite(parsed)) return parsed;
  const profile = await profileService.get(profileId);
  return profile.currentVersionNo;
}

async function prefillFromProfile(applicationId: string, profileId: string, programKey: string) {
  const profile = await profileService.get(profileId);
  const [profileTemplates, product] = await Promise.all([
    profileService.getFormTemplateVersion(profile.templateCode, profile.templateVersion),
    applicationService.getLoanProductByProgramId(programKey),
  ]);
  const formData = prefillWizardFormData(
    product.templates,
    fieldValuesFromProfile(profileTemplates, profile.data)
  ) as FormData;
  if (Object.keys(formData).length === 0) return;
  await applicationService.saveDraft(
    {
      applicationId,
      productCode: product.code,
      programId: product.id,
      currentStep: 0,
      formData,
      stepStatuses: product.templates.map((item) => ({
        templateCode: item.code,
        completed: false,
        valid: false,
        touched: false,
      })),
    },
    product.templates
  );
}

export default function NewLoanApplicationPage() {
  return (
    <Suspense fallback={<LoadingState message="Creating your application..." />}>
      <NewLoanApplicationContent />
    </Suspense>
  );
}
