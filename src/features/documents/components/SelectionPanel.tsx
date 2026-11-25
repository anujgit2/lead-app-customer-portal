"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zipSync, type Zippable } from "fflate";
import { Download, FileText, Package, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseApiError } from "@/lib/api-error";
import { formatFileSize } from "@/lib/utils";
import { deleteDocument, downloadDocumentFile, fileErrorMessage } from "../api/documentsApi";
import type { PortalDocument } from "../types";
import { DOCUMENT_DIALOG_CLASS } from "../utils/constants";
import { formatDisplayDate, safeFileName } from "../utils/format";
import { ShareDialog } from "./ShareDialog";

interface SelectionPanelProps {
  documents: PortalDocument[];
  onClear: () => void;
  onDeleted: (ids: string[]) => void;
}

type BusyState = { action: "download" | "delete"; done: number; total: number } | null;

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "document";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function displayName(document: PortalDocument): string {
  return document.fileName?.trim() || document.typeName;
}

/** Keeps archive entry names unique when two selected files share a name. */
function uniqueEntryName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let index = 2; ; index += 1) {
    const candidate = `${base} (${index})${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

export function SelectionPanel({ documents, onClear, onDeleted }: SelectionPanelProps) {
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState<BusyState>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const totalBytes = useMemo(() => documents.reduce((sum, document) => sum + (document.sizeBytes ?? 0), 0), [documents]);
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of documents) {
      counts.set(document.typeName, (counts.get(document.typeName) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [documents]);
  const categories = useMemo(
    () => [...new Set(documents.map((document) => document.category).filter(Boolean))],
    [documents],
  );
  const total = documents.length;

  async function downloadAsZip() {
    setMessage(null);
    const entries: Zippable = {};
    const used = new Set<string>();
    let added = 0;
    let lastError = "";
    for (const document of documents) {
      setBusy({ action: "download", done: added, total });
      try {
        const file = await downloadDocumentFile(document.id, document.latestVersion, displayName(document));
        const name = uniqueEntryName(safeFileName(file.fileName || displayName(document)), used);
        entries[name] = new Uint8Array(await file.blob.arrayBuffer());
        added += 1;
      } catch (error) {
        lastError = fileErrorMessage(error, "download");
        // Stop on the plan limit so the remaining files are not attempted.
        if (parseApiError(error).status === 402) break;
      }
    }
    if (added === 0) {
      setBusy(null);
      setMessage({ tone: "error", text: lastError || "No files could be downloaded." });
      return;
    }
    const archive = zipSync(entries);
    const stamp = new Date().toISOString().slice(0, 10);
    saveBlob(new Blob([archive], { type: "application/zip" }), `documents-${stamp}.zip`);
    setBusy(null);
    if (added === total) {
      setMessage({ tone: "ok", text: `Zipped ${added} ${added === 1 ? "file" : "files"}.` });
    } else {
      setMessage({ tone: "error", text: `Zipped ${added} of ${total}. ${lastError}` });
    }
  }

  async function downloadAll() {
    setMessage(null);
    let saved = 0;
    let lastError = "";
    for (const document of documents) {
      setBusy({ action: "download", done: saved, total });
      try {
        const file = await downloadDocumentFile(document.id, document.latestVersion, displayName(document));
        saveBlob(file.blob, file.fileName ?? displayName(document));
        saved += 1;
      } catch (error) {
        lastError = fileErrorMessage(error, "download");
        // Stop on the plan limit so the remaining files are not attempted.
        if (parseApiError(error).status === 402) break;
      }
    }
    setBusy(null);
    if (saved === total) {
      setMessage({ tone: "ok", text: `Downloaded ${saved} ${saved === 1 ? "file" : "files"}.` });
    } else {
      setMessage({ tone: "error", text: `Downloaded ${saved} of ${total}. ${lastError}` });
    }
  }

  async function deleteAll() {
    setConfirmDeleteOpen(false);
    setMessage(null);
    setBusy({ action: "delete", done: 0, total });
    const results = await Promise.allSettled(documents.map((document) => deleteDocument(document.id)));
    const removed = documents.filter((_, index) => results[index].status === "fulfilled").map((document) => document.id);
    const failed = total - removed.length;
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    setBusy(null);
    if (removed.length > 0) onDeleted(removed);
    if (failed === 0) {
      setMessage({ tone: "ok", text: `Deleted ${removed.length} ${removed.length === 1 ? "file" : "files"}.` });
    } else {
      setMessage({ tone: "error", text: `Deleted ${removed.length} of ${total}. ${failed} could not be deleted. Try again.` });
    }
  }

  const disabled = busy !== null;

  return (
    <div className="flex min-w-0 flex-col gap-4" role="region" aria-label="Selected documents">
      <div>
        <p className="text-[14px] font-semibold text-foreground">
          {total} {total === 1 ? "file" : "files"} selected
        </p>
        <p className="text-[12px] text-muted-foreground">
          {formatFileSize(totalBytes)} total
          {categories.length > 0 ? ` · ${categories.join(", ")}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Selected document types">
        {typeCounts.map(([name, count]) => (
          <span key={name} className="pill neu">
            {name}
            {count > 1 ? ` × ${count}` : ""}
          </span>
        ))}
      </div>

      <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border" aria-label="Selected file names">
        {documents.map((document) => (
          <li key={document.id} className="flex items-start gap-2.5 px-3 py-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-foreground">{displayName(document)}</span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {document.category ? `${document.category} · ` : ""}
                {document.typeName} · v{document.latestVersion} · {formatDisplayDate(document.updatedAt)}
                {document.sizeBytes ? ` · ${formatFileSize(document.sizeBytes)}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void downloadAsZip()}>
          <Package aria-hidden="true" />
          Download ZIP
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void downloadAll()}>
          <Download aria-hidden="true" />
          Download files
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setShareOpen(true)}>
          <Share2 aria-hidden="true" />
          Share
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={() => setConfirmDeleteOpen(true)}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </div>

      {busy ? (
        <p className="text-[12px] text-muted-foreground" role="status">
          {busy.action === "download"
            ? `Downloading ${Math.min(busy.done + 1, busy.total)} of ${busy.total}…`
            : `Deleting ${busy.total} ${busy.total === 1 ? "file" : "files"}…`}
        </p>
      ) : null}

      {message ? (
        <p className={message.tone === "error" ? "text-[12px] text-danger-strong" : "text-[12px] text-muted-foreground"} role="status">
          {message.text}
        </p>
      ) : null}

      <button type="button" className="self-start text-[12px] font-medium text-primary hover:underline" onClick={onClear} disabled={disabled}>
        Clear selection
      </button>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        documents={documents.map((document) => ({
          id: document.id,
          name: displayName(document),
          fileName: document.fileName,
          typeName: document.typeName,
          tag: document.label || undefined,
        }))}
      />

      <Dialog open={confirmDeleteOpen} onOpenChange={(next) => !busy && setConfirmDeleteOpen(next)}>
        <DialogContent className={DOCUMENT_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle className="tracking-tight text-foreground">
              Delete {total} {total === 1 ? "file" : "files"}?
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-muted-foreground">
              The selected files will be removed from your documents.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 overflow-y-auto text-[13px] text-foreground">
            {documents.map((document) => (
              <li key={document.id} className="truncate py-0.5">
                {displayName(document)}
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void deleteAll()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
