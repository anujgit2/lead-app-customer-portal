"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Archive, ChevronRight, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { listDocuments } from "@/features/documents/api/documentsApi";
import { parseApiError } from "@/lib/api-error";
import { applicationService } from "@/services/application.service";
import { useArchiveProfile, useFormTemplate, useProfile, useProfileVersions, useUpdateProfile } from "../api/queries";
import { useProfileRouteId } from "@/features/documents/hooks/usePathSegment";
import { ArchiveProfileDialog } from "../components/ArchiveProfileDialog";
import { ProfileApplicationsTab } from "../components/ProfileApplicationsTab";
import { ProfileDocumentsTab } from "../components/ProfileDocumentsTab";
import { OverflowTabList, type OverflowTabItem } from "../components/OverflowTabList";
import { ProfileForm } from "../components/ProfileForm";
import { ProfileLinksTab } from "../components/ProfileLinksTab";
import { ProfileMemoDialog } from "../components/ProfileMemoDialog";
import { ProfileOverview } from "../components/ProfileOverview";
import { ProfileVersionsTab } from "../components/ProfileVersionsTab";
import { VersionConflictDialog } from "../components/VersionConflictDialog";
import { formatProfileWhen, profileInitials, profileStatusLabel, profileTypeLabel, showIdentifier } from "../utils/display";

function DetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 pb-20 pt-6 sm:px-8" aria-busy="true">
      <p className="sr-only">Loading profile</p>
      <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
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
  const templateQuery = useFormTemplate(profile?.templateCode ?? "", profile?.templateVersion);
  const updateProfile = useUpdateProfile(id);
  const archiveProfile = useArchiveProfile(id);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [tab, setTab] = useState("");
  const [formEpoch, setFormEpoch] = useState(0);
  const documentsQuery = useQuery({
    queryKey: ["documents", { profileId: id }],
    queryFn: () => listDocuments({ profileId: id }),
    enabled: id.length > 0,
  });
  const applicationsQuery = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
    enabled: id.length > 0,
  });
  const versionsQuery = useProfileVersions(id);

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
        <Button asChild className="h-8" size="sm">
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
          <Button asChild className="h-8" size="sm">
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
        <Button asChild className="h-8" size="sm">
          <Link href="/profiles">Back to profiles</Link>
        </Button>
      </div>
    );
  }

  const name = profile.displayName || "Untitled profile";
  const updated = formatProfileWhen(profile.updatedAt);
  const updatedBy = profile.updatedBy || "Unknown";
  const templates = templateQuery.data ?? [];
  const formTab = templates.some((item) => item.code === tab) ? tab : (templates[0]?.code ?? "");
  const selectedTab = editing ? formTab : tab || formTab;
  const sections = templates.flatMap((item) => item.sections);
  const archived = profile.status === "ARCHIVED";
  const pan = profile.identifiers.pan;
  const gstin = profile.identifiers.gstin;
  const identifierLabel = pan ? "PAN" : gstin ? "GSTIN" : "PAN";
  const identifierValue = showIdentifier(pan || gstin);
  const documentCount = documentsQuery.data?.length ?? 0;
  const applicationCount = (applicationsQuery.data ?? []).filter(
    (item) => item.customerProfileId === profile.id
  ).length;
  const versionCount = versionsQuery.data?.length ?? 0;
  const onHero =
    "border-primary-foreground/55 bg-transparent text-primary-foreground hover:bg-primary-foreground/10";

  return (
    <div className={editing ? "mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 pb-28 pt-6 sm:px-8" : "mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 pb-20 pt-6 sm:px-8"}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/profiles" className="rounded-sm hover:text-foreground hover:underline">
          Profiles
        </Link>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
        <span aria-current="page" className="font-medium text-foreground">
          {name}
        </span>
      </nav>

      <section
        aria-labelledby="profile-name"
        className="relative grid items-center gap-5 overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[90px] -right-[60px] h-[200px] w-[200px] rounded-full border-[32px] border-primary-foreground/[0.07]"
        />
        <div className="relative z-[1]">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex h-[22px] items-center rounded-full bg-primary-foreground/15 px-2 text-xs font-semibold">
              {profileTypeLabel(profile.type)}
            </span>
            <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {profileStatusLabel(profile.status)}
            </span>
            <span className="inline-flex h-[22px] items-center rounded-full bg-primary-foreground/15 px-2 text-xs font-semibold">
              Version {profile.currentVersionNo}
            </span>
          </div>
          <h1 id="profile-name" className="text-[22px] font-semibold leading-7 tracking-[-0.02em] sm:text-[26px] sm:leading-8">
            {name}
          </h1>
          <p className="mt-1 text-sm leading-5 text-primary-foreground/90">
            Last updated by <span className="font-mono text-xs">{updatedBy}</span> on {updated}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className={onHero} onClick={() => setMemoOpen(true)}>
              <Download className="h-4 w-4" />
              Download memo
            </Button>
            {archived || editing ? (
              <Button
                type="button"
                size="sm"
                disabled
                className="border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href={`/profiles/${profile.id}?edit=1`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            {archived ? null : (
              <Button type="button" variant="outline" size="sm" className={onHero} onClick={() => setArchiveOpen(true)}>
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
        </div>
        <div className="relative z-[1] flex flex-col gap-3 rounded-lg bg-card p-4 text-foreground shadow-[var(--shadow-3)]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground">
              {profileInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-4 text-muted-foreground">{identifierLabel}</p>
              <p className="truncate font-mono text-sm font-semibold tracking-wide">{identifierValue}</p>
            </div>
          </div>
          <div className="flex justify-between gap-5 border-t border-border pt-3 text-[13px] text-muted-foreground">
            <div className="min-w-0">
              <span>Version</span>
              <b className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">
                v{profile.currentVersionNo}
              </b>
            </div>
            <div className="min-w-0">
              <span>Documents</span>
              <b className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">{documentCount}</b>
            </div>
            <div className="min-w-0">
              <span>Applications</span>
              <b className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">{applicationCount}</b>
            </div>
          </div>
        </div>
      </section>

      {templateQuery.isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" aria-busy="true">
          <p className="sr-only">Loading profile</p>
        </div>
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
      {templates.length > 0 ? (
      <Tabs value={selectedTab} onValueChange={setTab} className="flex flex-col gap-4">
        <OverflowTabList
          ariaLabel="Profile sections"
          activeValue={selectedTab}
          tabs={[
            ...templates.map((item) => ({ value: item.code, label: item.title })),
            ...(editing || profile.type !== "BUSINESS"
              ? []
              : [{ value: "people", label: "People", count: profile.links.length }]),
            ...(editing
              ? []
              : ([
                  { value: "documents", label: "Documents", count: documentCount },
                  { value: "applications", label: "Applications", count: applicationCount },
                  { value: "versions", label: "Versions", count: versionCount },
                ] satisfies OverflowTabItem[])),
          ]}
        />
        {editing ? (
          <div className="flex flex-col gap-4">
            <ProfileForm
              saveBar
              key={`${profile.currentVersionNo}-${formEpoch}`}
              templates={templates}
              data={profile.data}
              activeCode={formTab}
              onActiveCodeChange={setTab}
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
        ) : (
          templates.map((item) => (
            <TabsContent key={item.code} value={item.code} className="pt-0">
              <ProfileOverview template={item} data={profile.data} />
            </TabsContent>
          ))
        )}
        {editing ? null : (
          <>
            {profile.type === "BUSINESS" ? (
              <TabsContent value="people" className="pt-0">
                <ProfileLinksTab profile={profile} />
              </TabsContent>
            ) : null}
            <TabsContent value="documents" className="flex flex-col gap-4 pt-0">
              <ProfileDocumentsTab profile={profile} />
            </TabsContent>
            <TabsContent value="applications" className="pt-0">
              <ProfileApplicationsTab profile={profile} />
            </TabsContent>
            <TabsContent value="versions" className="flex flex-col gap-4 pt-0">
              <ProfileVersionsTab profile={profile} />
            </TabsContent>
          </>
        )}
      </Tabs>
      ) : null}

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
        sections={sections}
        onOpenChange={setMemoOpen}
      />
    </div>
  );
}
