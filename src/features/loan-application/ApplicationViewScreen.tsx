"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ApplicationFormSummary } from "@/features/loan-application/ReviewScreen";
import { ApplicationStatusBadge } from "@/features/applications/ApplicationStatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from "@/lib/utils";
import type { FormData, LoanApplication, LoanProduct } from "@/types";

interface ApplicationViewScreenProps {
  application: LoanApplication;
  product: LoanProduct;
  formData: FormData;
}

export function ApplicationViewScreen({
  application,
  product,
  formData,
}: ApplicationViewScreenProps) {
  const [hideEmpty, setHideEmpty] = useState(false);
  const hasFormData = Object.keys(formData).length > 0;

  let createdDate = application.createdAt;
  try {
    createdDate = formatDate(application.createdAt);
  } catch {
    /* keep original */
  }

  let submittedDate: string | null = null;
  if (application.submittedAt) {
    try {
      submittedDate = formatDate(application.submittedAt);
    } catch {
      submittedDate = application.submittedAt;
    }
  }

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:rounded-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to applications
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-foreground leading-snug">
                  {product.name}
                </h1>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {application.applicationNumber}
                {createdDate ? ` · Created ${createdDate}` : ""}
                {submittedDate ? ` · Submitted ${submittedDate}` : ""}
              </p>
            </div>
            <p className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              View only
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Application details
            </h2>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              This application has been submitted and can no longer be edited.
            </p>
          </div>
          {hasFormData && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={hideEmpty}
                onCheckedChange={(checked) => setHideEmpty(checked === true)}
                className="border-input"
              />
              Hide empty fields
            </label>
          )}
        </div>

        {hasFormData ? (
          <ApplicationFormSummary
            templates={product.templates}
            formData={formData}
            hideEmpty={hideEmpty}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              No application data available
            </p>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              The submitted form details could not be found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
