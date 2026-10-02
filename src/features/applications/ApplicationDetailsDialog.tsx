"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarDays, FileText, X } from "lucide-react";
import { ApplicationFormSummary } from "@/features/loan-application/ReviewScreen";
import {
  applicationService,
  resolveApplicationFormData,
} from "@/services/application.service";
import { parseApiError } from "@/lib/api-error";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ApplicationStatus,
  LoanApplication,
} from "@/types";

interface ApplicationDetailsDialogProps {
  application: LoanApplication | null;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<
  ApplicationStatus,
  {
    label: string;
    variant:
      | "success"
      | "warning"
      | "destructive"
      | "info"
      | "draft"
      | "default";
  }
> = {
  draft: { label: "Draft", variant: "draft" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  disbursed: { label: "Disbursed", variant: "success" },
};

export function ApplicationDetailsDialog({
  application,
  onOpenChange,
}: ApplicationDetailsDialogProps) {
  const applicationId = application?.id;
  const {
    data: details,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () => applicationService.getApplication(applicationId as string),
    enabled: Boolean(applicationId),
  });

  const programLookup = details?.programCode || details?.programId;
  const {
    data: product,
    isLoading: isLoadingProduct,
    error: productError,
  } = useQuery({
    queryKey: ["application-product", applicationId, programLookup],
    queryFn: () =>
      programLookup
        ? applicationService.getLoanProductByProgramId(programLookup)
        : applicationService.getLoanProducts().then((products) => products[0]),
    enabled: Boolean(details),
  });

  const displayedApplication = details ?? application;
  const error = detailsError ?? productError;
  const formData = useMemo(
    () => (details && product ? resolveApplicationFormData(details, product) : null),
    [details, product]
  );
  const isLoading = isLoadingDetails || (Boolean(details) && isLoadingProduct);
  const status = displayedApplication
    ? statusConfig[displayedApplication.status]
    : null;

  return (
    <Dialog open={Boolean(application)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto border border-slate-100 p-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] [&>button]:hidden">
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-100 bg-background/95 px-6 py-5 text-left backdrop-blur-sm sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                  Application details
                </DialogTitle>
                {status && <Badge variant={status.variant}>{status.label}</Badge>}
              </div>
              <DialogDescription className="mt-1.5">
                {displayedApplication?.applicationNumber ??
                  "Loading application information"}
              </DialogDescription>
            </div>
            <DialogClose className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98]">
              <X className="h-4 w-4" />
              Close
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-8 sm:px-8">
          {displayedApplication && (
            <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-5 shadow-sm sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs font-normal text-slate-500">Loan product</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {displayedApplication.loanType}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-normal text-slate-500">Requested amount</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(displayedApplication.loanAmount)}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs font-normal text-slate-500">
                    {displayedApplication.submittedAt
                      ? "Submitted on"
                      : "Last updated"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(
                      displayedApplication.submittedAt ??
                        displayedApplication.updatedAt
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4" aria-label="Loading application details">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Unable to load application details</p>
                <p className="mt-1 opacity-80">{parseApiError(error).message}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && details && product && (
            <>
              {formData && Object.keys(formData).length > 0 ? (
                <ApplicationFormSummary
                  templates={product.templates}
                  formData={formData}
                />
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-8 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    No application data available
                  </p>
                  <p className="mt-1 text-sm font-normal text-slate-500">
                    The submitted form details could not be found.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
