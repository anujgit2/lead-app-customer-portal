"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { useQueryClient } from "@tanstack/react-query";
import { parseApiError } from "@/lib/api-error";
import { profileService } from "@/services/profile.service";
import { useProfileForm, useProfilePrograms } from "../api/queries";
import { newProfileHref, profileTypeForProgram, profileTypeFromQuery } from "../constants";
import { ProfileForm } from "../components/ProfileForm";
import { profileTypeLabel } from "../utils/display";
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

  return (
    <PageShell width="detail">
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
        <ProfileForm
          templates={formsQuery.data}
          submitLabel="Save & complete"
          draftLabel="Save draft"
          pending={saving}
          onCancel={() => router.push(returnTo ?? "/profiles")}
          onSaveDraft={(input) => {
            if (saving) return;
            setSaving(true);
            void (async () => {
              try {
                await saveVersion(input);
                toast.success("Draft saved");
              } catch (error) {
                reportSaveError(error);
              } finally {
                setSaving(false);
              }
            })();
          }}
          onSubmit={(input) => {
            if (saving) return;
            setSaving(true);
            void (async () => {
              try {
                const saved = await saveVersion(input);
                const completed = await profileService.complete(draft.id, saved.currentVersionNo);
                await queryClient.invalidateQueries({ queryKey: ["profiles"] });
                toast.success("Profile created");
                router.push(
                  returnTo
                    ? withProfileReturn(returnTo, completed.id, completed.currentVersionNo)
                    : `/profiles/view?profileId=${encodeURIComponent(completed.id)}`
                );
              } catch (error) {
                reportSaveError(error);
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      ) : null}
    </PageShell>
  );
}
