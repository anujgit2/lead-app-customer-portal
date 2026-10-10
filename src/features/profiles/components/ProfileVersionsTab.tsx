"use client";

import { useState } from "react";
import { toast } from "sonner";
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
    <div className="space-y-6">
      {viewing !== null ? (
        <VersionReader
          profileId={profile.id}
          versionNo={viewing}
          currentVersionNo={profile.currentVersionNo}
          onBack={() => setViewing(null)}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No versions yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.versionNo}>
                    <TableCell className="font-medium">
                      {item.versionNo}
                      {item.versionNo === profile.currentVersionNo ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Current</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.createdBy || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatProfileWhen(item.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{item.changeNote || "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          onClick={() => setViewing(item.versionNo)}
                        >
                          Open
                        </Button>
                        {item.versionNo === profile.currentVersionNo ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11"
                            onClick={() => {
                              setNote("");
                              setRestoreTarget(item.versionNo);
                            }}
                          >
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
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-100 bg-card p-6 shadow-sm">
        <h2 className="font-semibold tracking-tight text-slate-900">Compare versions</h2>
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
          className="h-11"
          disabled={!fromVersion || !toVersion || fromVersion === toVersion}
          onClick={() => setCompare(true)}
        >
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
            <Button type="button" variant="outline" className="h-11" disabled={restore.isPending} onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11"
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
            >
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
  const template = useFormTemplate(version.data?.templateCode ?? "");
  const current = versionNo === currentVersionNo;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" className="h-11 w-fit" onClick={onBack}>
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
        <ProfileOverview template={template.data} data={version.data.data} />
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
