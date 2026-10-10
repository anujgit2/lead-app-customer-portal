"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
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

function typeHref(href: string, returnTo: string | null): string {
  if (!returnTo) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("returnTo", returnTo);
  return `${path}?${params.toString()}`;
}

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
      <div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
        <Link
          href={returnTo ?? "/profiles"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Profiles
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New profile</h1>
          <p className="mt-1 text-sm font-normal text-slate-500">Choose who this profile is for.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href={typeHref("/profiles/new?type=individual", returnTo)}
            className="rounded-xl border border-slate-100 bg-card p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
          >
            <UserRound className="h-5 w-5 text-primary" />
            <p className="mt-4 font-semibold tracking-tight text-slate-900">Individual</p>
            <p className="mt-1 text-sm font-normal text-slate-500">A person.</p>
          </Link>
          <Link
            href={typeHref("/profiles/new?type=business", returnTo)}
            className="rounded-xl border border-slate-100 bg-card p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
          >
            <Building2 className="h-5 w-5 text-primary" />
            <p className="mt-4 font-semibold tracking-tight text-slate-900">Business</p>
            <p className="mt-1 text-sm font-normal text-slate-500">A company or firm.</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
        <Link
          href={returnTo ?? "/profiles"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
        <ArrowLeft className="h-4 w-4" />
        Profiles
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          New {profileTypeLabel(type).toLowerCase()} profile
        </h1>
        <p className="mt-1 text-sm font-normal text-slate-500">
          Fields come from the {templateCode} form template.
        </p>
      </div>

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
          template={templateQuery.data}
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
    </div>
  );
}
