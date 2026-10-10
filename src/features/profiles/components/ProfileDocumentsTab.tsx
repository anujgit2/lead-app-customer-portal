"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDialog } from "@/features/documents/components/UploadDialog";
import { useDocuments } from "@/features/documents/api/queries";
import { useLinkDocumentProfile } from "@/features/documents/api/queries";
import { useDebouncedValue } from "@/features/documents/hooks/useDebouncedValue";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { CustomerProfileDetail, DocumentProfileRelation } from "@/types";
import { documentRelationLabel } from "../utils/display";

interface ProfileDocumentsTabProps {
  profile: CustomerProfileDetail;
}

export function ProfileDocumentsTab({ profile }: ProfileDocumentsTabProps) {
  const [relation, setRelation] = useState<"ALL" | DocumentProfileRelation>("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const documents = useDocuments({
    profileId: profile.id,
    ...(relation === "ALL" ? {} : { relation }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto" role="toolbar" aria-label="Document relation">
          {(
            [
              ["ALL", "All"],
              ["RELATED_TO", "Related to"],
              ["FOR", "For"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={relation === id}
              onClick={() => setRelation(id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                relation === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-slate-100 bg-white text-muted-foreground shadow-sm"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" className="h-11" onClick={() => setLinkOpen(true)}>
            Link existing
          </Button>
          <Button type="button" className="h-11" onClick={() => setUploadOpen(true)}>
            Upload
          </Button>
        </div>
      </div>

      {documents.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <p className="sr-only">Loading documents</p>
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : null}
      {documents.isError ? (
        <ErrorState
          compact
          title="Unable to load documents"
          message={parseApiError(documents.error).message}
          onRetry={() => {
            void documents.refetch();
          }}
        />
      ) : null}
      {!documents.isLoading && !documents.isError && (documents.data?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-card p-6 text-sm text-muted-foreground shadow-sm" role="status">
          No documents are linked to this profile.
        </p>
      ) : null}
      <ul className="space-y-3">
        {(documents.data ?? []).map((document) => {
          const linked = document.linked?.find((item) => item.profileId === profile.id);
          return (
            <li key={document.id}>
              <Link
                href={`/documents/${document.id}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-card p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block font-semibold tracking-tight text-slate-900">{document.typeName}</span>
                  {document.label ? (
                    <span className="mt-1 block text-sm text-muted-foreground">{document.label}</span>
                  ) : null}
                </span>
                {linked ? <Badge variant="secondary">{documentRelationLabel(linked.relation)}</Badge> : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        presetProfile={{
          profileId: profile.id,
          displayName: profile.displayName || "This profile",
          relation: relation === "ALL" ? "RELATED_TO" : relation,
        }}
      />
      {linkOpen ? <LinkExistingDialog profileId={profile.id} onOpenChange={setLinkOpen} /> : null}
    </div>
  );
}

function LinkExistingDialog({
  profileId,
  onOpenChange,
}: {
  profileId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [relation, setRelation] = useState<DocumentProfileRelation>("RELATED_TO");
  const [documentId, setDocumentId] = useState("");
  const query = useDebouncedValue(search, 300).trim();
  const filters = useMemo(() => ({ ...(query ? { q: query } : {}) }), [query]);
  const documents = useDocuments(filters);
  const link = useLinkDocumentProfile();

  return (
    <Dialog open onOpenChange={(next) => !link.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">Link an existing document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="existing-relation">Relation</Label>
            <Select value={relation} onValueChange={(value) => setRelation(value as DocumentProfileRelation)}>
              <SelectTrigger id="existing-relation" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RELATED_TO">Related to</SelectItem>
                <SelectItem value="FOR">For</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            startAdornment={<Search className="h-4 w-4" />}
            className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {documents.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {parseApiError(documents.error).message}
            </p>
          ) : null}
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {(documents.data ?? []).map((document) => (
              <li key={document.id}>
                <button
                  type="button"
                  aria-pressed={documentId === document.id}
                  onClick={() => setDocumentId(document.id)}
                  className="w-full rounded-lg border border-slate-100 px-3 py-2 text-left text-sm transition-all duration-200 ease-out hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 aria-pressed:border-primary aria-pressed:bg-primary/5"
                >
                  <span className="font-medium text-slate-900">{document.typeName}</span>
                  {document.label ? <span className="mt-0.5 block text-slate-500">{document.label}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={!documentId}
            loading={link.isPending}
            onClick={() => {
              link.mutate(
                { documentId, profileId, relation },
                {
                  onSuccess: () => {
                    toast.success("Document linked");
                    onOpenChange(false);
                  },
                  onError: (error) => toast.error(parseApiError(error).message),
                }
              );
            }}
          >
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
