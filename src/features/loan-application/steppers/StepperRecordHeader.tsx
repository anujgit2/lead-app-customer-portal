"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Database, FileText, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperRecordHeaderProps {
  title: string;
  applicationNumber?: string;
  applicationId?: string;
  savedLabel?: string;
  saved?: boolean;
}

function visibleRecordId(id: string | undefined): string | undefined {
  if (!id || id.startsWith("draft-")) return undefined;
  return id;
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const field = document.createElement("textarea");
    field.value = value;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "inline-grid place-items-center rounded text-slate-400 transition-all duration-200 ease-out",
        "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]",
        copied && "text-primary"
      )}
      aria-label={copied ? "Copied" : label}
      title={label}
      onClick={() => {
        void copyText(value).then((ok) => {
          if (!ok) return;
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
    </button>
  );
}

function MetaChip({
  title,
  value,
  copyLabel,
  icon,
}: {
  title: string;
  value: string;
  copyLabel: string;
  icon: "id" | "record";
}) {
  const Icon = icon === "id" ? IdCard : Database;
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs leading-tight text-slate-600 max-[900px]:px-1.5 max-[900px]:py-1 max-[900px]:text-[11px]"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden />
      <strong className="break-all font-medium text-slate-600">{value}</strong>
      <CopyButton value={value} label={copyLabel} />
    </span>
  );
}

/** Stepper card header: current step, application number, and record id. */
export function StepperRecordHeader({
  title,
  applicationNumber,
  applicationId,
  savedLabel,
  saved,
}: StepperRecordHeaderProps) {
  const recordId = visibleRecordId(applicationId);
  const number = applicationNumber?.trim();

  return (
    <header className="mb-6 flex flex-wrap items-center gap-3 max-[600px]:items-start max-[600px]:gap-2">
      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-primary-soft text-primary max-[600px]:h-8 max-[600px]:w-8">
        <FileText className="h-5 w-5 max-[600px]:h-4 max-[600px]:w-4" strokeWidth={1.8} aria-hidden />
      </span>
      <h1 className="text-[15px] font-bold tracking-tight text-foreground max-[600px]:text-[13px]">
        {title}
      </h1>
      {number || recordId ? (
        <span className="mx-0.5 h-[22px] w-px shrink-0 bg-slate-300 max-[600px]:hidden" aria-hidden />
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 max-[900px]:gap-1 max-[600px]:hidden">
        {number ? (
          <MetaChip
            title="Application readable ID"
            value={number}
            copyLabel="Copy application ID"
            icon="id"
          />
        ) : null}
        {recordId ? (
          <MetaChip
            title="Database unique ID"
            value={recordId}
            copyLabel="Copy database unique ID"
            icon="record"
          />
        ) : null}
      </div>
      {savedLabel ? (
        <span
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          aria-live="polite"
        >
          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {savedLabel}
        </span>
      ) : null}
    </header>
  );
}
