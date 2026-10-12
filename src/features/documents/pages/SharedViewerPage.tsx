"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchSharedDownload,
  fetchSharedView,
  SharedRequestError,
  unlockSharedDocument,
} from "../api/sharedApi";
import { useSharedLookup } from "../api/sharedQueries";
import { FilePreview } from "../components/FilePreview";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { useShareToken } from "../hooks/usePathSegment";
import {
  formatDisplayDate,
  isLockout,
  previewKind,
  safeFileName,
  shareCacheKey,
  unavailableCopy,
} from "../utils/format";

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(fileName);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SharedViewerPage() {
  const route = useShareToken();
  const token = route.value ?? "";
  const lookup = useSharedLookup(token);
  const [unlocked, setUnlocked] = useState(false);
  const [grant, setGrant] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const meta = lookup.data?.available ? lookup.data.meta : undefined;
  const needsPassword = !!meta?.requiresPassword && !unlocked;
  const preview = useQuery({
    queryKey: ["shared-preview", shareCacheKey(token), unlocked],
    queryFn: () => fetchSharedView(token, grant),
    enabled: !!meta && !needsPassword,
    retry: false,
    staleTime: Infinity,
  });
  const previewUrl = useObjectUrl(preview.data?.blob);
  const kind = preview.data
    ? previewKind(preview.data.contentType, preview.data.fileName || meta?.fileName || "")
    : null;

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setUnlocking(true);
    try {
      const result = await unlockSharedDocument(token, password);
      setGrant(result.grant);
      setPassword("");
      setUnlocked(true);
    } catch (error) {
      if (error instanceof SharedRequestError && isLockout(error.status, error.code)) {
        setLockedOut(true);
      } else {
        setPasswordError("That password is incorrect.");
      }
    } finally {
      setUnlocking(false);
    }
  };

  const download = async () => {
    if (!meta?.allowDownload) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const file = await fetchSharedDownload(token, grant);
      saveBlob(file.blob, file.fileName || meta.fileName || meta.documentName);
    } catch (error) {
      if (error instanceof SharedRequestError && (error.status === 404 || error.status === 410)) {
        setDownloadError("This link is no longer available.");
      } else {
        setDownloadError("Download failed. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const waiting =
    !route.ready || (!!token && lookup.isPending && !lookup.data && !lookup.isError);

  return (
    <div className="min-h-screen bg-muted/50">
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex" />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">Shared document</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {route.ready && !token ? <Unavailable reason="invalid" /> : null}

        {waiting ? (
          <div className="space-y-3 rounded-xl border border-border bg-card p-8 shadow-sm" aria-busy="true">
            <p className="sr-only">Loading shared document</p>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : null}

        {lookup.isError ? (
          <section className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">We couldn&apos;t open this link</h1>
            <p className="mt-2 text-sm font-normal text-muted-foreground">Check your connection and try again.</p>
            <Button type="button" className="mt-6 h-8" onClick={() => void lookup.refetch()} size="sm">
              Try again
            </Button>
          </section>
        ) : null}

        {lookup.data && !lookup.data.available ? <Unavailable reason={lookup.data.reason} /> : null}

        {meta && (needsPassword || lockedOut) ? (
          <section className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{meta.documentName}</h1>
            <p className="mt-2 text-sm font-normal text-muted-foreground">
              {meta.sharedBy ? `Shared by ${meta.sharedBy}. ` : ""}
              Enter the password to view it.
            </p>
            {lockedOut ? (
              <p className="mt-4 text-sm text-foreground" role="alert">
                Too many attempts. Please wait and try again later.
              </p>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={(event) => void unlock(event)}>
                <div className="space-y-2">
                  <Label htmlFor="share-password">Password</Label>
                  <Input
                    id="share-password"
                    type="password"
                    name="share-password"
                    autoComplete="off"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    aria-invalid={!!passwordError}
                  />
                  {passwordError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {passwordError}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" className="w-full" loading={unlocking} disabled={!password} size="sm">
                  Unlock
                </Button>
              </form>
            )}
          </section>
        ) : null}

        {meta && !needsPassword && !lockedOut ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{meta.documentName}</h1>
              <p className="text-sm font-normal text-muted-foreground">
                {meta.sharedBy ? `Shared by ${meta.sharedBy}` : "Shared with you"}
                {meta.expiresAt ? ` · Available until ${formatDisplayDate(meta.expiresAt)}` : ""}
              </p>
            </div>

            {preview.isLoading ? (
              <div className="h-80 animate-pulse rounded-xl bg-card shadow-sm" aria-busy="true">
                <p className="sr-only">Preparing preview</p>
              </div>
            ) : null}

            {preview.isError ? (
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-foreground" role="alert">
                  We couldn&apos;t load the preview.
                </p>
                <Button type="button" variant="outline" className="mt-4 h-8" onClick={() => void preview.refetch()} size="sm">
                  Try again
                </Button>
              </div>
            ) : null}

            {previewUrl && kind ? <FilePreview kind={kind} url={previewUrl} title={meta.documentName} /> : null}

            {preview.data && !kind ? (
              <p className="text-sm text-muted-foreground">This file can&apos;t be shown here.</p>
            ) : null}

            {meta.allowDownload ? (
              <div className="space-y-2">
                <Button type="button" className="w-full gap-2 sm:w-auto" loading={downloading} onClick={() => void download()} size="sm">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {downloadError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {downloadError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm font-normal text-muted-foreground">View only</p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Unavailable({ reason }: { reason: "expired" | "revoked" | "invalid" }) {
  const copy = unavailableCopy(reason);
  return (
    <section className="rounded-xl border border-border bg-card p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
      <p className="mt-2 text-sm font-normal text-muted-foreground">{copy.message}</p>
    </section>
  );
}
