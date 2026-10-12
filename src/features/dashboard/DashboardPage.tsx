"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Files,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Upload,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { TableSkeletonRows } from "@/components/TableSkeleton";
import {
  ApplicationStatusBadge,
} from "@/features/applications/ApplicationStatusBadge";
import { getApplicationHref } from "@/features/applications/ApplicationsTable";
import { FilePreviewDialog } from "@/features/documents/components/FilePreviewDialog";
import { ShareDialog } from "@/features/documents/components/ShareDialog";
import { UploadDialog, type LockedUpload } from "@/features/documents/components/UploadDialog";
import { useDocuments } from "@/features/documents/api/queries";
import { useFileDownload } from "@/features/documents/hooks/useFileDownload";
import type { PortalDocument } from "@/features/documents/types";
import { categoryKey, categoryLabel } from "@/features/documents/utils/format";
import { useProfiles } from "@/features/profiles/api/queries";
import {
  ProfileAvatar,
  ProfileStatusBadge,
  ProfileTypeBadge,
} from "@/features/profiles/components/ProfileBadges";
import { profileTypeLabel, showIdentifier } from "@/features/profiles/utils/display";
import { parseApiError } from "@/lib/api-error";
import { cn, formatCurrency, formatDate, formatFileSize } from "@/lib/utils";
import { applicationService } from "@/services/application.service";
import { useAuthStore } from "@/store/auth.store";
import type { CustomerProfileSummary, LoanApplication } from "@/types";

const RECENT_LIMIT = 5;
const COMPANY_KEYS = [
  "companyName",
  "legalName",
  "businessName",
  "tradeName",
  "entityName",
  "organisationName",
  "organizationName",
];

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function updatedTime(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function displayDate(value?: string): string {
  if (!value) return "—";
  try {
    return formatDate(value);
  } catch {
    return "—";
  }
}

function readNamedString(source: unknown, depth = 0): string | undefined {
  if (depth > 5 || source == null) return undefined;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = readNamedString(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof source !== "object") return undefined;
  const record = source as Record<string, unknown>;
  for (const key of COMPANY_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = readNamedString(value, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

function applicationTitle(app: LoanApplication): string {
  return app.applicationNumber || "Draft";
}

function programLabel(app: LoanApplication): string {
  return app.programName || app.loanType || "—";
}

function applicationCompany(app: LoanApplication, profileNames: Map<string, string>): string {
  if (app.customerProfileId) {
    const linked = profileNames.get(app.customerProfileId);
    if (linked) return linked;
  }
  return readNamedString(app.formData) || readNamedString(app.properties) || "—";
}

function documentTypeCode(typeId: string, typeName: string): string {
  const id = typeId.trim();
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(id) && (id.includes("_") || id === id.toUpperCase()) && id.length > 1) {
    return id.toUpperCase();
  }
  const fromName = typeName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return fromName || "DOCUMENT";
}

function profileName(profile: { displayName?: string } | undefined): string {
  return profile?.displayName?.trim() || "Untitled profile";
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function OverviewCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  onOpen,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof FileText;
  tone: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3.5 rounded-lg border border-border bg-card px-[18px] py-4 text-left shadow-sm transition-[border-color] duration-150 hover:border-primary/60 max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:p-3"
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md max-sm:hidden", tone)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[26px] font-[650] leading-[30px] tracking-[-0.02em] tabular-nums max-sm:text-[22px] max-sm:leading-[26px]">
          {value}
        </span>
        <span className="block text-[13px] font-semibold leading-[18px]">{label}</span>
        <span className="mt-0.5 block text-xs leading-4 text-muted-foreground max-[900px]:hidden">{detail}</span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-primary max-sm:hidden"
        aria-hidden
      />
    </button>
  );
}

function SectionTitle({
  id,
  title,
  href,
}: {
  id: string;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="scroll-mt-20 text-lg font-semibold leading-[26px] tracking-[-0.01em]">
        {title}
      </h2>
      <Button variant="ghost" size="sm" asChild>
        <Link href={href}>
          View all
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function SectionMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Couldn't load this section"
      description={message}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      }
    />
  );
}

function LoadingRows({ label, columns }: { label: string; columns: number }) {
  return <TableSkeletonRows label={label} columns={columns} rows={3} />;
}

function MenuAction({
  icon,
  children,
  disabled,
  onSelect,
}: {
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem disabled={disabled} className="px-2.5 py-[7px] text-[13px]" onSelect={onSelect}>
      {icon}
      {children}
    </DropdownMenuItem>
  );
}

function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${label}`}
          className="text-muted-foreground hover:bg-primary-soft hover:text-primary data-[state=open]:bg-primary-soft data-[state=open]:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[210px]" onClick={(event) => event.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecentTable({
  id,
  title,
  href,
  caption,
  children,
}: {
  id: string;
  title: string;
  href: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle id={id} title={title} href={href} />
      <section
        aria-labelledby={id}
        className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        <Table className="text-[13px] [&_td]:h-14 [&_td]:px-3 [&_th]:h-[38px] [&_th]:px-3 [&_th]:text-xs">
          <caption className="sr-only">{caption}</caption>
          {children}
        </Table>
      </section>
    </div>
  );
}

const rowClass =
  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { download, pendingKey } = useFileDownload();
  const [previewTarget, setPreviewTarget] = useState<PortalDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<PortalDocument | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lockedUpload, setLockedUpload] = useState<LockedUpload | null>(null);

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

  const profileNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const profile of profiles) {
      names.set(profile.id, profile.displayName || "Untitled profile");
    }
    return names;
  }, [profiles]);

  const summary = useMemo(() => {
    const list = applications ?? [];
    return {
      total: list.length,
      drafts: list.filter((app) => app.status === "draft").length,
      inReview: list.filter((app) => app.status === "submitted" || app.status === "under_review").length,
      approved: list.filter((app) => app.status === "approved").length,
    };
  }, [applications]);

  const recentApplications = useMemo(() => {
    return [...(applications ?? [])]
      .sort((left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt))
      .slice(0, RECENT_LIMIT);
  }, [applications]);

  const drafts = useMemo(() => {
    return (applications ?? [])
      .filter((app) => app.status === "draft")
      .sort((left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt));
  }, [applications]);

  const recentProfiles = useMemo(() => {
    return [...profiles]
      .sort((left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt))
      .slice(0, RECENT_LIMIT);
  }, [profiles]);

  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((left, right) => updatedTime(right.updatedAt) - updatedTime(left.updatedAt))
      .slice(0, RECENT_LIMIT);
  }, [documents]);

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
  const latestDocument = recentDocuments[0];
  const individualCount = individualQuery.data?.totalElements;
  const businessCount = businessQuery.data?.totalElements;
  const profileTotal = profilesQuery.data?.totalElements;
  const countsReady = individualCount !== undefined && businessCount !== undefined;
  const latestDraft = drafts[0];

  return (
    <PageShell className="pb-16 sm:pb-20">
      <PageHeader
        title={`${greeting}, ${user?.firstName ?? "there"} 👋`}
        description="Here's an overview of your loan applications."
      />

      <div className="grid grid-cols-3 gap-3 max-sm:gap-2" aria-label="Overview">
        <OverviewCard
          label="Applications"
          value={appsLoading ? "–" : String(summary.total)}
          detail={
            appsLoading
              ? "–"
              : `${plural(summary.drafts, "draft")} · ${summary.inReview} in review · ${summary.approved} approved`
          }
          icon={FileText}
          tone="tone-brand"
          onOpen={() => scrollToSection("apps-h")}
        />
        <OverviewCard
          label="Profiles"
          value={profilesLoading || profileTotal === undefined ? "–" : String(profileTotal)}
          detail={countsReady ? `${individualCount} individual · ${businessCount} business` : "–"}
          icon={Users}
          tone="tone-info"
          onOpen={() => scrollToSection("pr-h")}
        />
        <OverviewCard
          label="Documents"
          value={documentsLoading ? "–" : String(documents.length)}
          detail={
            documentsLoading
              ? "–"
              : latestDocument
                ? `Latest upload ${displayDate(latestDocument.updatedAt)}`
                : "No uploads yet"
          }
          icon={Files}
          tone="tone-success"
          onOpen={() => scrollToSection("dc-h")}
        />
      </div>

      {latestDraft ? (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-lg border border-primary/25 bg-primary-soft px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-card text-primary-soft-foreground">
            <Pencil className="h-4 w-4" aria-hidden />
          </span>
          <p className="min-w-[240px] flex-1 text-[13.5px] leading-5 text-primary-soft-foreground">
            {drafts.length === 1 ? (
              <>
                <b className="font-semibold">You have a draft in progress.</b>{" "}
                <span className="font-mono text-xs">{applicationTitle(latestDraft)}</span>
                {" · "}
                {applicationCompany(latestDraft, profileNames)}
                {" · "}
                {programLabel(latestDraft)}
                {" · updated "}
                {displayDate(latestDraft.updatedAt)}
              </>
            ) : (
              <>
                <b className="font-semibold">You have {drafts.length} drafts in progress.</b> Latest:{" "}
                <span className="font-mono text-xs">{applicationTitle(latestDraft)}</span>
                {" · "}
                {applicationCompany(latestDraft, profileNames)}
                {" · "}
                {programLabel(latestDraft)}
              </>
            )}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => router.push(getApplicationHref(latestDraft))}
          >
            Continue
            <ArrowRight />
          </Button>
        </div>
      ) : null}

      <RecentTable id="apps-h" title="Recent applications" href="/applications" caption="Loan applications">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Application</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">Company</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">Program</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Updated</TableHead>
            <TableHead className="w-16 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appsLoading ? (
            <LoadingRows label="Loading applications" columns={7} />
          ) : recentApplications.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-auto !p-0">
                <EmptyState
                  icon={FileText}
                  title="No applications yet"
                  description="Use “Apply for a loan” to start one."
                />
              </TableCell>
            </TableRow>
          ) : (
            recentApplications.map((app) => {
              const title = applicationTitle(app);
              const href = getApplicationHref(app);
              const company = applicationCompany(app, profileNames);
              const program = programLabel(app);
              return (
                <TableRow
                  key={app.id}
                  tabIndex={0}
                  aria-label={title}
                  className={rowClass}
                  onClick={() => router.push(href)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(href);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="tone-brand grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm">
                        <FileText className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold leading-[18px]">{title}</span>
                        <span className="mt-px block max-w-[230px] truncate font-mono text-[11px] leading-[14px] text-muted-foreground">
                          {app.id}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground min-[901px]:hidden">
                          {company} · {program}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden min-[901px]:table-cell">
                    <div className="flex min-w-0 items-center gap-2 font-medium">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-foreground">
                        <Building2 className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="truncate">{company}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden min-[901px]:table-cell">{program}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(app.loanAmount || 0)}
                  </TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={app.status} size="sm" />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                    {displayDate(app.updatedAt)}
                  </TableCell>
                  <TableCell className="w-16 text-right" onClick={(event) => event.stopPropagation()}>
                    <RowMenu label={title}>
                      <MenuAction
                        icon={<Eye className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => router.push(href)}
                      >
                        Open application
                      </MenuAction>
                      {app.status === "draft" ? (
                        <MenuAction
                          icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
                          onSelect={() => router.push(href)}
                        >
                          Continue draft
                        </MenuAction>
                      ) : null}
                    </RowMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </RecentTable>

      <RecentTable id="pr-h" title="Recent profiles" href="/profiles" caption="Recent profiles">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Profile</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">GSTIN</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">Mobile</TableHead>
            <TableHead className="hidden sm:table-cell">Updated</TableHead>
            <TableHead className="w-16 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profilesLoading ? (
            <LoadingRows label="Loading profiles" columns={7} />
          ) : profilesQuery.isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-auto !p-0">
                <SectionMessage
                  message={parseApiError(profilesQuery.error).message}
                  onRetry={() => {
                    void profilesQuery.refetch();
                  }}
                />
              </TableCell>
            </TableRow>
          ) : recentProfiles.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-auto !p-0">
                <EmptyState icon={Users} title="No profiles yet" description="Create a profile to get started." />
              </TableCell>
            </TableRow>
          ) : (
            recentProfiles.map((profile) => (
              <ProfileRow key={profile.id} profile={profile} onOpen={() => router.push(`/profiles/${profile.id}`)} />
            ))
          )}
        </TableBody>
      </RecentTable>

      <RecentTable id="dc-h" title="Recent documents" href="/documents" caption="Recent documents">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Document</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">Category</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">Profile</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="hidden min-[901px]:table-cell">Size</TableHead>
            <TableHead className="hidden sm:table-cell">Updated</TableHead>
            <TableHead className="w-16 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentsLoading ? (
            <LoadingRows label="Loading documents" columns={7} />
          ) : documentsQuery.isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-auto !p-0">
                <SectionMessage
                  message={parseApiError(documentsQuery.error).message}
                  onRetry={() => {
                    void documentsQuery.refetch();
                  }}
                />
              </TableCell>
            </TableRow>
          ) : recentDocuments.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="h-auto !p-0">
                <EmptyState icon={Files} title="No documents yet" description="Upload a document to see it here." />
              </TableCell>
            </TableRow>
          ) : (
            recentDocuments.map((document) => {
              const linked = document.linked ?? [];
              const primary = linked.find((item) => item.relation === "FOR") ?? linked[0];
              const name = primary ? profileName(primary) : "";
              const updated = displayDate(document.updatedAt);
              const fileName = document.fileName?.trim() ?? "";
              const title = fileName || document.typeName;
              const label = document.label ? `${title} ${document.label}` : title;
              const financial = categoryKey(document.category) === "FINANCIALS";
              const downloading = pendingKey === `${document.id}:${document.latestVersion}`;
              return (
                <TableRow
                  key={document.id}
                  tabIndex={0}
                  aria-label={title}
                  className={rowClass}
                  onClick={() => router.push(`/documents/${document.id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/documents/${document.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="tone-brand grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm">
                        <FileText className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] font-semibold leading-[18px]">
                          <span className="min-w-0 truncate">{title}</span>
                          {document.label ? (
                            <Badge variant="outline" dot={false} size="sm">
                              {document.label}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-px block truncate text-[12px] leading-4 text-muted-foreground">
                          {fileName && fileName !== document.typeName
                            ? document.typeName
                            : documentTypeCode(document.typeId, document.typeName)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground min-[901px]:hidden">
                          {name ? `${name} · ${updated}` : updated}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden min-[901px]:table-cell">
                    <Badge variant={financial ? "brand" : "info"} size="sm">
                      {categoryLabel(categoryKey(document.category), document.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden min-[901px]:table-cell">{name || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="secondary" dot={false} size="xs" className="rounded-md tabular-nums">
                      v{document.latestVersion}
                    </Badge>
                    <Badge variant="success" dot={false} size="sm" className="ml-1">
                      Latest
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums min-[901px]:table-cell">
                    {document.sizeBytes ? formatFileSize(document.sizeBytes) : "—"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
                    {updated}
                  </TableCell>
                  <TableCell className="w-16 text-right" onClick={(event) => event.stopPropagation()}>
                    <RowMenu label={label}>
                      <MenuAction
                        icon={<Eye className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => setPreviewTarget(document)}
                      >
                        Preview
                      </MenuAction>
                      <MenuAction
                        disabled={downloading}
                        icon={
                          downloading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Download className="h-4 w-4 text-muted-foreground" />
                          )
                        }
                        onSelect={() => {
                          void download(
                            document.id,
                            document.latestVersion,
                            document.fileName || document.typeName
                          );
                        }}
                      >
                        Download
                      </MenuAction>
                      <MenuAction
                        icon={<Share2 className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => setShareTarget(document)}
                      >
                        Share
                      </MenuAction>
                      <DropdownMenuSeparator />
                      <MenuAction
                        icon={<Upload className="h-4 w-4 text-muted-foreground" />}
                        onSelect={() => {
                          setLockedUpload({
                            documentId: document.id,
                            typeId: document.typeId,
                            typeName: document.typeName,
                            label: document.label,
                            category: document.category,
                          });
                          setUploadOpen(true);
                        }}
                      >
                        Upload new version
                      </MenuAction>
                    </RowMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </RecentTable>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) setLockedUpload(null);
        }}
        locked={lockedUpload ?? undefined}
      />
      <FilePreviewDialog
        open={!!previewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
        documentId={previewTarget?.id ?? ""}
        version={previewTarget?.latestVersion ?? 0}
        fileName={previewTarget?.fileName || previewTarget?.typeName || "document"}
        contentType={previewTarget?.contentType ?? ""}
        onDownload={(version, fileName) => {
          if (!previewTarget) return;
          void download(previewTarget.id, version, fileName);
        }}
      />
      <ShareDialog
        open={!!shareTarget}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
        documents={
          shareTarget
            ? [
                {
                  id: shareTarget.id,
                  name: shareTarget.fileName || shareTarget.typeName,
                  fileName: shareTarget.fileName,
                  typeName: shareTarget.typeName,
                  tag: shareTarget.label || undefined,
                },
              ]
            : []
        }
      />
    </PageShell>
  );
}

function ProfileRow({
  profile,
  onOpen,
}: {
  profile: CustomerProfileSummary;
  onOpen: () => void;
}) {
  const router = useRouter();
  const name = profile.displayName || "Untitled profile";
  const typeLabel = profileTypeLabel(profile.type);
  const updated = displayDate(profile.updatedAt);
  return (
    <TableRow
      tabIndex={0}
      aria-label={name}
      className={rowClass}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <TableCell>
        <div className="flex min-w-0 items-center gap-2.5">
          <ProfileAvatar name={name} size="sm" />
          <div className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold leading-[18px]">{name}</span>
            <span className="mt-px block truncate font-mono text-[11px] leading-[14px] text-muted-foreground">
              {showIdentifier(profile.identifiers.pan)}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground min-[901px]:hidden">
              {typeLabel} · {updated}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <ProfileTypeBadge type={profile.type} size="sm" />
      </TableCell>
      <TableCell>
        <ProfileStatusBadge status={profile.status} size="sm" />
      </TableCell>
      <TableCell
        className={cn(
          "hidden font-mono text-[12.5px] min-[901px]:table-cell",
          profile.identifiers.gstin ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {showIdentifier(profile.identifiers.gstin)}
      </TableCell>
      <TableCell
        className={cn(
          "hidden min-[901px]:table-cell",
          profile.identifiers.mobile ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {showIdentifier(profile.identifiers.mobile)}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-muted-foreground tabular-nums sm:table-cell">
        {updated}
      </TableCell>
      <TableCell className="w-16 text-right" onClick={(event) => event.stopPropagation()}>
        <RowMenu label={name}>
          <MenuAction
            icon={<Eye className="h-4 w-4 text-muted-foreground" />}
            onSelect={() => router.push(`/profiles/${profile.id}`)}
          >
            View profile
          </MenuAction>
          <MenuAction
            icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
            onSelect={() => router.push(`/profiles/${profile.id}?edit=1`)}
          >
            Edit profile
          </MenuAction>
        </RowMenu>
      </TableCell>
    </TableRow>
  );
}
