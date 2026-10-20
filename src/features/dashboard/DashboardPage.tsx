"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Files,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageShell } from "@/components/PageShell";
import { ApplicationStatusBadge } from "@/features/applications/ApplicationStatusBadge";
import { getApplicationHref } from "@/features/applications/ApplicationsTable";
import { UploadDialog } from "@/features/documents/components/UploadDialog";
import { useDocuments } from "@/features/documents/api/queries";
import type { PortalDocument } from "@/features/documents/types";
import { useProfiles } from "@/features/profiles/api/queries";
import { NewProfileMenuItems } from "@/features/profiles/components/NewProfileMenuItems";
import { formatProfileDay, formatProfileTime, profileTypeLabel, showIdentifier } from "@/features/profiles/utils/display";
import { ApplyLoanMenu } from "@/features/loan-application/ApplyLoanMenu";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { applicationService } from "@/services/application.service";
import { useAuthStore } from "@/store/auth.store";
import type { ApplicationStatus, LoanApplication } from "@/types";

type ActivityKind = "app" | "prof" | "doc";
type ActivityFilter = "all" | ActivityKind;

const STEPS = ["Draft", "Submitted", "In review", "Approved"] as const;

const VERB: Record<ApplicationStatus, string> = {
  draft: "draft created",
  submitted: "submitted for review",
  under_review: "is in review",
  approved: "approved",
  rejected: "was rejected",
  disbursed: "was disbursed",
};

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "app", label: "Applications" },
  { key: "prof", label: "Profiles" },
  { key: "doc", label: "Documents" },
];

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: number;
  day: string;
  time: string;
  title: string;
  verb: string;
  meta: string;
  href: string;
  tone: string;
  icon: typeof FileText;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function updatedTime(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function applicationTitle(app: LoanApplication): string {
  return app.applicationNumber || "Draft";
}

function programLabel(app: LoanApplication): string {
  return app.programName || app.loanType || "—";
}

function stepIndex(status: ApplicationStatus): number {
  if (status === "draft") return 0;
  if (status === "submitted") return 1;
  if (status === "under_review" || status === "rejected") return 2;
  return 3;
}

function profileDisplayName(profile: { displayName?: string } | undefined): string {
  return profile?.displayName?.trim() || "Untitled profile";
}

function documentTitle(document: PortalDocument): string {
  return document.fileName?.trim() || document.typeName;
}

function documentProfileName(document: PortalDocument): string {
  const linked = document.linked ?? [];
  const primary = linked.find((item) => item.relation === "FOR") ?? linked[0];
  return primary ? profileDisplayName(primary) : "";
}

const railItemClass =
  "group flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function RailIcon({
  tone,
  icon: Icon,
}: {
  tone: string;
  icon: typeof FileText;
}) {
  return (
    <span className={cn("grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md", tone)}>
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

function RailCopy({ title, detail }: { title: string; detail: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13.5px] font-semibold leading-[18px]">{title}</span>
      <span className="block truncate text-[12.5px] leading-[17px] text-muted-foreground">{detail}</span>
    </span>
  );
}

function RailChevron() {
  return (
    <ChevronRight
      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
      aria-hidden
    />
  );
}

function HeroProgress({ status }: { status: ApplicationStatus }) {
  const current = stepIndex(status);
  const rejected = status === "rejected";
  const label = rejected ? "Rejected" : STEPS[current];
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label={`Progress: ${label}`}>
      {STEPS.map((step, index) => {
        const lastRejected = index === 3 && rejected;
        const reached = index <= current;
        const active = index === current;
        return (
          <div key={step}>
            <span
              className={cn(
                "block h-1 rounded-full bg-muted",
                reached && "bg-primary",
                lastRejected && "bg-danger"
              )}
            />
            <span
              className={cn(
                "mt-1.5 block text-[11.5px] leading-4 text-muted-foreground",
                active && "font-semibold text-foreground"
              )}
            >
              {lastRejected ? "Rejected" : step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-t border-border px-5 py-3 first:border-t-0">
          <span className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-md bg-muted" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const applicationsQuery = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getApplications(),
    retry: (failureCount, error) => {
      const status = parseApiError(error).status;
      return status !== 401 && status !== 403 && failureCount < 2;
    },
  });
  const profilesQuery = useProfiles({ page: 0, size: 100 });
  const individualQuery = useProfiles({ page: 0, size: 1, type: "INDIVIDUAL" });
  const businessQuery = useProfiles({ page: 0, size: 1, type: "BUSINESS" });
  const documentsQuery = useDocuments({});

  const applications = applicationsQuery.data;
  const documents = documentsQuery.data ?? [];
  const profiles = profilesQuery.data?.content ?? [];

  const summary = useMemo(() => {
    const list = applications ?? [];
    return {
      total: list.length,
      drafts: list.filter((app) => app.status === "draft").length,
      inReview: list.filter((app) => app.status === "submitted" || app.status === "under_review").length,
      approved: list.filter((app) => app.status === "approved").length,
    };
  }, [applications]);

  const latestApplication = useMemo(() => {
    return [...(applications ?? [])].sort(
      (left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt)
    )[0];
  }, [applications]);

  const events = useMemo<ActivityEvent[]>(() => {
    const applicationEvents: ActivityEvent[] = (applications ?? []).map((app) => ({
      id: `app-${app.id}`,
      kind: "app",
      at: updatedTime(app.updatedAt),
      day: formatProfileDay(app.updatedAt),
      time: formatProfileTime(app.updatedAt),
      title: applicationTitle(app),
      verb: VERB[app.status] ?? "updated",
      meta: programLabel(app),
      href: getApplicationHref(app),
      tone: "tone-brand",
      icon: FileText,
    }));
    const profileEvents: ActivityEvent[] = profiles.map((profile) => ({
      id: `prof-${profile.id}`,
      kind: "prof",
      at: updatedTime(profile.updatedAt),
      day: formatProfileDay(profile.updatedAt),
      time: formatProfileTime(profile.updatedAt),
      title: profile.displayName || "Untitled profile",
      verb: "profile updated",
      meta: `${profileTypeLabel(profile.type)} · ${showIdentifier(profile.identifiers.pan)}`,
      href: `/profiles/${profile.id}`,
      tone: "tone-info",
      icon: UserRound,
    }));
    const documentEvents: ActivityEvent[] = documents.map((document) => {
      const profileName = documentProfileName(document);
      return {
        id: `doc-${document.id}`,
        kind: "doc",
        at: updatedTime(document.updatedAt),
        day: formatProfileDay(document.updatedAt),
        time: formatProfileTime(document.updatedAt),
        title: documentTitle(document),
        verb: "uploaded",
        meta: profileName ? `${document.typeName} · ${profileName}` : document.typeName,
        href: `/documents/${document.id}`,
        tone: "tone-success",
        icon: Upload,
      };
    });
    return [...applicationEvents, ...profileEvents, ...documentEvents].sort((left, right) => right.at - left.at);
  }, [applications, documents, profiles]);

  if (applicationsQuery.isError) {
    const apiError = parseApiError(applicationsQuery.error);
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <ErrorState
          compact
          title="Unable to load dashboard"
          message={apiError.message}
          code={
            apiError.status === 401
              ? "SESSION_EXPIRED"
              : apiError.status === 403
                ? "FORBIDDEN"
                : "UNKNOWN"
          }
          status={apiError.status}
          onRetry={() => {
            void applicationsQuery.refetch();
          }}
        />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const appsLoading = applicationsQuery.isLoading && !applications;
  const profilesLoading = profilesQuery.isLoading && !profilesQuery.data;
  const documentsLoading = documentsQuery.isLoading && !documentsQuery.data;
  const feedLoading = (appsLoading || profilesLoading || documentsLoading) && events.length === 0;
  const visible = events.filter((event) => filter === "all" || event.kind === filter);
  const groups = visible.reduce<{ day: string; items: ActivityEvent[] }[]>((list, event) => {
    const last = list[list.length - 1];
    if (!last || last.day !== event.day) list.push({ day: event.day, items: [event] });
    else last.items.push(event);
    return list;
  }, []);

  const individualCount = individualQuery.data?.totalElements;
  const businessCount = businessQuery.data?.totalElements;
  const profileTotal = profilesQuery.data?.totalElements;
  const countsReady = individualCount !== undefined && businessCount !== undefined;
  const latestDocument = [...documents].sort(
    (left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt)
  )[0];

  const applicationDetail = appsLoading
    ? "–"
    : [summary.drafts && plural(summary.drafts, "draft"), summary.inReview && `${summary.inReview} in review`, summary.approved && `${summary.approved} approved`]
        .filter(Boolean)
        .join(" · ") || "None yet";

  return (
    <PageShell width="detail" className="gap-5 pb-16 sm:gap-5 sm:pb-20">
      <section
        className="relative grid items-center gap-5 overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground sm:p-5 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] min-[900px]:p-6"
        aria-labelledby="hello"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[90px] -right-[60px] h-[200px] w-[200px] rounded-full border-[32px] border-primary-foreground/[0.07]"
        />
        <div className="relative z-[1]">
          <h1 id="hello" className="text-[22px] font-[650] leading-7 tracking-tight sm:text-[26px] sm:leading-8">
            {greeting}, {user?.firstName ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm leading-5 text-primary-foreground/90">
            Here’s an overview of your loan applications.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5 max-sm:[&_button]:flex-1">
            <ApplyLoanMenu appearance="inverse" compact={false} className="max-sm:flex-1" />
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-primary-foreground/55 bg-transparent px-3 text-[13px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-foreground/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground active:translate-y-px max-sm:flex-1"
            >
              <Upload className="h-4 w-4" aria-hidden />
              Upload document
            </button>
          </div>
        </div>
        <div className="relative z-[1] flex flex-col gap-3 rounded-lg bg-card p-3.5 text-foreground shadow-lg sm:p-4">
          {appsLoading ? (
            <div className="space-y-3" aria-hidden>
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 animate-pulse rounded-md bg-muted" />
                <span className="min-w-0 flex-1 space-y-2">
                  <span className="block h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                  <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {STEPS.map((step) => (
                  <span key={step} className="h-1 animate-pulse rounded-full bg-muted" />
                ))}
              </div>
            </div>
          ) : latestApplication ? (
            <LatestApplicationCard application={latestApplication} />
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No applications yet. Use <b className="font-semibold text-foreground">Apply for a loan</b> to start one.
            </p>
          )}
        </div>
      </section>

      <div className="grid items-start gap-5 min-[960px]:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-labelledby="feed-h">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 pb-3 pt-4 sm:px-5">
            <h2 id="feed-h" className="text-base font-[650] leading-6 tracking-tight">
              Recent activity
            </h2>
            <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter activity">
              {FILTERS.map((item) => {
                const count =
                  item.key === "all" ? events.length : events.filter((event) => event.kind === item.key).length;
                const pressed = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setFilter(item.key)}
                    className={cn(
                      "inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-input/70 bg-card px-3.5 text-[13px] font-medium transition-colors duration-150 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      pressed && "border-transparent bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {item.label}
                    <span className="text-xs tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {profilesQuery.isError || documentsQuery.isError ? (
            <FeedNotice>
              {profilesQuery.isError ? (
                <NoticeLine
                  message="Profiles couldn’t be loaded."
                  onRetry={() => {
                    void profilesQuery.refetch();
                  }}
                />
              ) : null}
              {documentsQuery.isError ? (
                <NoticeLine
                  message="Documents couldn’t be loaded."
                  onRetry={() => {
                    void documentsQuery.refetch();
                  }}
                />
              ) : null}
            </FeedNotice>
          ) : null}

          {feedLoading ? (
            <FeedSkeleton />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Files}
              title="No activity yet"
              description="Things you do will show up here."
            />
          ) : (
            groups.map((group) => (
              <div key={group.day}>
                <h3 className="border-t border-border bg-muted/45 px-4 pb-1.5 pt-2.5 text-xs font-[650] uppercase tracking-[0.05em] text-muted-foreground sm:px-5">
                  {group.day}
                </h3>
                <ul>
                  {group.items.map((event) => {
                    const Icon = event.icon;
                    return (
                      <li key={event.id} className="border-t border-border first:border-t-0">
                        <button
                          type="button"
                          onClick={() => router.push(event.href)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5"
                        >
                          <RailIcon tone={event.tone} icon={Icon} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] leading-[19px]">
                              <b className="font-[650]">{event.title}</b> {event.verb}
                            </span>
                            <span className="block truncate text-[12.5px] leading-[17px] text-muted-foreground">
                              {event.meta}
                            </span>
                          </span>
                          <time className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">
                            {event.time}
                          </time>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        <aside className="flex flex-col gap-4 min-[960px]:sticky min-[960px]:top-[76px]" aria-label="Overview and shortcuts">
          <section className="rounded-lg border border-border bg-card shadow-sm" aria-labelledby="ov-h">
            <h2 id="ov-h" className="px-4 pb-1.5 pt-3.5 text-[15px] font-[650] leading-[22px] tracking-tight">
              Overview
            </h2>
            <ul className="px-2 pb-2 pt-1.5">
              <li>
                <Link href="/applications" className={railItemClass}>
                  <RailIcon tone="tone-brand" icon={FileText} />
                  <RailCopy title="Applications" detail={applicationDetail} />
                  <span className="text-lg font-[650] tabular-nums">{appsLoading ? "–" : summary.total}</span>
                  <RailChevron />
                </Link>
              </li>
              <li>
                <Link href="/profiles" className={railItemClass}>
                  <RailIcon tone="tone-info" icon={Users} />
                  <RailCopy
                    title="Profiles"
                    detail={countsReady ? `${individualCount} individual · ${businessCount} business` : "–"}
                  />
                  <span className="text-lg font-[650] tabular-nums">
                    {profilesLoading || profileTotal === undefined ? "–" : profileTotal}
                  </span>
                  <RailChevron />
                </Link>
              </li>
              <li>
                <Link href="/documents" className={railItemClass}>
                  <RailIcon tone="tone-success" icon={Files} />
                  <RailCopy
                    title="Documents"
                    detail={
                      documentsLoading
                        ? "–"
                        : latestDocument
                          ? `Latest ${formatProfileDay(latestDocument.updatedAt)}`
                          : "No uploads yet"
                    }
                  />
                  <span className="text-lg font-[650] tabular-nums">
                    {documentsLoading ? "–" : documents.length}
                  </span>
                  <RailChevron />
                </Link>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card shadow-sm" aria-labelledby="qa-h">
            <h2 id="qa-h" className="px-4 pb-1.5 pt-3.5 text-[15px] font-[650] leading-[22px] tracking-tight">
              Quick actions
            </h2>
            <ul className="px-2 pb-2 pt-1.5">
              <li>
                <ApplyLoanMenu appearance="row" />
              </li>
              <li>
                <button type="button" className={railItemClass} onClick={() => setUploadOpen(true)}>
                  <RailIcon tone="tone-success" icon={Upload} />
                  <RailCopy title="Upload document" detail="Add a file to a profile" />
                  <RailChevron />
                </button>
              </li>
              <li>
                <NewProfileAction />
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </PageShell>
  );
}

function LatestApplicationCard({ application }: { application: LoanApplication }) {
  const router = useRouter();
  const title = applicationTitle(application);
  const draft = application.status === "draft";
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="tone-brand grid h-9 w-9 shrink-0 place-items-center rounded-md">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[13.5px] font-[650] leading-[18px]">{title}</b>
          <span className="block truncate text-[12.5px] leading-4 text-muted-foreground">
            {programLabel(application)}
          </span>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>
      <HeroProgress status={application.status} />
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-[13px] text-muted-foreground">
          Updated {formatProfileDay(application.updatedAt)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push(getApplicationHref(application))}
        >
          {draft ? "Continue" : "Open"}
          <ArrowRight />
        </Button>
      </div>
    </>
  );
}

function FeedNotice({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1 border-t border-border px-4 py-3 sm:px-5">{children}</div>;
}

function NoticeLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p className="text-[13px] leading-[18px] text-danger-strong">
      {message}{" "}
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold underline underline-offset-[3px]"
      >
        Try again
      </button>
    </p>
  );
}

function NewProfileAction() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={railItemClass}>
          <RailIcon tone="tone-info" icon={UserRound} />
          <RailCopy title="New profile" detail="Individual or business" />
          <RailChevron />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <NewProfileMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
