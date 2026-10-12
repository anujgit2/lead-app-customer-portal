"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Menu,
  Plus,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, PageShell } from "@/components/PageShell";
import { SortableTableHead, type SortDirection } from "@/components/SortableTableHead";
import { BlockSkeleton } from "@/components/TableSkeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { CustomerProfileListFilters, CustomerProfileStatus, CustomerProfileSummary, CustomerProfileType } from "@/types";
import { useProfiles } from "../api/queries";
import { PROFILE_PAGE_SIZE } from "../constants";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ProfileAvatar, ProfileStatusBadge, ProfileTypeBadge } from "../components/ProfileBadges";
import { formatProfileDay, formatProfileTime, showIdentifier } from "../utils/display";

const PAGE_SIZES = [5, 10, 25] as const;

type TypeFilter = "ALL" | CustomerProfileType;
type StatusFilter = "ALL" | CustomerProfileStatus;
type SortKey = "name" | "updated";
type SortDir = SortDirection;
type ProfileView = "table" | "cards";

function facetFilters(
  type: TypeFilter,
  status: StatusFilter,
  query: string
): Omit<CustomerProfileListFilters, "page" | "size"> {
  return {
    ...(type === "ALL" ? {} : { type }),
    ...(status === "ALL" ? {} : { status }),
    ...(query ? { q: query } : {}),
  };
}

function shownCount(total: number | undefined): string {
  return total === undefined ? "–" : String(total);
}

function listCount(total: number, page: number, size: number, visible: number): string {
  if (total === 0) return "0 profiles";
  if (total <= size) return total === 1 ? "1 profile" : `${total} profiles`;
  const start = page * size + 1;
  return `Showing ${start}–${start + visible - 1} of ${total} profiles`;
}

function updatedTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

const TypeBadge = ProfileTypeBadge;
const StatusBadge = ProfileStatusBadge;
const SortHeader = SortableTableHead<SortKey>;

function VersionTag({ version }: { version: number }) {
  return (
    <Badge variant="secondary" dot={false} size="sm" className="rounded-md tabular-nums">
      v{version}
    </Badge>
  );
}

function EmptyProfiles({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <EmptyState
      icon={filtered ? Search : Users}
      title={filtered ? "No profiles found" : "No profiles yet"}
      description={
        filtered
          ? "Try a different search or clear the filters."
          : "Create an individual or business profile to get started."
      }
      action={
        filtered ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : null
      }
    />
  );
}

function ProfileSkeleton({ view }: { view: ProfileView }) {
  if (view === "cards") {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-3" aria-busy="true">
        <p className="sr-only">Loading profiles</p>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return <BlockSkeleton label="Loading profiles" />;
}

function ProfileCards({
  profiles,
  onOpen,
}: {
  profiles: CustomerProfileSummary[];
  onOpen: (profile: CustomerProfileSummary) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-3">
      {profiles.map((profile) => {
        const name = profile.displayName || "Untitled profile";
        const day = formatProfileDay(profile.updatedAt);
        const time = formatProfileTime(profile.updatedAt);
        return (
          <article
            key={profile.id}
            tabIndex={0}
            className="flex cursor-pointer flex-col gap-2.5 rounded-lg border border-border bg-card p-3 transition-colors duration-150 hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={() => onOpen(profile)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onOpen(profile);
            }}
          >
            <div className="flex items-center gap-3">
              <ProfileAvatar name={name} />
              <div className="min-w-0">
                <b className="block truncate font-semibold text-foreground">{name}</b>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <TypeBadge type={profile.type} />
                  <StatusBadge status={profile.status} />
                </div>
              </div>
            </div>
            <dl className="grid gap-1.5">
              <div className="flex justify-between gap-3 text-[13px]">
                <dt className="text-muted-foreground">PAN</dt>
                <dd className="min-w-0 truncate font-mono text-[12.5px] font-medium">
                  {showIdentifier(profile.identifiers.pan)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-[13px]">
                <dt className="text-muted-foreground">GSTIN</dt>
                <dd
                  className={cn(
                    "min-w-0 truncate font-mono text-[12.5px] font-medium",
                    profile.identifiers.gstin ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {showIdentifier(profile.identifiers.gstin)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-[13px]">
                <dt className="text-muted-foreground">Mobile</dt>
                <dd
                  className={cn(
                    "min-w-0 truncate font-medium",
                    profile.identifiers.mobile ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {showIdentifier(profile.identifiers.mobile)}
                </dd>
              </div>
            </dl>
            <div className="flex items-center justify-between border-t border-border pt-2 text-[12.5px] text-muted-foreground">
              <span className="tabular-nums">
                {day}
                {time ? `, ${time}` : ""}
              </span>
              <VersionTag version={profile.currentVersionNo} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ProfilesPage() {
  const router = useRouter();
  const [type, setType] = useState<TypeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(PROFILE_PAGE_SIZE);
  const [sort, setSort] = useState<SortKey>("updated");
  const [dir, setDir] = useState<SortDir>("desc");
  const [view, setView] = useState<ProfileView>("table");
  const deferredSearch = useDebouncedValue(search, 300);
  const query = deferredSearch.trim();

  const filters = useMemo(
    () => ({ page, size, ...facetFilters(type, status, query) }),
    [page, size, type, status, query]
  );
  const typeCountFilters = useMemo(() => facetFilters("ALL", status, query), [status, query]);
  const individualCountFilters = useMemo(
    () => facetFilters("INDIVIDUAL", status, query),
    [status, query]
  );
  const businessCountFilters = useMemo(
    () => facetFilters("BUSINESS", status, query),
    [status, query]
  );
  const statusCountFilters = useMemo(() => facetFilters(type, "ALL", query), [type, query]);
  const activeCountFilters = useMemo(() => facetFilters(type, "ACTIVE", query), [type, query]);
  const archivedCountFilters = useMemo(
    () => facetFilters(type, "ARCHIVED", query),
    [type, query]
  );

  const profiles = useProfiles(filters);
  const typeAll = useProfiles({ page: 0, size: 1, ...typeCountFilters });
  const typeIndividual = useProfiles({ page: 0, size: 1, ...individualCountFilters });
  const typeBusiness = useProfiles({ page: 0, size: 1, ...businessCountFilters });
  const statusAll = useProfiles({ page: 0, size: 1, ...statusCountFilters });
  const statusActive = useProfiles({ page: 0, size: 1, ...activeCountFilters });
  const statusArchived = useProfiles({ page: 0, size: 1, ...archivedCountFilters });

  const filtered = type !== "ALL" || status !== "ALL" || query.length > 0;
  const total = profiles.data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil((profiles.data?.totalElements ?? 0) / size));
  const currentPage = Math.min(totalPages, (profiles.data?.page ?? page) + 1);

  const rows = useMemo(() => {
    const content = [...(profiles.data?.content ?? [])];
    content.sort((left, right) => {
      const result =
        sort === "name"
          ? (left.displayName || "").localeCompare(right.displayName || "", undefined, {
              sensitivity: "base",
            })
          : updatedTime(left.updatedAt) - updatedTime(right.updatedAt);
      return dir === "asc" ? result : -result;
    });
    return content;
  }, [profiles.data?.content, sort, dir]);

  const openProfile = (profile: CustomerProfileSummary) => {
    router.push(`/profiles/${profile.id}`);
  };

  const clearFilters = () => {
    setType("ALL");
    setStatus("ALL");
    setSearch("");
    setPage(0);
  };

  const changeSort = (column: SortKey) => {
    if (sort === column) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(column);
    setDir(column === "name" ? "asc" : "desc");
  };

  if (profiles.isError) {
    const apiError = parseApiError(profiles.error);
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <ErrorState
          compact
          title="Unable to load profiles"
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
            void profiles.refetch();
          }}
        />
      </div>
    );
  }

  const loading = profiles.isLoading && !profiles.data;
  const empty = !loading && rows.length === 0;

  return (
    <PageShell>
      <PageHeader
        title="Profiles"
        description="Individual and business customers."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="group w-full data-[state=open]:bg-primary-hover sm:w-auto">
                <Plus />
                New profile
                <ChevronDown className="transition-transform duration-150 group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[280px] max-sm:w-[var(--radix-dropdown-menu-trigger-width)]"
            >
              <DropdownMenuItem onSelect={() => router.push("/profiles/new?type=individual")}>
                <UserRound className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-semibold">Individual</span>
                  <span className="block text-[12.5px] font-normal leading-[18px] text-muted-foreground">
                    Person with PAN and mobile
                  </span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/profiles/new?type=business")}>
                <Building2 className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-semibold">Business</span>
                  <span className="block text-[12.5px] font-normal leading-[18px] text-muted-foreground">
                    Company with PAN and GSTIN
                  </span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-full sm:max-w-[420px] sm:basis-[280px]">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            type="search"
            placeholder="Search by name, PAN, GSTIN, or mobile"
            aria-label="Search profiles"
            autoComplete="off"
            startAdornment={<Search className="h-4 w-4" />}
            className="h-8 text-[13px]"
          />
        </div>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as TypeFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-8 w-full rounded-md px-3 text-[13px] font-medium sm:w-auto sm:min-w-[150px]" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types ({shownCount(typeAll.data?.totalElements)})</SelectItem>
            <SelectItem value="INDIVIDUAL">
              Individual ({shownCount(typeIndividual.data?.totalElements)})
            </SelectItem>
            <SelectItem value="BUSINESS">
              Business ({shownCount(typeBusiness.data?.totalElements)})
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filter by status">
          {(
            [
              ["ALL", "All statuses", statusAll.data?.totalElements],
              ["ACTIVE", "Active", statusActive.data?.totalElements],
              ["ARCHIVED", "Archived", statusArchived.data?.totalElements],
            ] as const
          ).map(([id, label, count]) => {
            const active = status === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStatus(id);
                  setPage(0);
                }}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-[background,border-color,color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-input/70 bg-card text-foreground hover:bg-muted"
                )}
              >
                {label}
                <span className="text-xs tabular-nums opacity-70">{shownCount(count)}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden min-w-0 flex-1 sm:block" aria-hidden />
        <div className="inline-flex h-8 items-center gap-0.5 rounded-md bg-muted p-0.5" role="group" aria-label="View">
          <button
            type="button"
            aria-pressed={view === "table"}
            aria-label="Table view"
            onClick={() => setView("table")}
            className={cn(
              "inline-flex h-7 w-[34px] items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150",
              view === "table" && "bg-card text-foreground shadow-sm"
            )}
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-pressed={view === "cards"}
            aria-label="Card view"
            onClick={() => setView("cards")}
            className={cn(
              "inline-flex h-7 w-[34px] items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150",
              view === "cards" && "bg-card text-foreground shadow-sm"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section
        className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        aria-label="Profiles list"
      >
        {loading ? <ProfileSkeleton view={view} /> : null}

        {!loading && view === "table" ? (
          <Table className="[&_td]:px-3 [&_th]:h-9 [&_th]:px-3">
            <caption className="sr-only">Profiles</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHeader label="Profile" column="name" sort={sort} dir={dir} onSort={changeSort} />
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden min-[901px]:table-cell">GSTIN</TableHead>
                <TableHead className="hidden min-[901px]:table-cell">Mobile</TableHead>
                <TableHead className="hidden min-[901px]:table-cell">Version</TableHead>
                <SortHeader
                  label="Updated"
                  column="updated"
                  sort={sort}
                  dir={dir}
                  onSort={changeSort}
                  className="hidden sm:table-cell"
                />
                <TableHead className="w-10 pr-3 text-right">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-auto !p-0">
                    <EmptyProfiles filtered={filtered} onClear={clearFilters} />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((profile) => {
                  const name = profile.displayName || "Untitled profile";
                  return (
                    <TableRow
                      key={profile.id}
                      tabIndex={0}
                      aria-label={name}
                      className="group cursor-pointer hover:[&>td]:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openProfile(profile)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openProfile(profile);
                        }
                      }}
                    >
                      <TableCell className="h-12">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProfileAvatar name={name} />
                          <div className="min-w-0">
                            <Link
                              href={`/profiles/${profile.id}`}
                              className="block truncate font-semibold leading-5 text-foreground hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {name}
                            </Link>
                            <span className="mt-0.5 block font-mono text-xs leading-4 text-muted-foreground">
                              {showIdentifier(profile.identifiers.pan)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="h-12">
                        <TypeBadge type={profile.type} />
                      </TableCell>
                      <TableCell className="h-12">
                        <StatusBadge status={profile.status} />
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden h-12 font-mono text-[12.5px] min-[901px]:table-cell",
                          profile.identifiers.gstin ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {showIdentifier(profile.identifiers.gstin)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden h-12 min-[901px]:table-cell",
                          profile.identifiers.mobile ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {showIdentifier(profile.identifiers.mobile)}
                      </TableCell>
                      <TableCell className="hidden h-12 min-[901px]:table-cell">
                        <VersionTag version={profile.currentVersionNo} />
                      </TableCell>
                      <TableCell className="hidden h-12 sm:table-cell">
                        <span className="block font-medium leading-5 tabular-nums">
                          {formatProfileDay(profile.updatedAt)}
                        </span>
                        <span className="block text-xs leading-4 text-muted-foreground tabular-nums">
                          {formatProfileTime(profile.updatedAt)}
                        </span>
                      </TableCell>
                      <TableCell className="h-12 w-10 pr-3 text-right text-muted-foreground">
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        ) : null}

        {!loading && view === "cards" ? (
          empty ? (
            <EmptyProfiles filtered={filtered} onClear={clearFilters} />
          ) : (
            <ProfileCards profiles={rows} onOpen={openProfile} />
          )
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
          <p className="text-[13px] text-muted-foreground" role="status">
            {loading ? "Loading profiles" : listCount(total, page, size, rows.length)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(size)}
              onValueChange={(value) => {
                setSize(Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-8 w-auto rounded-md px-3 text-[13px] font-medium" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={loading || page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span
                className="min-w-14 text-center text-[13px] tabular-nums text-muted-foreground"
                aria-live="polite"
              >
                {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={loading || page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
