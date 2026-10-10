"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseApiError } from "@/lib/api-error";
import { useArchiveProfile, useFormTemplate, useProfile, useUpdateProfile } from "../api/queries";
import { useProfileRouteId } from "@/features/documents/hooks/usePathSegment";
import { ArchiveProfileDialog } from "../components/ArchiveProfileDialog";
import { ProfileApplicationsTab } from "../components/ProfileApplicationsTab";
import { ProfileDocumentsTab } from "../components/ProfileDocumentsTab";
import { ProfileForm } from "../components/ProfileForm";
import { ProfileLinksTab } from "../components/ProfileLinksTab";
import { ProfileMemoDialog } from "../components/ProfileMemoDialog";
import { ProfileOverview } from "../components/ProfileOverview";
import { ProfileVersionsTab } from "../components/ProfileVersionsTab";
import { VersionConflictDialog } from "../components/VersionConflictDialog";
import { formatProfileWhen, profileStatusLabel, profileTypeLabel } from "../utils/display";

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 sm:p-8" aria-busy="true">
      <p className="sr-only">Loading profile</p>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function ProfileDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const route = useProfileRouteId();
  const id = route.value ?? "";
  const editing = searchParams?.get("edit") === "1";
  const profileQuery = useProfile(id);
  const profile = profileQuery.data;
  const templateQuery = useFormTemplate(profile?.templateCode ?? "");
  const updateProfile = useUpdateProfile(id);
  const archiveProfile = useArchiveProfile(id);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [formEpoch, setFormEpoch] = useState(0);

  const reloadLatest = async () => {
    setReloading(true);
    const result = await profileQuery.refetch();
    setReloading(false);
    if (result.error) {
      toast.error(parseApiError(result.error).message);
      return;
    }
    setConflictOpen(false);
    setFormEpoch((current) => current + 1);
  };

  if (!route.ready || (id.length > 0 && profileQuery.isLoading)) {
    return <DetailSkeleton />;
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          We couldn&apos;t find this profile
        </h1>
        <Button asChild className="h-11">
          <Link href="/profiles">Back to profiles</Link>
        </Button>
      </div>
    );
  }

  if (profileQuery.isError) {
    const apiError = parseApiError(profileQuery.error);
    if (apiError.status === 404) {
      return (
        <div className="mx-auto max-w-xl space-y-4 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            We couldn&apos;t find this profile
          </h1>
          <p className="text-sm font-normal text-slate-500">It may have been removed.</p>
          <Button asChild className="h-11">
            <Link href="/profiles">Back to profiles</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <ErrorState
          compact
          title="Unable to load profile"
          message={apiError.message}
          status={apiError.status}
          code={
            apiError.status === 401
              ? "SESSION_EXPIRED"
              : apiError.status === 403
                ? "FORBIDDEN"
                : "UNKNOWN"
          }
          onRetry={() => {
            void profileQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          We couldn&apos;t find this profile
        </h1>
        <Button asChild className="h-11">
          <Link href="/profiles">Back to profiles</Link>
        </Button>
      </div>
    );
  }

  const updated = formatProfileWhen(profile.updatedAt);
  const updatedBy = profile.updatedBy || "Unknown";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
      <Link
        href="/profiles"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <ArrowLeft className="h-4 w-4" />
        Profiles
      </Link>

      <div className="flex flex-col gap-6 rounded-xl border border-slate-100 bg-card p-6 shadow-sm sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {profile.displayName || "Untitled profile"}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={profile.type === "BUSINESS" ? "info" : "secondary"}>
              {profileTypeLabel(profile.type)}
            </Badge>
            <Badge variant={profile.status === "ACTIVE" ? "success" : "draft"}>
              {profileStatusLabel(profile.status)}
            </Badge>
            <span className="text-sm text-muted-foreground">Version {profile.currentVersionNo}</span>
          </div>
          <p className="text-sm font-normal text-slate-500">
            Last updated by {updatedBy} on {updated}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 hover:-translate-y-0.5"
            onClick={() => setMemoOpen(true)}
          >
            Download memo
          </Button>
          {editing ? null : (
            <Button asChild className="h-11 hover:-translate-y-0.5">
              <Link href={`/profiles/${profile.id}?edit=1`}>Edit</Link>
            </Button>
          )}
          {profile.status === "ACTIVE" ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 hover:-translate-y-0.5"
              onClick={() => setArchiveOpen(true)}
            >
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={editing ? "overview" : tab} onValueChange={setTab}>
        <TabsList aria-label="Profile sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {editing || profile.type !== "BUSINESS" ? null : (
            <TabsTrigger value="people">People</TabsTrigger>
          )}
          {editing ? null : <TabsTrigger value="documents">Documents</TabsTrigger>}
          {editing ? null : <TabsTrigger value="applications">Applications</TabsTrigger>}
          {editing ? null : <TabsTrigger value="versions">Versions</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          {templateQuery.isLoading ? <DetailSkeleton /> : null}
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
          {templateQuery.data && editing ? (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Editing version {profile.currentVersionNo}. Saving sends this version so a newer
                save is not overwritten.
              </p>
              <ProfileForm
                key={`${profile.currentVersionNo}-${formEpoch}`}
                template={templateQuery.data}
                data={profile.data}
                submitLabel="Save changes"
                pending={updateProfile.isPending}
                onCancel={() => router.push(`/profiles/${profile.id}`)}
                onSubmit={(input) => {
                  updateProfile.mutate(
                    {
                      data: input.data,
                      changeNote: input.changeNote,
                      expectedVersionNo: profile.currentVersionNo,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Profile saved");
                        router.push(`/profiles/${profile.id}`);
                      },
                      onError: (error) => {
                        const apiError = parseApiError(error);
                        if (apiError.status === 409) {
                          setConflictOpen(true);
                          return;
                        }
                        toast.error(apiError.message);
                      },
                    }
                  );
                }}
              />
            </div>
          ) : null}
          {templateQuery.data && !editing ? (
            <ProfileOverview template={templateQuery.data} data={profile.data} />
          ) : null}
        </TabsContent>
        {editing ? null : (
          <>
            {profile.type === "BUSINESS" ? (
              <TabsContent value="people" className="mt-6">
                <ProfileLinksTab profile={profile} />
              </TabsContent>
            ) : null}
            <TabsContent value="documents" className="mt-6">
              <ProfileDocumentsTab profile={profile} />
            </TabsContent>
            <TabsContent value="applications" className="mt-6">
              <ProfileApplicationsTab profile={profile} />
            </TabsContent>
            <TabsContent value="versions" className="mt-6">
              <ProfileVersionsTab profile={profile} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <VersionConflictDialog
        open={conflictOpen}
        pending={reloading}
        onOpenChange={setConflictOpen}
        onReload={() => {
          void reloadLatest();
        }}
      />
      <ArchiveProfileDialog
        open={archiveOpen}
        name={profile.displayName}
        pending={archiveProfile.isPending}
        onOpenChange={setArchiveOpen}
        onConfirm={() => {
          archiveProfile.mutate(undefined, {
            onSuccess: () => {
              setArchiveOpen(false);
              toast.success("Profile archived");
            },
            onError: (error) => {
              toast.error(parseApiError(error).message);
            },
          });
        }}
      />
      <ProfileMemoDialog
        open={memoOpen}
        profile={profile}
        sections={templateQuery.data?.sections ?? []}
        onOpenChange={setMemoOpen}
      />
    </div>
  );
}
