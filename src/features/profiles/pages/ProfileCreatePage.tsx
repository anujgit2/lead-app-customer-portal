"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { parseApiError } from "@/lib/api-error";
import { useCreateProfile, useFormTemplate } from "../api/queries";
import { profileTypeFromQuery, templateCodeForType } from "../constants";
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

function typeHref(href: string, returnTo: string | null): string {
  if (!returnTo) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("returnTo", returnTo);
  return `${path}?${params.toString()}`;
}

const backLinkClass =
  "inline-flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const typeCardClass =
  "rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]";

export function ProfileCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = profileTypeFromQuery(searchParams?.get("type") ?? null);
  const returnTo = safeInternalPath(searchParams?.get("returnTo") ?? null);
  const templateCode = type ? templateCodeForType(type) : "";
  const templateQuery = useFormTemplate(templateCode);
  const createProfile = useCreateProfile();

  if (!type) {
    return (
      <PageShell width="narrow">
        <Link href={returnTo ?? "/profiles"} className={backLinkClass}>
          <ArrowLeft className="h-4 w-4" />
          Profiles
        </Link>
        <PageHeader title="New profile" description="Choose who this profile is for." />
        <div className="grid gap-6 sm:grid-cols-2">
          <Link href={typeHref("/profiles/new?type=individual", returnTo)} className={typeCardClass}>
            <UserRound className="h-5 w-5 text-primary" />
            <p className="mt-4 font-semibold tracking-tight text-foreground">Individual</p>
            <p className="mt-1 text-sm font-normal text-muted-foreground">A person.</p>
          </Link>
          <Link href={typeHref("/profiles/new?type=business", returnTo)} className={typeCardClass}>
            <Building2 className="h-5 w-5 text-primary" />
            <p className="mt-4 font-semibold tracking-tight text-foreground">Business</p>
            <p className="mt-1 text-sm font-normal text-muted-foreground">A company or firm.</p>
          </Link>
        </div>
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
        title={`New ${profileTypeLabel(type).toLowerCase()} profile`}
        description={`Each form in the ${templateCode} template opens in its own tab.`}
      />

      {templateQuery.isLoading ? <CreateSkeleton /> : null}

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
              { type, data: input.data, changeNote: input.changeNote },
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
