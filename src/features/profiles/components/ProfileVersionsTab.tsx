"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/ErrorState";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/api-error";
import type { CustomerProfileDetail } from "@/types";
import {
  useFormTemplate,
  useProfileDiff,
  useProfileVersion,
  useProfileVersions,
  useRestoreProfileVersion,
} from "../api/queries";
import { formatProfileWhen } from "../utils/display";
import { mapDiffForDisplay } from "../utils/diff-display";
import { ProfileOverview } from "./ProfileOverview";

interface ProfileVersionsTabProps {
  profile: CustomerProfileDetail;
}

export function ProfileVersionsTab({ profile }: ProfileVersionsTabProps) {
  const versions = useProfileVersions(profile.id);
  const [viewing, setViewing] = useState<number | null>(null);
  const [fromVersion, setFromVersion] = useState<string | undefined>(undefined);
  const [toVersion, setToVersion] = useState<string | undefined>(undefined);
  const [compare, setCompare] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const from = compare && fromVersion ? Number(fromVersion) : null;
  const to = compare && toVersion ? Number(toVersion) : null;
  const diff = useProfileDiff(profile.id, from, to);
  const restore = useRestoreProfileVersion(profile.id);

  if (versions.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <p className="sr-only">Loading versions</p>
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (versions.isError) {
    const apiError = parseApiError(versions.error);
    return (
      <ErrorState
        compact
        title="Unable to load versions"
        message={apiError.message}
        status={apiError.status}
        onRetry={() => {
          void versions.refetch();
        }}
      />
    );
  }

  const rows = versions.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {viewing !== null ? (
        <VersionReader
          profileId={profile.id}
          versionNo={viewing}
          currentVersionNo={profile.currentVersionNo}
          onBack={() => setViewing(null)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold leading-6 tracking-[-0.01em]">Version history</h2>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                Every saved edit creates a new version.
              </p>
            </div>
          </div>
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-1)]">
          <Table>
            <caption className="sr-only">Profile versions</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[38px] px-3">Version</TableHead>
                <TableHead className="h-[38px] px-3">Change</TableHead>
                <TableHead className="hidden h-[38px] px-3 sm:table-cell">Updated by</TableHead>
                <TableHead className="h-[38px] px-3">Updated</TableHead>
                <TableHead className="h-[38px] px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No versions yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.versionNo}>
                    <TableCell className="whitespace-nowrap px-3">
                      <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-xs font-semibold tabular-nums">
                        v{item.versionNo}
                      </span>
                      {item.versionNo === profile.currentVersionNo ? (
                        <Badge variant="success" dot={false} size="sm" className="ml-1">
                          Latest
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[230px] truncate px-3">{item.changeNote || "—"}</TableCell>
                    <TableCell className="hidden max-w-[230px] px-3 sm:table-cell">
                      <span className="block truncate font-mono text-muted-foreground" title={item.createdBy || undefined}>
                        {item.createdBy || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 text-muted-foreground tabular-nums">
                      {formatProfileWhen(item.createdAt)}
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setViewing(item.versionNo)}
                         size="sm">
                          Open
                        </Button>
                        {item.versionNo === profile.currentVersionNo ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setNote("");
                              setRestoreTarget(item.versionNo);
                            }}
                           size="sm">
                            Restore
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </section>
        </>
      )}

      <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-1)]">
        <h2 className="text-base font-semibold leading-6 tracking-[-0.01em]">Compare versions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="diff-from">From</Label>
            <Select value={fromVersion} onValueChange={setFromVersion}>
              <SelectTrigger id="diff-from" className="h-11" aria-label="From version">
                <SelectValue placeholder="Choose a version" />
              </SelectTrigger>
              <SelectContent>
                {rows.map((item) => (
                  <SelectItem key={item.versionNo} value={String(item.versionNo)}>
                    Version {item.versionNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diff-to">To</Label>
            <Select value={toVersion} onValueChange={setToVersion}>
              <SelectTrigger id="diff-to" className="h-11" aria-label="To version">
                <SelectValue placeholder="Choose a version" />
              </SelectTrigger>
              <SelectContent>
                {rows.map((item) => (
                  <SelectItem key={item.versionNo} value={String(item.versionNo)}>
                    Version {item.versionNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          disabled={!fromVersion || !toVersion || fromVersion === toVersion}
          onClick={() => setCompare(true)}
         size="sm">
          Compare
        </Button>
        {compare && from !== null && to !== null && from !== to ? (
          <DiffList
            pending={diff.isLoading}
            error={diff.isError ? diff.error : null}
            rows={diff.data ? mapDiffForDisplay(diff.data.changes) : []}
            onRetry={() => {
              void diff.refetch();
            }}
          />
        ) : null}
      </div>

      <Dialog open={restoreTarget !== null} onOpenChange={(open) => !restore.isPending && !open && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="tracking-tight text-slate-900">Restore as a new version</DialogTitle>
            <DialogDescription className="text-sm font-normal text-slate-500">
              Version {restoreTarget} will be saved as the next version. The current version stays in the history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="restore-note">Change note</Label>
            <Textarea
              id="restore-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note"
              rows={3}
              className="focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={restore.isPending} onClick={() => setRestoreTarget(null)} size="sm">
              Cancel
            </Button>
            <Button
              type="button"
              loading={restore.isPending}
              onClick={() => {
                if (restoreTarget === null) return;
                const changeNote = note.trim();
                restore.mutate(
                  { versionNo: restoreTarget, ...(changeNote ? { changeNote } : {}) },
                  {
                    onSuccess: () => {
                      toast.success("Version restored");
                      setRestoreTarget(null);
                      setViewing(null);
                    },
                    onError: (error) => toast.error(parseApiError(error).message),
                  }
                );
              }}
             size="sm">
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VersionReader({
  profileId,
  versionNo,
  currentVersionNo,
  onBack,
}: {
  profileId: string;
  versionNo: number;
  currentVersionNo: number;
  onBack: () => void;
}) {
  const version = useProfileVersion(profileId, versionNo);
  const template = useFormTemplate(version.data?.templateCode ?? "", version.data?.templateVersion);
  const current = versionNo === currentVersionNo;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" className="w-fit" onClick={onBack} size="sm">
          Back to history
        </Button>
        {current ? null : (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            You are viewing version {versionNo}. The current version is {currentVersionNo}.
          </p>
        )}
      </div>
      {version.isLoading || template.isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" aria-busy="true">
          <p className="sr-only">Loading version</p>
        </div>
      ) : null}
      {version.isError ? (
        <ErrorState
          compact
          title="Unable to load this version"
          message={parseApiError(version.error).message}
          status={parseApiError(version.error).status}
          onRetry={() => {
            void version.refetch();
          }}
        />
      ) : null}
      {template.isError ? (
        <ErrorState
          compact
          title="Unable to load the form"
          message={parseApiError(template.error).message}
          onRetry={() => {
            void template.refetch();
          }}
        />
      ) : null}
      {version.data && template.data ? (
        <ProfileOverview templates={template.data} data={version.data.data} />
      ) : null}
    </div>
  );
}

function DiffList({
  pending,
  error,
  rows,
  onRetry,
}: {
  pending: boolean;
  error: unknown;
  rows: { path: string; before: string; after: string }[];
  onRetry: () => void;
}) {
  if (pending) {
    return (
      <div className="h-24 animate-pulse rounded-lg bg-muted" aria-busy="true">
        <p className="sr-only">Comparing versions</p>
      </div>
    );
  }
  if (error) {
    return (
      <ErrorState compact title="Unable to compare versions" message={parseApiError(error).message} onRetry={onRetry} />
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        These versions have no differences.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.path} className="rounded-lg border border-slate-100 p-4">
          <p className="font-mono text-xs font-medium text-slate-900">{row.path}</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Before</dt>
              <dd className="mt-1 break-words text-sm text-slate-700">{row.before}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">After</dt>
              <dd className="mt-1 break-words text-sm text-slate-700">{row.after}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
