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
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  useDigiLockerConnect,
  useDigiLockerConnection,
  useDigiLockerDocuments,
  useDocumentTypes,
  useImportDocument,
} from "../api/queries";
import type { DigiLockerDocument, DocumentType } from "../types";
import { DOCUMENT_DIALOG_CLASS } from "../utils/constants";
import { formatDisplayDate, isSafeHttpUrl } from "../utils/format";
import { DocumentTypeFields } from "./DocumentTypeFields";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadInstead: () => void;
}

function portalReturnUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/documents?import=digilocker`;
}

function openExternal(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function ImportDialog({ open, onOpenChange, onUploadInstead }: ImportDialogProps) {
  if (!open) return null;
  return (
    <ImportDialogBody
      onOpenChange={onOpenChange}
      onUploadInstead={onUploadInstead}
    />
  );
}

function ImportDialogBody({
  onOpenChange,
  onUploadInstead,
}: Omit<ImportDialogProps, "open">) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedId, setSelectedId] = useState("");
  const [category, setCategory] = useState("");
  const [typeId, setTypeId] = useState("");
  const [label, setLabel] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const portalReturn = portalReturnUrl();

  const connection = useDigiLockerConnection(portalReturn, portalReturn.length > 0);
  const documents = useDigiLockerDocuments(!!connection.data?.connected);
  const types = useDocumentTypes(true);
  const connect = useDigiLockerConnect();
  const importer = useImportDocument();
  const displayStep = connection.data?.connected && step === 1 ? 2 : step;

  const selectedType: DocumentType | undefined = types.data?.find((type) => type.id === typeId);
  const selectedDocument: DigiLockerDocument | undefined = documents.data?.find((item) => item.id === selectedId);
  const providerDown = connection.isError || !!connectError;
  const canContinue =
    !!selectedDocument && !!typeId && (!selectedType?.requiresLabel || label.trim().length > 0);

  const startConnect = async () => {
    setConnectError(null);
    try {
      const url = connection.data?.authorizationUrl || (await connect.mutateAsync(portalReturn));
      if (!url || !isSafeHttpUrl(url)) {
        setConnectError("DigiLocker is unavailable right now.");
        return;
      }
      openExternal(url);
    } catch (error) {
      if (parseApiError(error).status === 401) return;
      setConnectError("DigiLocker is unavailable right now.");
    }
  };

  const confirmImport = async () => {
    if (!selectedDocument || !typeId) return;
    try {
      await importer.mutateAsync({
        sourceDocumentId: selectedDocument.id,
        typeId,
        label: label.trim() || undefined,
      });
      toast.success("Imported from DigiLocker");
      onOpenChange(false);
    } catch (error) {
      if (parseApiError(error).status === 401) return;
      setConnectError("DigiLocker is unavailable right now.");
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !importer.isPending && onOpenChange(next)}>
      <DialogContent className={DOCUMENT_DIALOG_CLASS}>
        <DialogHeader>
          <DialogTitle className="tracking-tight text-slate-900">Import from DigiLocker</DialogTitle>
          <DialogDescription className="text-sm font-normal text-slate-500">
            Pull a verified document into your portal. It will show as Verified via DigiLocker.
          </DialogDescription>
        </DialogHeader>

        {providerDown ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">
              DigiLocker is unavailable right now.
            </p>
            <Button type="button" className="h-11" onClick={onUploadInstead}>
              Upload manually instead
            </Button>
          </div>
        ) : null}

        {!providerDown && connection.isLoading ? (
          <p className="text-sm text-slate-500" aria-busy="true">
            Checking DigiLocker…
          </p>
        ) : null}

        {!providerDown && !connection.isLoading && displayStep === 1 ? (
          <div className="space-y-4">
            <p className="text-sm font-normal text-slate-500">
              Connect DigiLocker to see documents you can import. You&apos;ll come back here afterwards.
            </p>
            <Button type="button" className="h-11" loading={connect.isPending} onClick={() => void startConnect()}>
              Connect DigiLocker
            </Button>
          </div>
        ) : null}

        {!providerDown && displayStep === 2 ? (
          <div className="space-y-6">
            {documents.isLoading ? <p className="text-sm text-slate-500">Loading documents…</p> : null}
            {documents.isError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive" role="alert">
                  DigiLocker is unavailable right now.
                </p>
                <Button type="button" className="h-11" onClick={onUploadInstead}>
                  Upload manually instead
                </Button>
              </div>
            ) : null}
            {documents.data && documents.data.length === 0 ? (
              <p className="text-sm text-slate-500">No documents are available to import.</p>
            ) : null}
            {documents.data && documents.data.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-900">Choose a document</legend>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {documents.data.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-all duration-200 ease-out",
                        selectedId === item.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100"
                      )}
                    >
                      <input
                        type="radio"
                        name="digilocker-document"
                        className="mt-1"
                        checked={selectedId === item.id}
                        onChange={() => setSelectedId(item.id)}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
                        <span className="block text-sm font-normal text-slate-500">
                          {[item.issuer, item.issuedAt ? formatDisplayDate(item.issuedAt) : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <DocumentTypeFields
              types={types.data ?? []}
              isLoading={types.isLoading}
              isError={types.isError}
              onRetry={() => void types.refetch()}
              category={category}
              typeId={typeId}
              label={label}
              onCategoryChange={(next) => {
                setCategory(next);
                setTypeId("");
              }}
              onTypeChange={setTypeId}
              onLabelChange={setLabel}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={onUploadInstead}>
                Upload manually instead
              </Button>
              <Button type="button" className="h-11" disabled={!canContinue} onClick={() => setStep(3)}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {!providerDown && displayStep === 3 && selectedDocument ? (
          <div className="space-y-5">
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{selectedDocument.name}</p>
              <p className="text-slate-500">
                {selectedType?.name}
                {label.trim() ? ` · ${label.trim()}` : ""}
              </p>
              <p className="text-slate-500">This will show as Verified via DigiLocker.</p>
            </div>
            {importer.isError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive" role="alert">
                  Couldn&apos;t import this document. Please try again.
                </p>
                <Button type="button" variant="outline" className="h-11" onClick={() => void confirmImport()}>
                  Retry
                </Button>
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="button" className="h-11" loading={importer.isPending} onClick={() => void confirmImport()}>
                Import
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
