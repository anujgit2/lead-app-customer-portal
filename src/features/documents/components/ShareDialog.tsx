"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Check, Copy, FileText, Link2, Mail, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { createShare } from "../api/documentsApi";
import { EXPIRY_PRESETS } from "../utils/constants";
import { toPublicShareLink } from "../shared-recipient/links";
import { shareBatchMessage } from "../utils/format";
import { SHARE_FORM_DEFAULTS, shareFormSchema, toSharePayload, type ShareFormValues } from "../utils/validation";

export interface ShareDialogDocument {
  id: string;
  name: string;
  typeName: string;
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
  tag?: string;
  url: string;
}

const SHARE_DIALOG_CLASS =
  "bottom-0 left-0 right-0 top-auto flex max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none rounded-t-[20px] border-0 bg-white p-0 text-[#151a27] shadow-[0_24px_60px_rgba(21,26,39,0.28)] sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-h-[min(90vh,700px)] sm:w-[calc(100%-1.5rem)] sm:max-w-[520px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[20px] [&>button]:hidden";

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
  const [sentTo, setSentTo] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: SHARE_FORM_DEFAULTS,
  });

  const emailError = form.formState.errors.email?.message;
  const countLabel = documents.length === 1 ? "1 document" : `${documents.length} documents`;

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
  const readyLabel =
    readyCount === 1 ? "1 secure link is ready to send." : `${readyCount} secure links are ready to send.`;

  return (
    <Dialog open onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        className={SHARE_DIALOG_CLASS}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-[#cdd3df] sm:hidden" aria-hidden="true" />
        {sharedLinks ? (
          <>
            <div className="flex shrink-0 items-start gap-3.5 px-6 pb-4 pt-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e3f5ec] text-[#0b7a47]">
                <ShieldCheck className="h-[22px] w-[22px]" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <DialogTitle className="text-xl font-bold tracking-tight text-[#151a27]">Documents shared</DialogTitle>
                <DialogDescription className="mt-1 text-sm font-normal text-[#556075]" role="status">
                  {readyLabel}
                </DialogDescription>
                {sentMessage ? <p className="mt-1 text-sm text-[#a15c00]">{sentMessage}</p> : null}
              </div>
              <DialogClose className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[#556075] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#f3f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]">
                <X className="h-[18px] w-[18px]" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
            {sentTo ? (
              <div className="mx-6 mb-4 flex items-center gap-2.5 rounded-xl bg-[#f3f5f9] px-3.5 py-3">
                <Mail className="h-[18px] w-[18px] shrink-0 text-[#556075]" />
                <span className="text-[13px] text-[#556075]">Sent to</span>
                <span className="min-w-0 truncate text-sm font-medium text-[#151a27]">{sentTo}</span>
              </div>
            ) : null}
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-1">
              {sharedLinks.map((item) => (
                <li key={item.id} className="rounded-[14px] border border-[#e0e4ec] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e8eefc] text-[#2457d6]">
                      <FileText className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-[#151a27]">{item.name}</p>
                      <p className="mt-0.5 truncate text-[13px] font-normal text-[#556075]">Type: {item.typeName}</p>
                    </div>
                    {item.tag ? (
                      <span className="max-w-[7.5rem] shrink-0 truncate rounded-full bg-[#f3f5f9] px-2.5 py-1 text-xs font-medium text-[#3a4357]">
                        Tag {item.tag}
                      </span>
                    ) : null}
                    {item.url ? (
                      <button
                        type="button"
                        className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-bold text-[#2457d6] transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]"
                        onClick={() => void copyText(item.id, item.url)}
                      >
                        {copiedKey === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedKey === item.id ? "Copied" : "Copy link"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#556075]">Created</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex shrink-0 flex-col items-stretch justify-between gap-3 border-t border-[#e0e4ec] bg-[#fafbfd] px-6 py-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#cdd3df] bg-white px-4 text-sm font-medium text-[#151a27] transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
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
              >
                {copiedKey === "all" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {copiedKey === "all" ? "Copied" : "Copy all links"}
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-[10px] bg-transparent px-0 text-sm font-bold text-[#2457d6] transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] sm:w-auto sm:bg-[#2457d6] sm:px-7 sm:text-white sm:hover:bg-[#1d48b8]"
                onClick={() => onOpenChange(false)}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
        <div className="flex shrink-0 items-start gap-3.5 px-6 pb-4 pt-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8eefc] text-[#2457d6]">
            <ShieldCheck className="h-[22px] w-[22px]" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-[#151a27]">Share securely</DialogTitle>
            <DialogDescription className="mt-1 text-sm font-normal text-[#556075]">{countLabel}</DialogDescription>
          </div>
          <DialogClose
            disabled={pending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[#556075] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#f3f5f9] focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] disabled:pointer-events-none"
          >
            <X className="h-[18px] w-[18px]" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
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
                setSentTo(succeeded[0]?.created.sentTo || payload.email || "");
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
                    tag: item.tag,
                    url: toPublicShareLink(item.created.url, item.created.token),
                  }))
                );
              } finally {
                setPending(false);
              }
            })}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
              <ul className="space-y-3">
                {documents.map((document) => (
                  <li key={document.id} className="rounded-[14px] border border-[#e0e4ec] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e8eefc] text-[#2457d6]">
                        <FileText className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-[#151a27]">{document.name}</p>
                        <p className="mt-0.5 truncate text-[13px] font-normal text-[#556075]">
                          Type: {document.typeName}
                        </p>
                      </div>
                      {document.tag ? (
                        <span className="max-w-[7.5rem] shrink-0 truncate rounded-full bg-[#f3f5f9] px-2.5 py-1 text-xs font-medium text-[#3a4357]">
                          Tag {document.tag}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-name`} className="text-[13px] font-medium text-[#556075]">
                  Recipient name
                </Label>
                <Input
                  id={`${formId}-name`}
                  autoComplete="name"
                  className="h-11 rounded-[10px] border-[#e0e4ec] focus:border-[#2457d6] focus:outline-none focus:ring-2 focus:ring-[#2457d6]/20"
                  aria-invalid={!!form.formState.errors.recipientName}
                  {...form.register("recipientName")}
                />
                {form.formState.errors.recipientName ? (
                  <p className="text-sm text-destructive">{form.formState.errors.recipientName.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-email`} className="text-[13px] font-medium text-[#556075]">
                  Email
                </Label>
                <Input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="h-11 rounded-[10px] border-[#e0e4ec] focus:border-[#2457d6] focus:outline-none focus:ring-2 focus:ring-[#2457d6]/20"
                  aria-invalid={!!emailError}
                  {...form.register("email")}
                />
                {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-[13px] font-medium text-[#556075]">Link expiry</legend>
                <RadioGroup
                  value={expiresInDays}
                  onValueChange={(value) => {
                    const next = value as ShareFormValues["expiresInDays"];
                    setExpiresInDays(next);
                    form.setValue("expiresInDays", next, { shouldValidate: true });
                  }}
                  className="grid grid-cols-3 gap-2"
                >
                  {EXPIRY_PRESETS.map((preset) => {
                    const selected = expiresInDays === preset.value;
                    return (
                      <label
                        key={preset.value}
                        className={cn(
                          "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-2 text-sm font-medium transition-all duration-200 ease-out",
                          selected
                            ? "border-[#2457d6] bg-[#e8eefc] text-[#151a27]"
                            : "border-[#e0e4ec] text-[#151a27] hover:bg-[#f3f5f9]"
                        )}
                      >
                        <RadioGroupItem value={preset.value} id={`${formId}-expiry-${preset.value}`} />
                        <span className="whitespace-nowrap">{preset.label}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </fieldset>

              <label className="flex h-11 items-center gap-3 text-sm font-medium text-[#151a27]">
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
                  className="text-sm font-medium text-[#2457d6] underline-offset-4 transition-all duration-200 ease-out hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    <Label htmlFor={`${formId}-password`} className="text-[13px] font-medium text-[#556075]">
                      Password
                    </Label>
                    <Input
                      id={`${formId}-password`}
                      type="password"
                      autoComplete="new-password"
                      className="h-11 rounded-[10px] border-[#e0e4ec] focus:border-[#2457d6] focus:outline-none focus:ring-2 focus:ring-[#2457d6]/20"
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

            <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-t border-[#e0e4ec] bg-[#fafbfd] px-6 py-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center rounded-[10px] border border-[#cdd3df] bg-white px-4 text-sm font-medium text-[#151a27] transition-all duration-200 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
              <Button
                type="submit"
                className="h-11 w-full rounded-[10px] bg-[#2457d6] px-7 text-sm font-bold hover:bg-[#1d48b8] sm:w-auto"
                loading={pending}
              >
                Share
              </Button>
            </div>
          </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
