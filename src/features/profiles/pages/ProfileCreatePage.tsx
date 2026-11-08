"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "@/lib/api-error";
import { profileService } from "@/services/profile.service";
import { ApplicationFormSummary } from "@/features/loan-application/ReviewScreen";
import { LoadingProgressDialog } from "@/features/loan-application/LoadingProgressDialog";
import { useProfileForm, useProfilePrograms } from "../api/queries";
import { newProfileHref, profileTypeForProgram, profileTypeFromQuery } from "../constants";
import { ProfileForm } from "../components/ProfileForm";
import { profileTypeLabel } from "../utils/display";
import { profileReviewFormData } from "../utils/profile-data";
import { safeInternalPath, withProfileReturn } from "../utils/return-path";
import type { ApiError } from "@/types";
import type { Program } from "@/services/program.service";

function CreateSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">Loading form</p>
      <div className="h-10 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

/** Route-level Suspense fallback, matching the loaded page's shell. */
export function ProfileCreateFallback() {
  return (
    <PageShell width="detail">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <CreateSkeleton />
    </PageShell>
  );
}

const backLinkClass =
  "inline-flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const typeCardClass =
  "rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]";

export function ProfileCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProgramType = searchParams?.get("programType")?.trim() ?? "";
  const queryType = profileTypeFromQuery(searchParams?.get("type") ?? null);
  const returnTo = safeInternalPath(searchParams?.get("returnTo") ?? null);
  const requestedProgramId =
    queryProgramType || queryType ? searchParams?.get("programId")?.trim() ?? "" : "";
  const profilePrograms = useProfilePrograms();
  const listedProgram = requestedProgramId
    ? profilePrograms.data?.find(
        (item) => item.id === requestedProgramId || item.programCode === requestedProgramId
      )
    : undefined;
  const program: Program | undefined =
    listedProgram ??
    (requestedProgramId
      ? {
          id: requestedProgramId,
          programCode: requestedProgramId,
          name: queryProgramType || "Profile",
          programType: queryProgramType || undefined,
          programCategory: "PROFILE",
          status: "PUBLISHED",
        }
      : undefined);
  const programUnavailable = false;
  const queryProgramProfileType =
    queryProgramType.toUpperCase().includes("BUSINESS") ? "BUSINESS" : queryProgramType ? "INDIVIDUAL" : null;
  const type = queryType ?? (program ? profileTypeForProgram(program) : queryProgramProfileType);
  // Without a programId in the URL, fall back to the listed program of the same type.
  const formProgram =
    program ?? profilePrograms.data?.find((item) => type !== null && profileTypeForProgram(item) === type);
  const [draft, setDraft] = useState<{ id: string; currentVersionNo: number } | null>(null);
  const [draftPending, setDraftPending] = useState(false);
  const [draftError, setDraftError] = useState<ApiError | null>(null);
  const [draftAttempt, setDraftAttempt] = useState(0);
  // The forms come from the draft's program version (program_versions), latest published.
  const formsQuery = useProfileForm(draft?.id ?? "", null);
  const startedDraftFor = useRef("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const versionRef = useRef(0);
  // Save & complete opens the review step with this data; nothing is sent until Submit.
  const [reviewInput, setReviewInput] = useState<{
    data: Record<string, unknown>;
    changeNote?: string;
  } | null>(null);
  const [progress, setProgress] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (draft) versionRef.current = draft.currentVersionNo;
  }, [draft]);

  // Draft creation runs as a plain request rather than a React Query mutation:
  // the mutation's completion never reached this component, which left the
  // skeleton on screen indefinitely.
  useEffect(() => {
    if (!formProgram?.id || startedDraftFor.current === formProgram.id || draft) return;
    startedDraftFor.current = formProgram.id;
    setDraftPending(true);
    setDraftError(null);
    profileService
      .createDraft(formProgram.id)
      .then((created) => setDraft(created))
      .catch((error) => {
        const apiError = parseApiError(error);
        setDraftError(apiError);
        toast.error(apiError.message);
      })
      .finally(() => setDraftPending(false));
  }, [draft, draftAttempt, formProgram?.id]);

  if (!type) {
    const programs = profilePrograms.data ?? [];
    return (
      <PageShell width="narrow">
        <Link href={returnTo ?? "/profiles"} className={backLinkClass}>
          <ArrowLeft className="h-4 w-4" />
          Profiles
        </Link>
        <PageHeader title="New profile" description="Choose who this profile is for." />
        {profilePrograms.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2" aria-busy="true">
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : profilePrograms.isError ? (
          <ErrorState
            compact
            title="Unable to load profile types"
            message={parseApiError(profilePrograms.error).message}
            status={parseApiError(profilePrograms.error).status}
            onRetry={() => {
              void profilePrograms.refetch();
            }}
          />
        ) : programs.length === 0 ? (
          <p className="text-sm font-normal text-muted-foreground">
            No profile types are available right now.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {programs.map((program) => {
              const Icon = profileTypeForProgram(program) === "BUSINESS" ? Building2 : UserRound;
              return (
                <Link key={program.id} href={newProfileHref(program, returnTo)} className={typeCardClass}>
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-semibold tracking-tight text-foreground">
                    {program.displayName || program.name}
                  </p>
                  {program.description && (
                    <p className="mt-1 text-sm font-normal text-muted-foreground">{program.description}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </PageShell>
    );
  }

  const saveVersion = async (input: { data: Record<string, unknown>; changeNote?: string }) => {
    if (!draft) throw { message: "The profile draft is not ready yet.", status: 409 };
    const saved = await profileService.update(draft.id, {
      data: input.data,
      expectedVersionNo: versionRef.current,
      changeNote: input.changeNote,
    });
    versionRef.current = saved.currentVersionNo;
    await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    return saved;
  };

  const reportSaveError = (error: unknown) => {
    const apiError = parseApiError(error);
    toast.error(
      apiError.status === 409
        ? "This profile changed elsewhere. Please reload and try again."
        : apiError.message
    );
  };

  const openSavedProfile = (saved: { id: string; currentVersionNo: number }) => {
    router.push(
      returnTo
        ? withProfileReturn(returnTo, saved.id, saved.currentVersionNo)
        : `/profiles/view?profileId=${encodeURIComponent(saved.id)}`
    );
  };

  const saveDraftAndOpen = async (input: { data: Record<string, unknown>; changeNote?: string }) => {
    if (saving) return;
    setSaving(true);
    setProgress({ title: "Saving your profile", message: "Please wait while we save your changes." });
    try {
      const saved = await saveVersion(input);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      openSavedProfile(saved);
    } catch (error) {
      setProgress(null);
      setSaving(false);
      reportSaveError(error);
    }
  };

  const submitProfile = async () => {
    if (!draft || !reviewInput || saving) return;
    setSaving(true);
    setProgress({ title: "Creating your profile", message: "Please wait while we complete your profile." });
    try {
      const saved = await saveVersion(reviewInput);
      const completed = await profileService.complete(draft.id, saved.currentVersionNo);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile created");
      openSavedProfile(completed);
    } catch (error) {
      setProgress(null);
      setSaving(false);
      reportSaveError(error);
    }
  };

  const reviewFormData = reviewInput
    ? profileReviewFormData(formsQuery.data ?? [], reviewInput.data)
    : {};

  return (
    <PageShell width="form">
      <Link href={returnTo ?? "/profiles"} className={backLinkClass}>
        <ArrowLeft className="h-4 w-4" />
        Profiles
      </Link>
      <PageHeader
        title={program ? `New ${program.displayName || program.name}` : `New ${profileTypeLabel(type).toLowerCase()} profile`}
        description={
          program?.description ?? "Each form in this profile opens in its own tab."
        }
      />

      {formsQuery.isLoading || draftPending ? (
        <CreateSkeleton />
      ) : null}

      {draftError ? (
        <ErrorState
          compact
          title="Unable to start this profile"
          message={draftError.message}
          status={draftError.status}
          onRetry={() => {
            startedDraftFor.current = "";
            setDraftAttempt((attempt) => attempt + 1);
          }}
        />
      ) : null}

      {requestedProgramId && profilePrograms.isError ? (
        <ErrorState
          compact
          title="Unable to load profile types"
          message={parseApiError(profilePrograms.error).message}
          status={parseApiError(profilePrograms.error).status}
          onRetry={() => {
            void profilePrograms.refetch();
          }}
        />
      ) : null}

      {programUnavailable ? (
        <p role="alert" className="text-sm font-normal text-muted-foreground">
          This profile type isn&apos;t available.{" "}
          <Link
            href={returnTo ? `/profiles/new?returnTo=${encodeURIComponent(returnTo)}` : "/profiles/new"}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Choose another
          </Link>
        </p>
      ) : null}

      {formsQuery.isError ? (
        <ErrorState
          compact
          title="Unable to load the form"
          message={parseApiError(formsQuery.error).message}
          status={parseApiError(formsQuery.error).status}
          onRetry={() => {
            void formsQuery.refetch();
          }}
        />
      ) : null}

      {formsQuery.data && draft ? (
        // Kept mounted while reviewing so the typed values are still there when the user goes back.
        <div hidden={reviewInput !== null}>
          <ProfileForm
            templates={formsQuery.data}
            submitLabel="Save & complete"
            draftLabel="Save draft"
            pending={saving}
            onCancel={() => router.push(returnTo ?? "/profiles")}
            onSaveDraft={(input) => {
              void saveDraftAndOpen(input);
            }}
            onSubmit={(input) => {
              if (saving) return;
              setReviewInput(input);
            }}
          />
        </div>
      ) : null}

      {reviewInput && formsQuery.data ? (
        <section className="flex flex-col gap-5" aria-label="Review profile">
          <div>
            <h2 className="text-2xl font-semibold leading-8 tracking-tight text-foreground">
              Review your profile
            </h2>
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
              Check the details below. Go back to make changes, or submit to finish.
            </p>
          </div>

          <ApplicationFormSummary templates={formsQuery.data} formData={reviewFormData} mode="review" />

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm leading-5 text-foreground">
              <b className="font-semibold">Heads up:</b> once you submit, this profile is locked and you
              won&apos;t be able to edit it. If you need to change anything later, create a new copy of this
              profile and make the changes in that copy. This profile will stay exactly as you submitted it.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => setReviewInput(null)}
              >
                <ArrowLeft />
                Back to edit
              </Button>
              <Button type="button" size="sm" loading={saving} disabled={saving} onClick={() => void submitProfile()}>
                Submit
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {progress ? (
        <LoadingProgressDialog open title={progress.title} message={progress.message} />
      ) : null}
    </PageShell>
  );
}
