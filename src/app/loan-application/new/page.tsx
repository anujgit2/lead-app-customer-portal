"use client";

import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/layouts/AppLayout";
import { PageShell } from "@/components/PageShell";
import { LoadingProgressDialog } from "@/features/loan-application/LoadingProgressDialog";
import { ErrorState } from "@/components/ErrorState";
import { ChooseProfileDialog } from "@/features/loan-application/ChooseProfileDialog";
import {
  decodeProfileSelections,
  encodeProfileSelections,
  profileOptionsQueryKey,
  type ProfileSelection,
} from "@/features/loan-application/profile-options";
import { parseApiError } from "@/lib/api-error";
import { applicationService } from "@/services/application.service";
import { profileService } from "@/services/profile.service";
import { programService, tenantProgramsQueryKey } from "@/services/program.service";
import type { FormData } from "@/types";
import {
  fieldValuesFromProfile,
  prefillWizardFormData,
} from "@/features/profiles/utils/prefill-wizard";

const CREATED_PREFIX = "loan-start:";

/** `randomUUID` exists only in a secure context. */
function newStartToken(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `start-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function PageMessage({ children }: { children: ReactNode }) {
  return <PageShell width="narrow">{children}</PageShell>;
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
  const profilesParam = searchParams?.get("profiles");
  const withoutProfile = searchParams?.get("withoutProfile") === "1";
  const startToken = searchParams?.get("start");
  const selections = profilesParam ? decodeProfileSelections(profilesParam) : null;
  const profilesInvalid = profilesParam !== null && selections === null;
  const decisionInUrl = withoutProfile || selections !== null || profilesInvalid;
  const createdId = useRef<string | null>(null);
  const optionsQuery = useQuery({
    queryKey: profileOptionsQueryKey(programKey ?? "", {}),
    queryFn: () => programService.getProfileOptions(programKey!),
    enabled: !!programKey && !decisionInUrl,
    retry: 1,
  });
  const programsQuery = useQuery({
    queryKey: tenantProgramsQueryKey,
    queryFn: () => programService.getTenantPrograms(),
    enabled: optionsQuery.data?.promptOnCreate === true,
    retry: 1,
  });
  const matchedProgram = (programsQuery.data ?? []).find(
    (program) => program.id === programId || program.programCode === programCode
  );
  const applicationLabel =
    matchedProgram?.displayName ||
    matchedProgram?.name ||
    humanizeProgramCode(programCode) ||
    "New application";
  const skipPrompt = optionsQuery.data?.promptOnCreate === false;
  const showProfileDialog = optionsQuery.data?.promptOnCreate === true && !decisionInUrl;
  const legacyProfileId = skipPrompt && customerProfileId ? customerProfileId : null;
  const canCreate =
    !!programKey && !profilesInvalid && (withoutProfile || selections !== null || !!legacyProfileId);

  useEffect(() => {
    if (!programKey || decisionInUrl || !skipPrompt || customerProfileId) return;
    const next = new URLSearchParams();
    if (programId) next.set("programId", programId);
    if (programCode) next.set("programCode", programCode);
    next.set("withoutProfile", "1");
    next.set("start", newStartToken());
    router.replace(`/loan-application/new?${next.toString()}`);
  }, [programKey, programId, programCode, decisionInUrl, skipPrompt, customerProfileId, router]);

  const selectionKey = selections
    ? `slots:${profilesParam}`
    : withoutProfile
      ? `none:${startToken ?? "default"}`
      : legacyProfileId ?? "pending";

  const { isError, error, refetch, isFetching } = useQuery({
    queryKey: ["create-application", programKey, selectionKey],
    queryFn: async () => {
      if (!programKey || (!decisionInUrl && !legacyProfileId)) {
        throw { message: "Choose a profile or continue without one before starting an application.", status: 400 };
      }
      if (profilesParam && !selections) {
        throw { message: "The selected profiles are not valid.", status: 400 };
      }
      const accepted =
        selections && selections.length > 0
          ? await programService.acceptProfileSelections(programKey, selections)
          : [];
      if (selections && accepted.length !== selections.length) {
        throw {
          message: "One of the selected profiles is no longer available. Go back and choose again.",
          status: 400,
        };
      }
      const storageKey = `${CREATED_PREFIX}${programKey}:${selectionKey}`;
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
        const app = legacyProfileId
          ? await applicationService.createApplication(programKey, { customerProfileId: legacyProfileId })
          : await applicationService.createApplication(programKey);
        applicationId = app.id;
        createdId.current = app.id;
        storeApplicationId(storageKey, app.id);
        resolvedProgramId = app.programId || programId || undefined;
        resolvedProgramCode = app.programCode || programCode || undefined;
      }

      for (const item of accepted) {
        await applicationService.attachProfile(applicationId, item.slot, item.profileId);
      }
      if (accepted.length === 0 && legacyProfileId) {
        await prefillFromProfile(applicationId, legacyProfileId, resolvedProgramId || programKey);
      }

      const resumeQuery = new URLSearchParams({ id: applicationId });
      if (resolvedProgramId) resumeQuery.set("programId", resolvedProgramId);
      if (resolvedProgramCode) resumeQuery.set("programCode", resolvedProgramCode);
      router.replace(`/loan-application/resume?${resumeQuery.toString()}`);
      return { id: applicationId };
    },
    enabled: canCreate,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  if (!programKey) {
    return (
      <PageMessage>
        <ErrorState
          compact
          title="No program selected"
          message="Choose a loan program from the dashboard to start an application."
        />
      </PageMessage>
    );
  }

  if (profilesParam && !selections) {
    return (
      <PageMessage>
        <ErrorState
          compact
          title="Unable to start application"
          message="The selected profiles are not valid."
        />
      </PageMessage>
    );
  }

  if (!decisionInUrl && optionsQuery.isError) {
    const apiError = parseApiError(optionsQuery.error);
    return (
      <PageMessage>
        <ErrorState
          compact
          title="Unable to load profiles"
          message={apiError.message}
          onRetry={() => {
            void optionsQuery.refetch();
          }}
        />
      </PageMessage>
    );
  }

  if (showProfileDialog && programKey) {
    return (
      <ChooseProfileDialog
        open
        programId={programKey}
        applicationLabel={applicationLabel}
        initialProfileId={customerProfileId}
        onOpenChange={(open) => {
          if (!open) router.push("/dashboard");
        }}
        onConfirm={(chosen: ProfileSelection[]) => {
          const next = new URLSearchParams();
          if (programId) next.set("programId", programId);
          if (programCode) next.set("programCode", programCode);
          if (chosen.length === 0) next.set("withoutProfile", "1");
          else next.set("profiles", encodeProfileSelections(chosen));
          next.set("start", newStartToken());
          router.replace(`/loan-application/new?${next.toString()}`);
        }}
      />
    );
  }

  if (!canCreate) {
    return (
      <LoadingProgressDialog open title="Starting your application" message="Checking profiles…" />
    );
  }

  if (isError && !isFetching) {
    const apiError = parseApiError(error);
    return (
      <PageMessage>
        <ErrorState
          compact
          title="Unable to start application"
          message={apiError.message}
          onRetry={() => {
            void refetch();
          }}
        />
      </PageMessage>
    );
  }

  return (
    <LoadingProgressDialog
      open
      title="Starting your application"
      message="Creating your application…"
    />
  );
}

function humanizeProgramCode(code: string | null): string | undefined {
  if (!code) return undefined;
  const label = code
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
  return label.length > 0 ? label : undefined;
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
    <AppLayout>
      <Suspense
        fallback={
          <LoadingProgressDialog
            open
            title="Starting your application"
            message="Checking profiles…"
          />
        }
      >
        <NewLoanApplicationContent />
      </Suspense>
    </AppLayout>
  );
}
