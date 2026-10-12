"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Check, Copy, FileText, Link2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parseApiError } from "@/lib/api-error";
import { createShare } from "../api/documentsApi";
import { DOCUMENT_DIALOG_CLASS, EXPIRY_PRESETS } from "../utils/constants";
import { toPublicShareLink } from "../shared-recipient/links";
import { shareBatchMessage } from "../utils/format";
import { SHARE_FORM_DEFAULTS, shareFormSchema, toSharePayload, type ShareFormValues } from "../utils/validation";

export interface ShareDialogDocument {
  id: string;
  name: string;
  typeName: string;
  fileName?: string;
  tag?: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: ShareDialogDocument[];
}

interface SharedLink {
  id: string;
  name: string;
  typeName: string;
  fileName?: string;
  tag?: string;
  url: string;
}

function fileSubtitle(document: { name: string; typeName: string; fileName?: string }): string {
  const fileName = document.fileName?.trim() ?? "";
  if (fileName && fileName !== document.typeName) return fileName;
  const name = document.name.trim();
  if (name && name !== document.typeName) return name;
  return fileName;
}

function documentCaption(document: ShareDialogDocument): string {
  const type = document.typeName ? `Type ${document.typeName}` : "";
  const tag = document.tag ? `Tag ${document.tag}` : "";
  return [type, tag].filter(Boolean).join(" · ");
}

function documentLabel(document: ShareDialogDocument): string {
  const caption = documentCaption(document);
  return caption ? `${document.name} · ${caption}` : document.name;
}

export function ShareDialog({ open, onOpenChange, documents }: ShareDialogProps) {
  if (!open || documents.length === 0) return null;
  return <ShareDialogForm onOpenChange={onOpenChange} documents={documents} />;
}

function ShareDialogForm({ onOpenChange, documents }: Omit<ShareDialogProps, "open">) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<ShareFormValues["expiresInDays"]>("7");
  const [allowDownload, setAllowDownload] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[] | null>(null);
  const [sharedWith, setSharedWith] = useState<{ name: string; email: string } | null>(null);
  const [sentMessage, setSentMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: SHARE_FORM_DEFAULTS,
  });

  const emailError = form.formState.errors.email?.message;

  const copyText = async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const readyCount = sharedLinks?.filter((item) => item.url).length ?? 0;

  return (
    <Dialog open onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        className={DOCUMENT_DIALOG_CLASS}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        {sharedLinks ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-success-soft text-success-strong">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <DialogTitle className="tracking-tight text-foreground">Documents shared</DialogTitle>
              </div>
              {sentMessage ? <p className="text-sm text-warning-strong">{sentMessage}</p> : null}
            </DialogHeader>
            <p className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-normal text-foreground" role="status">
              Following document(s) has been shared with {sharedWith?.name} on email {sharedWith?.email}
            </p>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {sharedLinks.map((item) => (
                <li key={item.id} className="bg-card px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-4 tracking-tight text-foreground">{item.typeName}</p>
                      {fileSubtitle(item) ? (
                        <p className="truncate text-xs font-normal leading-4 text-muted-foreground">{fileSubtitle(item)}</p>
                      ) : null}
                    </div>
                    {item.tag ? (
                      <Badge variant="secondary" dot={false} className="max-w-[7.5rem]">
                        <span className="truncate">Tag {item.tag}</span>
                      </Badge>
                    ) : null}
                    {item.url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-primary"
                        aria-label={copiedKey === item.id ? "Copied" : "Copy link"}
                        onClick={() => void copyText(item.id, item.url)}
                      >
                        {copiedKey === item.id ? <Check /> : <Copy />}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Created</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={readyCount === 0}
                onClick={() =>
                  void copyText(
                    "all",
                    (sharedLinks ?? [])
                      .filter((item) => item.url)
                      .map((item) => `${item.name}\n${item.url}`)
                      .join("\n\n")
                  )
                }
               size="sm">
                {copiedKey === "all" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {copiedKey === "all" ? "Copied" : "Copy all links"}
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)} size="sm">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="tracking-tight text-foreground">Share securely</DialogTitle>
          </div>
        </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              const payload = toSharePayload({ ...values, expiresInDays, allowDownload });
              form.clearErrors("root");
              setPending(true);
              try {
                type ShareAttempt =
                  | { status: "ok"; document: ShareDialogDocument; created: Awaited<ReturnType<typeof createShare>> }
                  | { status: "error"; document: ShareDialogDocument; error: unknown };
                const outcomes: ShareAttempt[] = await Promise.all(
                  documents.map(async (document) => {
                    try {
                      const created = await createShare(document.id, payload);
                      return { status: "ok" as const, document, created };
                    } catch (error) {
                      return { status: "error" as const, document, error };
                    }
                  })
                );
                if (outcomes.some((item) => item.status === "error" && parseApiError(item.error).status === 401)) {
                  return;
                }
                const succeeded: {
                  id: string;
                  name: string;
                  typeName: string;
                  fileName?: string;
                  tag?: string;
                  created: Awaited<ReturnType<typeof createShare>>;
                }[] = [];
                const failedNames: string[] = [];
                for (const item of outcomes) {
                  if (item.status === "ok") {
                    succeeded.push({
                      id: item.document.id,
                      name: item.document.name,
                      typeName: item.document.typeName,
                      fileName: item.document.fileName,
                      tag: item.document.tag,
                      created: item.created,
                    });
                  } else {
                    failedNames.push(documentLabel(item.document));
                  }
                }
                if (succeeded.length === 0) {
                  form.setError("root", {
                    message:
                      documents.length > 1
                        ? "Couldn't share these documents. Please try again."
                        : "Couldn't share this document. Please try again.",
                  });
                  return;
                }
                await Promise.all(
                  succeeded.map((item) => queryClient.invalidateQueries({ queryKey: ["shares", item.id] }))
                );
                setSharedWith({
                  name: payload.recipientName,
                  email: payload.email ?? "",
                });
                setSentMessage(
                  failedNames.length > 0
                    ? shareBatchMessage(succeeded.length, failedNames, succeeded[0]?.created ?? {}, {
                        email: payload.email,
                        phone: payload.phone,
                      })
                    : ""
                );
                setSharedLinks(
                  succeeded.map((item) => ({
                    id: item.id,
                    name: item.name,
                    typeName: item.typeName,
                    fileName: item.fileName,
                    tag: item.tag,
                    url: toPublicShareLink(item.created.url, item.created.token),
                  }))
                );
              } finally {
                setPending(false);
              }
            })}
          >
            <div className="space-y-4">
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {documents.map((document) => (
                  <li key={document.id} className="bg-card px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-4 tracking-tight text-foreground">
                          {document.typeName}
                        </p>
                        {fileSubtitle(document) ? (
                          <p className="truncate text-xs font-normal leading-4 text-muted-foreground">
                            {fileSubtitle(document)}
                          </p>
                        ) : null}
                      </div>
                      {document.tag ? (
                        <Badge variant="secondary" dot={false} className="max-w-[7.5rem]">
                          <span className="truncate">Tag {document.tag}</span>
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-name`}>Recipient name</Label>
                <Input
                  id={`${formId}-name`}
                  autoComplete="name"
                  className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  aria-invalid={!!form.formState.errors.recipientName}
                  {...form.register("recipientName")}
                />
                {form.formState.errors.recipientName ? (
                  <p className="text-sm text-destructive">{form.formState.errors.recipientName.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-email`}>Email</Label>
                <Input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  aria-invalid={!!emailError}
                  {...form.register("email")}
                />
                {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">Link expiry</legend>
                <RadioGroup
                  value={expiresInDays}
                  onValueChange={(value) => {
                    const next = value as ShareFormValues["expiresInDays"];
                    setExpiresInDays(next);
                    form.setValue("expiresInDays", next, { shouldValidate: true });
                  }}
                  className="flex flex-wrap gap-4"
                >
                  {EXPIRY_PRESETS.map((preset) => (
                    <label
                      key={preset.value}
                      htmlFor={`${formId}-expiry-${preset.value}`}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                    >
                      <RadioGroupItem value={preset.value} id={`${formId}-expiry-${preset.value}`} />
                      {preset.label}
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>

              <label className="flex h-11 items-center gap-3 text-sm font-medium text-foreground">
                <Checkbox
                  checked={allowDownload}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setAllowDownload(next);
                    form.setValue("allowDownload", next);
                  }}
                />
                <span>Allow download</span>
              </label>

              <div className="space-y-2">
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-4 transition-all duration-200 ease-out hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  aria-expanded={advanced}
                  onClick={() => {
                    setAdvanced((current) => {
                      if (current) form.setValue("password", "");
                      return !current;
                    });
                  }}
                >
                  Advanced: protect with a password
                </button>
                {advanced ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${formId}-password`}>Password</Label>
                    <Input
                      id={`${formId}-password`}
                      type="password"
                      autoComplete="new-password"
                      className="h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-invalid={!!form.formState.errors.password}
                      {...form.register("password")}
                    />
                    {form.formState.errors.password ? (
                      <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {form.formState.errors.root ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
               size="sm">
                Close
              </Button>
              <Button type="submit" loading={pending} size="sm">
                Share
              </Button>
            </DialogFooter>
          </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
