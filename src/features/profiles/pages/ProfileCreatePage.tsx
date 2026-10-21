"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { parseApiError } from "@/lib/api-error";
import {
  useCreateProfile,
  useFormTemplate,
  useProfilePrograms,
  useProgramFormTemplate,
} from "../api/queries";
import {
  newProfileHref,
  profileTypeForProgram,
  profileTypeFromQuery,
  templateCodeForType,
} from "../constants";
import { ProfileForm } from "../components/ProfileForm";
import { profileTypeLabel } from "../utils/display";
import { safeInternalPath, withProfileReturn } from "../utils/return-path";

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
  const queryType = profileTypeFromQuery(searchParams?.get("type") ?? null);
  const returnTo = safeInternalPath(searchParams?.get("returnTo") ?? null);
  const requestedProgramId = queryType ? searchParams?.get("programId")?.trim() ?? "" : "";
  const profilePrograms = useProfilePrograms();
  const program = requestedProgramId
    ? profilePrograms.data?.find(
        (item) => item.id === requestedProgramId || item.programCode === requestedProgramId
      )
    : undefined;
  const programUnavailable = !!requestedProgramId && profilePrograms.isSuccess && !program;
  const type = program ? profileTypeForProgram(program) : queryType;
  const templateCode = queryType && !requestedProgramId ? templateCodeForType(queryType) : "";
  const programTemplateQuery = useProgramFormTemplate(program?.id ?? "");
  const legacyTemplateQuery = useFormTemplate(templateCode);
  const templateQuery = requestedProgramId ? programTemplateQuery : legacyTemplateQuery;
  const createProfile = useCreateProfile();

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

  return (
    <PageShell width="detail">
      <Link href={returnTo ?? "/profiles"} className={backLinkClass}>
        <ArrowLeft className="h-4 w-4" />
        Profiles
      </Link>
      <PageHeader
        title={program ? `New ${program.displayName || program.name}` : `New ${profileTypeLabel(type).toLowerCase()} profile`}
        description={
          program?.description ?? `Each form in the ${templateCode || "selected"} template opens in its own tab.`
        }
      />

      {templateQuery.isLoading || (requestedProgramId && profilePrograms.isLoading) ? (
        <CreateSkeleton />
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

      {templateQuery.isError ? (
        <ErrorState
          compact
          title="Unable to load the form"
          message={parseApiError(templateQuery.error).message}
          status={parseApiError(templateQuery.error).status}
          onRetry={() => {
            void templateQuery.refetch();
          }}
        />
      ) : null}

      {templateQuery.data ? (
        <ProfileForm
          templates={templateQuery.data}
          submitLabel="Save profile"
          pending={createProfile.isPending}
          onCancel={() => router.push(returnTo ?? "/profiles")}
          onSubmit={(input) => {
            createProfile.mutate(
              { type, programId: program?.id, data: input.data, changeNote: input.changeNote },
              {
                onSuccess: (created) => {
                  toast.success("Profile created");
                  router.push(
                    returnTo
                      ? withProfileReturn(returnTo, created.id, created.currentVersionNo)
                      : `/profiles/${created.id}`
                  );
                },
                onError: (error) => {
                  toast.error(parseApiError(error).message);
                },
              }
            );
          }}
        />
      ) : null}
    </PageShell>
  );
}
