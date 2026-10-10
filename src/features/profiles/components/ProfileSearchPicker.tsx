"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { parseApiError } from "@/lib/api-error";
import type { CustomerProfileSummary } from "@/types";
import { useProfiles } from "../api/queries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { profileTypeLabel, showIdentifier } from "../utils/display";

interface ProfileSearchPickerProps {
  excludeIds?: string[];
  onSelect: (profile: CustomerProfileSummary) => void;
  selectedId?: string;
}

export function ProfileSearchPicker({ excludeIds = [], onSelect, selectedId }: ProfileSearchPickerProps) {
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search, 300).trim();
  const filters = useMemo(
    () => ({
      page: 0,
      size: 8,
      status: "ACTIVE" as const,
      ...(query ? { q: query } : {}),
    }),
    [query]
  );
  const profiles = useProfiles(filters);
  const hidden = new Set(excludeIds);
  const rows = (profiles.data?.content ?? []).filter((profile) => !hidden.has(profile.id));

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, PAN, GSTIN, or mobile"
        aria-label="Search profiles"
        startAdornment={<Search className="h-4 w-4" />}
        className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {profiles.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <p className="sr-only">Loading profiles</p>
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : null}
      {profiles.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {parseApiError(profiles.error).message}
        </p>
      ) : null}
      {!profiles.isLoading && !profiles.isError && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          No profiles match this search.
        </p>
      ) : null}
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {rows.map((profile) => {
          const selected = profile.id === selectedId;
          return (
            <li key={profile.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(profile)}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-slate-100 bg-card px-3 py-2.5 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] aria-pressed:border-primary aria-pressed:bg-primary/5"
              >
                <span className="text-sm font-semibold tracking-tight text-slate-900">
                  {profile.displayName || "Untitled profile"}
                </span>
                <span className="text-xs font-normal text-slate-500">
                  {profileTypeLabel(profile.type)}
                  {" · "}
                  PAN {showIdentifier(profile.identifiers.pan)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
