"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Search, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/ErrorState";
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
import type { CustomerProfileStatus, CustomerProfileSummary, CustomerProfileType } from "@/types";
import { useProfiles } from "../api/queries";
import { PROFILE_PAGE_SIZE } from "../constants";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  formatProfileWhen,
  profileStatusLabel,
  profileTypeLabel,
  showIdentifier,
} from "../utils/display";

const TYPE_FILTERS: { id: "ALL" | CustomerProfileType; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "INDIVIDUAL", label: "Individual" },
  { id: "BUSINESS", label: "Business" },
];

const STATUS_FILTERS: { id: "ALL" | CustomerProfileStatus; label: string }[] = [
  { id: "ALL", label: "All statuses" },
  { id: "ACTIVE", label: "Active" },
  { id: "ARCHIVED", label: "Archived" },
];

const PAGE_SIZES = [10, 25, 50] as const;

function FilterPills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label={label}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-slate-100 bg-white text-muted-foreground shadow-sm hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-3 p-6" aria-busy="true">
      <p className="sr-only">Loading profiles</p>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export function ProfilesPage() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]["id"]>("ALL");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(PROFILE_PAGE_SIZE);
  const deferredSearch = useDebouncedValue(search, 300);
  const query = deferredSearch.trim();

  const filters = useMemo(
    () => ({
      page,
      size,
      ...(type === "ALL" ? {} : { type }),
      ...(status === "ALL" ? {} : { status }),
      ...(query ? { q: query } : {}),
    }),
    [page, size, type, status, query]
  );

  const profiles = useProfiles(filters);
  const filtered = type !== "ALL" || status !== "ALL" || query.length > 0;
  const total = profiles.data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = (profiles.data?.page ?? page) + 1;

  const openProfile = (profile: CustomerProfileSummary) => {
    router.push(`/profiles/${profile.id}`);
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profiles</h1>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Individual and business customers.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" className="h-11 gap-2 hover:-translate-y-0.5">
              New profile
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => router.push("/profiles/new?type=individual")}
              className="flex-col items-start"
            >
              <span className="flex items-center gap-2 font-medium text-slate-900">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                Individual
              </span>
              <span className="text-xs font-normal text-slate-500">A person</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => router.push("/profiles/new?type=business")}
              className="flex-col items-start"
            >
              <span className="flex items-center gap-2 font-medium text-slate-900">
                <Users className="h-4 w-4 text-muted-foreground" />
                Business
              </span>
              <span className="text-xs font-normal text-slate-500">A company or firm</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          label="Profile type"
          value={type}
          options={TYPE_FILTERS}
          onChange={(next) => {
            setType(next);
            setPage(0);
          }}
        />
        <FilterPills
          label="Profile status"
          value={status}
          options={STATUS_FILTERS}
          onChange={(next) => {
            setStatus(next);
            setPage(0);
          }}
        />
      </div>

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Search by name, PAN, GSTIN, or mobile"
        aria-label="Search by name, PAN, GSTIN, or mobile"
        startAdornment={<Search className="h-4 w-4" />}
        className="h-11 max-w-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

      <Card className="border-slate-100 shadow-sm">
        <CardContent className="p-0">
          {profiles.isLoading ? (
            <ProfileSkeleton />
          ) : (profiles.data?.content.length ?? 0) === 0 ? (
            <div className="px-6 py-16 text-center" role="status">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-base font-medium tracking-tight text-slate-900">
                {filtered ? "No profiles match these filters" : "No profiles yet"}
              </p>
              <p className="mt-1 text-sm font-normal text-slate-500">
                {filtered
                  ? "Try a different search or filter."
                  : "Create an individual or business profile to get started."}
              </p>
              {filtered ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 h-11"
                  onClick={() => {
                    setType("ALL");
                    setStatus("ALL");
                    setSearch("");
                    setPage(0);
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">PAN</TableHead>
                  <TableHead className="hidden lg:table-cell">GSTIN</TableHead>
                  <TableHead className="hidden lg:table-cell">Mobile</TableHead>
                  <TableHead className="hidden sm:table-cell">Version</TableHead>
                  <TableHead className="hidden xl:table-cell">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.data?.content.map((profile) => (
                  <TableRow
                    key={profile.id}
                    tabIndex={0}
                    aria-label={profile.displayName || "Open profile"}
                    className="cursor-pointer transition-all duration-200 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                    onClick={() => openProfile(profile)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openProfile(profile);
                      }
                    }}
                  >
                    <TableCell>
                      <p className="font-medium tracking-tight text-slate-900">
                        {profile.displayName || "Untitled profile"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        PAN {showIdentifier(profile.identifiers.pan)}
                        {" · "}
                        {showIdentifier(profile.identifiers.mobile)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.type === "BUSINESS" ? "info" : "secondary"}>
                        {profileTypeLabel(profile.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.status === "ACTIVE" ? "success" : "draft"}>
                        {profileStatusLabel(profile.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">
                      {showIdentifier(profile.identifiers.pan)}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs lg:table-cell">
                      {showIdentifier(profile.identifiers.gstin)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {showIdentifier(profile.identifiers.mobile)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{profile.currentVersionNo}</TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {formatProfileWhen(profile.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > 0 ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" role="status">
            {total === 1 ? "1 profile" : `${total} profiles`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={String(size)}
              onValueChange={(value) => {
                setSize(Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-11 w-full sm:w-36" aria-label="Profiles per page">
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                aria-label="Previous page"
                disabled={page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-20 text-center text-sm text-muted-foreground">
                {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                aria-label="Next page"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
