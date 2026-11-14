"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { listDocuments } from "@/features/documents/api/documentsApi";
import { parseApiError } from "@/lib/api-error";
import { applicationService } from "@/services/application.service";
import {
  useCompleteProfile,
  useProfile,
  useProfileForm,
  useProfileVersions,
  useUpdateProfile,
} from "../api/queries";
import { useProfileRouteId } from "@/features/documents/hooks/usePathSegment";
import { OverflowTabList, type OverflowTabItem } from "../components/OverflowTabList";
import { ProfileForm } from "../components/ProfileForm";
import { ProfileMemoDialog } from "../components/ProfileMemoDialog";
import { ProfileVersionsTab } from "../components/ProfileVersionsTab";
import { VersionConflictDialog } from "../components/VersionConflictDialog";
import { ProfileAvatar } from "../components/ProfileBadges";
import { SHOW_PROFILE_VERSIONS } from "../constants";
import { profileReviewFormData } from "../utils/profile-data";
import { ApplicationFormSummary } from "@/features/loan-application/ReviewScreen";
import { formatProfileWhen, profileStatusLabel, profileTypeLabel, showIdentifier } from "../utils/display";

export function ProfileDetailSkeleton() {
  return (
    <PageShell width="detail" className="pb-20 sm:pb-20">
      <div className="flex flex-col gap-6" aria-busy="true">
        <p className="sr-only">Loading profile</p>
        <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-44 animate-pulse rounded-2xl bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    </PageShell>
  );
}

function ProfileNotFound({ description }: { description?: string }) {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="We couldn't find this profile"
        description={description}
        actions={
          <Button asChild size="sm">
            <Link href="/profiles">Back to profiles</Link>
          </Button>
        }
      />
    </PageShell>
  );
}

export function ProfileDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const route = useProfileRouteId();
  const id = route.value ?? "";
  const profileQuery = useProfile(id);
  const profile = profileQuery.data;
  // Only drafts can be edited; once a profile is complete the edit route shows the read-only view.
  const editing = searchParams?.get("edit") === "1" && profile?.status === "DRAFT";
  // Viewing renders the snapshot with the program version it was saved against; editing
  // uses the latest published version so new fields appear.
  const templateQuery = useProfileForm(
    id,
    editing ? null : (profile?.currentVersionNo ?? null),
    editing || profile !== undefined
  );
  const updateProfile = useUpdateProfile(id);
  const completeProfile = useCompleteProfile(id);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
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
    return <ProfileDetailSkeleton />;
  }

  if (!id) {
    return <ProfileNotFound />;
  }

  if (profileQuery.isError) {
    const apiError = parseApiError(profileQuery.error);
    if (apiError.status === 404) {
      return <ProfileNotFound description="It may have been removed." />;
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
    return <ProfileNotFound />;
  }

  const name = profile.displayName || "Untitled profile";
  const updated = formatProfileWhen(profile.updatedAt);
  const updatedBy = profile.updatedBy || "Unknown";
  const templates = templateQuery.data ?? [];
  const formTab = templates.some((item) => item.code === tab) ? tab : (templates[0]?.code ?? "");
  const selectedTab = editing ? formTab : tab || "details";
  const sections = templates.flatMap((item) => item.sections);
  const canEdit = profile.status === "DRAFT";
  const viewData = profileReviewFormData(templates, profile.data);
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

  // Editing mirrors the create form: Save draft keeps the profile DRAFT, Save & complete also
  // marks it COMPLETE. Only DRAFT and COMPLETE profiles can be edited, so both show the completion.
  const saveChanges = (input: { data: Record<string, unknown>; changeNote?: string }) =>
    updateProfile.mutateAsync({
      data: input.data,
      changeNote: input.changeNote,
      expectedVersionNo: profile.currentVersionNo,
    });

  const handleSaveError = (error: unknown) => {
    const apiError = parseApiError(error);
    if (apiError.status === 409) {
      setConflictOpen(true);
      return;
    }
    toast.error(apiError.message);
  };

  const saveDraft = async (input: { data: Record<string, unknown>; changeNote?: string }) => {
    try {
      await saveChanges(input);
      toast.success("Draft saved");
    } catch (error) {
      handleSaveError(error);
    }
  };

  const saveAndComplete = async (input: { data: Record<string, unknown>; changeNote?: string }) => {
    try {
      const saved = await saveChanges(input);
      await completeProfile.mutateAsync(saved.currentVersionNo);
      toast.success("Profile completed");
      router.push(`/profiles/view?profileId=${encodeURIComponent(profile.id)}`);
    } catch (error) {
      handleSaveError(error);
    }
  };

  return (
    <PageShell width="detail" className={editing ? "gap-6 pb-28 sm:pb-28" : "gap-6 pb-20 sm:pb-20"}>
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
            {editing ? (
              <Button
                type="button"
                size="sm"
                disabled
                className="border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : canEdit ? (
              <Button
                asChild
                size="sm"
                className="border-transparent bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link href={`/profiles/view?profileId=${encodeURIComponent(profile.id)}&edit=1`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="relative z-[1] flex flex-col gap-3 rounded-lg bg-card p-4 text-foreground shadow-[var(--shadow-3)]">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileAvatar name={name} size="lg" className="shrink-0" />
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
      {templates.length > 0 && editing ? (
        <Tabs value={selectedTab} onValueChange={setTab} className="flex flex-col gap-4">
          <OverflowTabList
            ariaLabel="Profile sections"
            activeValue={selectedTab}
            tabs={templates.map((item) => ({ value: item.code, label: item.title }))}
          />
          <div className="flex flex-col gap-4">
            <ProfileForm
              saveBar
              key={`${profile.currentVersionNo}-${formEpoch}`}
              templates={templates}
              data={profile.data}
              activeCode={formTab}
              onActiveCodeChange={setTab}
              submitLabel="Save & complete"
              draftLabel="Save draft"
              pending={updateProfile.isPending || completeProfile.isPending}
              onCancel={() =>
                router.push(`/profiles/view?profileId=${encodeURIComponent(profile.id)}`)
              }
              onSaveDraft={saveDraft}
              onSubmit={saveAndComplete}
            />
          </div>
        </Tabs>
      ) : null}

      {templates.length > 0 && !editing && SHOW_PROFILE_VERSIONS ? (
        <Tabs value={selectedTab} onValueChange={setTab} className="flex flex-col gap-4">
          <OverflowTabList
            ariaLabel="Profile sections"
            activeValue={selectedTab}
            tabs={[
              { value: "details", label: "Details" },
              { value: "versions", label: "Versions", count: versionCount },
            ] satisfies OverflowTabItem[]}
          />
          <TabsContent value="details" className="pt-0">
            <ApplicationFormSummary templates={templates} formData={viewData} mode="review" />
          </TabsContent>
          <TabsContent value="versions" className="flex flex-col gap-4 pt-0">
            <ProfileVersionsTab profile={profile} />
          </TabsContent>
        </Tabs>
      ) : null}

      {templates.length > 0 && !editing && !SHOW_PROFILE_VERSIONS ? (
        <ApplicationFormSummary templates={templates} formData={viewData} mode="review" />
      ) : null}

      <VersionConflictDialog
        open={conflictOpen}
        pending={reloading}
        onOpenChange={setConflictOpen}
        onReload={() => {
          void reloadLatest();
        }}
      />
      <ProfileMemoDialog
        open={memoOpen}
        profile={profile}
        sections={sections}
        onOpenChange={setMemoOpen}
      />
    </PageShell>
  );
}
