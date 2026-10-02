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
    <div className="min-h-screen bg-slate-50/70">
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-30 shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          <Link
            href="/applications"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-slate-900 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:rounded-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to applications
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-slate-900 leading-snug">
                  {product.name}
                </h1>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                {application.applicationNumber}
                {createdDate ? ` · Created ${createdDate}` : ""}
                {submittedDate ? ` · Submitted ${submittedDate}` : ""}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">
              View only
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Application details
            </h2>
            <p className="mt-1 text-sm font-normal text-slate-500">
              This application has been submitted and can no longer be edited.
            </p>
          </div>
          {hasFormData && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-500">
              <Checkbox
                checked={hideEmpty}
                onCheckedChange={(checked) => setHideEmpty(checked === true)}
                className="border-slate-300"
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
          <div className="rounded-xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-900">
              No application data available
            </p>
            <p className="mt-1 text-sm font-normal text-slate-500">
              The submitted form details could not be found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
