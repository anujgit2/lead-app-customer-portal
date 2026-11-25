"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { ApplicationFormSummary } from "@/features/loan-application/ReviewScreen";
import { ApplicationStatusBadge } from "@/features/applications/ApplicationStatusBadge";
import {
  APPLICATION_STEPS,
  ApplicationProgress,
  applicationStepIndex,
} from "@/features/applications/ApplicationSummaryCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { findCompanyName, findField } from "@/utils/form-data-lookup";
import type { FormData, LoanApplication, LoanProduct } from "@/types";

interface ApplicationViewScreenProps {
  application: LoanApplication;
  product: LoanProduct;
  formData: FormData;
}

function formatOptionalDate(value?: string): string | null {
  if (!value) return null;
  try {
    return formatDate(value);
  } catch {
    return value;
  }
}

/** "WORKING_CAPITAL" → "Working capital". Option codes from the form are shown as words. */
function humanCode(code: string): string {
  const words = code.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ApplicationViewScreen({ application, product, formData }: ApplicationViewScreenProps) {
  const hasFormData = Object.keys(formData).length > 0;
  const submittedDate = formatOptionalDate(application.submittedAt);
  const updatedDate = formatOptionalDate(application.updatedAt);
  const company = findCompanyName(formData);
  const rawAmount = findField(formData, "loanAmount");
  const amountNumber = rawAmount === undefined ? NaN : Number(String(rawAmount).replace(/,/g, ""));
  const amountText = Number.isFinite(amountNumber) ? formatCurrency(amountNumber) : null;
  const termValue = findField(formData, "loanTerm");
  const purposeValue = findField(formData, "loanPurpose");
  // A purpose is a code, or an option object with a label, name, value or code.
  const purposeLabel = (item: unknown): string | null => {
    if (typeof item === "string") return item.includes(" ") ? item : humanCode(item);
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const raw = record.label ?? record.name ?? record.value ?? record.code;
      return typeof raw === "string" && raw ? (raw.includes(" ") ? raw : humanCode(raw)) : null;
    }
    return null;
  };
  const purposeItems = Array.isArray(purposeValue) ? purposeValue : purposeValue !== undefined ? [purposeValue] : [];
  const purposeText = purposeItems.map(purposeLabel).filter(Boolean).join(", ") || null;
  const requirementParts = [amountText, termValue !== undefined ? `${termValue} months` : null, purposeText].filter(
    (part): part is string => Boolean(part)
  );
  const stage =
    application.status === "rejected" ? "Rejected" : APPLICATION_STEPS[applicationStepIndex(application.status)];
  const templates = useMemo(() => product.templates, [product.templates]);
  const firstTab = templates[0]?.code ?? "";

  return (
    <div className="bg-background">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 pb-16 sm:px-8 sm:pb-20">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link
            href="/applications"
            className="rounded-sm transition-colors duration-200 hover:text-foreground hover:underline"
          >
            Applications
          </Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
          <span className="font-medium text-foreground" aria-current="page">
            {application.applicationNumber}
          </span>
        </nav>

        <section
          aria-labelledby="application-title"
          className="relative grid items-center gap-5 overflow-hidden rounded-xl bg-primary px-4 py-4 text-primary-foreground sm:px-6 sm:py-5 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-[90px] -right-[60px] h-[200px] w-[200px] rounded-full border-[32px] border-primary-foreground/[0.07]"
          />
          <div className="relative z-10 min-w-0">
            <h1
              id="application-title"
              className="text-xl font-semibold leading-7 tracking-tight"
            >
              Application details
            </h1>
            <p className="mt-1 text-[13px] font-semibold opacity-95">{product.name}</p>
            <p className="mt-2 max-w-[46ch] text-[13px] leading-5 opacity-90">
              {submittedDate ? (
                <>
                  Submitted <span className="num">{submittedDate}</span>
                </>
              ) : (
                "Not submitted yet"
              )}
              {updatedDate ? (
                <>
                  {" · "}Updated <span className="num">{updatedDate}</span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-[13px] leading-5 opacity-90">
              Stage <span className="font-semibold">{stage}</span>
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-3 rounded-[10px] bg-card px-4 py-3.5 text-foreground shadow-sm">
            {company ? (
              <p className="truncate text-[13px] font-semibold" data-testid="application-company">
                {company}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
              <code className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                {application.applicationNumber}
              </code>
              <ApplicationStatusBadge status={application.status} />
              <Badge variant="brand" dot={false}>
                View only
              </Badge>
            </div>
            {requirementParts.length > 0 ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold" data-testid="application-loan">
                {requirementParts.map((part, index) => (
                  <span key={`${part}-${index}`} className={index === 0 ? "num" : undefined}>
                    {index > 0 ? <span aria-hidden className="mr-2 text-muted-foreground">·</span> : null}
                    {part}
                  </span>
                ))}
              </p>
            ) : null}
            <ApplicationProgress status={application.status} />
          </div>
        </section>

        {hasFormData && templates.length > 0 ? (
          <Tabs defaultValue={firstTab} className="w-full">
            {/* Underline tabs, as on the document page. The bar scrolls sideways on phones. */}
            <div className="scroll -mx-1 overflow-x-auto px-1">
              <TabsList aria-label="Application sections" className="min-w-max">
                {templates.map((template) => (
                  <TabsTrigger key={template.code} value={template.code} className="text-[13px] font-semibold">
                    {template.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {templates.map((template) => (
              <TabsContent key={template.code} value={template.code} className="pt-5">
                <ApplicationFormSummary templates={[template]} formData={formData} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold text-foreground">No application data available</p>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              The submitted form details could not be found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
