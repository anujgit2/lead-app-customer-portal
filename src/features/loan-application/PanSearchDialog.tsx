"use client";

import React, { useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kycService } from "@/services/kyc.service";
import type { ApiError, PanSearchQuery, PanVerifyResponse } from "@/types";
import { cn } from "@/lib/utils";
import {
  formatPanDisplayDate,
  getPanSearchPrefill,
  normalizePan,
  PAN_PATTERN,
  toPanApiDate,
  type PanSearchVariant,
} from "@/utils/pan-search";
import { usePanSearchScopeId, usePanVerification } from "./pan-search-context";

const inputClassName =
  "rounded-lg border-border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none";

const panSearchSchema = z.object({
  pan: z
    .string()
    .trim()
    .min(1, "PAN is required")
    .refine((value) => PAN_PATTERN.test(normalizePan(value)), {
      message: "Enter a valid 10-character PAN, e.g. ABCDE1234F",
    }),
  nameAsPerPan: z.string().trim().min(1, "Name as per PAN is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  consent: z.boolean().refine((value) => value === true, {
    message: "Consent is required to verify PAN",
  }),
});

type PanSearchFormValues = z.infer<typeof panSearchSchema>;

function mapValidationError(message: string): keyof PanSearchFormValues | "root" {
  const lower = message.toLowerCase();
  if (lower.includes("pan")) return "pan";
  if (lower.includes("name")) return "nameAsPerPan";
  if (lower.includes("date") || lower.includes("dob") || lower.includes("birth")) {
    return "dateOfBirth";
  }
  if (lower.includes("consent")) return "consent";
  return "root";
}

function MatchRow({
  label,
  value,
}: {
  label: string;
  value: boolean | null;
}) {
  const icon =
    value === true ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    ) : value === false ? (
      <XCircle className="h-4 w-4 text-warning-strong" />
    ) : (
      <CircleAlert className="h-4 w-4 text-muted-foreground" />
    );

  const text =
    value === true ? "Match" : value === false ? "Does not match" : "Not available";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-3.5 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        {text}
      </span>
    </div>
  );
}

function ResultCard({
  result,
  queried,
}: {
  result: PanVerifyResponse;
  queried: PanSearchQuery;
}) {
  const hasMismatch = result.nameMatch === false || result.dobMatch === false;
  const seeded =
    result.aadhaarSeedingStatus === "Y"
      ? "Linked"
      : result.aadhaarSeedingStatus === "N"
        ? "Not linked"
        : result.aadhaarSeedingStatus ?? "Not available";

  return (
    <div className="space-y-6">
      <Alert variant={result.valid ? (hasMismatch ? "warning" : "success") : "destructive"}>
        {result.valid ? (
          <ShieldCheck className="h-4 w-4" />
        ) : (
          <CircleAlert className="h-4 w-4" />
        )}
        <AlertTitle className="tracking-tight">
          {result.valid ? "PAN verified" : "PAN not verified"}
        </AlertTitle>
        <AlertDescription>
          {result.valid
            ? hasMismatch
              ? "The PAN is valid, but the name or date of birth did not fully match."
              : "This PAN matches the details you entered."
            : result.status
              ? `Vendor status: ${result.status}.`
              : "This PAN could not be verified with the details you entered."}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {result.pan ?? queried.pan}
        </p>
        {result.category && <Badge variant="info">{result.category}</Badge>}
        {result.status && (
          <Badge variant={result.valid ? "success" : "outline"}>{result.status}</Badge>
        )}
      </div>

      <div className="space-y-2">
        <MatchRow label="Name match" value={result.nameMatch} />
        <MatchRow label="Date of birth match" value={result.dobMatch} />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-3.5 py-2.5">
          <span className="text-sm text-muted-foreground">Aadhaar seeded</span>
          <span className="text-sm font-medium text-foreground">{seeded}</span>
        </div>
        {result.message && (
          <p className="text-sm text-muted-foreground">{result.message}</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          You searched
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name as per PAN</dt>
            <dd className="font-medium text-foreground">{queried.nameAsPerPan}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Date of birth</dt>
            <dd className="font-medium text-foreground">
              {formatPanDisplayDate(queried.dateOfBirth)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

interface PanSearchDialogProps {
  variant: PanSearchVariant;
}

export function PanSearchDialog({ variant }: PanSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "result">("form");
  const [queried, setQueried] = useState<PanSearchQuery | null>(null);
  const [result, setResult] = useState<PanVerifyResponse | null>(null);
  const formContext = useFormContext();
  const scopeId = usePanSearchScopeId();
  const { setRecord } = usePanVerification();

  const methods = useForm<PanSearchFormValues>({
    resolver: zodResolver(panSearchSchema),
    defaultValues: {
      pan: "",
      nameAsPerPan: "",
      dateOfBirth: "",
      consent: false,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = methods;

  const mutation = useMutation<PanVerifyResponse, ApiError, Parameters<typeof kycService.verifyPan>[0]>({
    mutationFn: (payload) => kycService.verifyPan(payload),
    onSuccess: (data, variables) => {
      const nextQuery: PanSearchQuery = {
        pan: variables.pan,
        nameAsPerPan: variables.nameAsPerPan,
        dateOfBirth: variables.dateOfBirth,
      };
      setQueried(nextQuery);
      setResult(data);
      setRecord(scopeId, { queried: nextQuery, result: data });
      setView("result");
    },
    onError: (error: ApiError) => {
      if (error.status === 400) {
        const field = mapValidationError(error.message);
        if (field === "root") {
          setError("root", { message: error.message });
          return;
        }
        setError(field, { message: error.message });
        return;
      }
      toast.error("Could not verify PAN. Please try again.");
    },
  });

  const openDialog = () => {
    const prefill = getPanSearchPrefill(formContext.getValues(), variant);
    reset({
      pan: prefill.pan,
      nameAsPerPan: prefill.nameAsPerPan,
      dateOfBirth: prefill.dateOfBirth,
      consent: false,
    });
    setView("form");
    setResult(null);
    setQueried(null);
    setOpen(true);
  };

  const onSubmit = (values: PanSearchFormValues) => {
    mutation.mutate({
      pan: normalizePan(values.pan),
      nameAsPerPan: values.nameAsPerPan.trim(),
      dateOfBirth: toPanApiDate(values.dateOfBirth),
      consent: "Y",
      reason: "For onboarding customers",
    });
  };

  const dobLabel = variant === "company" ? "Date of incorporation" : "Date of birth";
  const fieldId = `pan-search-${scopeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openDialog}
        className="shrink-0 gap-1.5 border-border text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-input hover:bg-muted/50 active:scale-[0.98] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
      >
        <Search className="h-3.5 w-3.5" />
        Search PAN
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              {view === "result" ? "PAN search result" : "Search PAN"}
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-muted-foreground">
              {view === "result"
                ? "Review the verification result. Confirming and filling the form will come in a later step."
                : variant === "company"
                  ? "Verify the business PAN against the name and date of incorporation on the PAN record."
                  : "Verify the owner PAN against the name and date of birth on the PAN record."}
            </DialogDescription>
          </DialogHeader>

          {view === "form" ? (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-pan`} className="text-muted-foreground">
                  PAN
                </Label>
                <Input
                  id={`${fieldId}-pan`}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  autoComplete="off"
                  error={!!errors.pan}
                  className={cn(inputClassName, "uppercase")}
                  {...register("pan", {
                    onChange: (event) => {
                      const next = normalizePan(event.target.value).slice(0, 10);
                      setValue("pan", next, { shouldValidate: false, shouldDirty: true });
                    },
                  })}
                />
                {errors.pan && (
                  <p className="text-xs text-destructive">{errors.pan.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-name`} className="text-muted-foreground">
                  Name as per PAN
                </Label>
                <Input
                  id={`${fieldId}-name`}
                  placeholder="Enter full name as on the PAN card"
                  autoComplete="off"
                  error={!!errors.nameAsPerPan}
                  className={inputClassName}
                  {...register("nameAsPerPan")}
                />
                {errors.nameAsPerPan && (
                  <p className="text-xs text-destructive">{errors.nameAsPerPan.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${fieldId}-dob`} className="text-muted-foreground">
                  {dobLabel}
                </Label>
                <Input
                  id={`${fieldId}-dob`}
                  type="date"
                  error={!!errors.dateOfBirth}
                  className={inputClassName}
                  {...register("dateOfBirth")}
                />
                {errors.dateOfBirth && (
                  <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4">
                <Controller
                  name="consent"
                  control={control}
                  render={({ field }) => (
                    <label
                      htmlFor={`${fieldId}-consent`}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        id={`${fieldId}-consent`}
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
                      />
                      <span>
                        I consent to verify this PAN for onboarding this loan application.
                      </span>
                    </label>
                  )}
                />
                {errors.consent && (
                  <p className="text-xs text-destructive">{errors.consent.message}</p>
                )}
              </div>

              {errors.root?.message && (
                <p className="text-sm text-destructive">{errors.root.message}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-border transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={mutation.isPending}
                  className="gap-1.5 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Verify PAN
                </Button>
              </DialogFooter>
            </form>
          ) : (
            result &&
            queried && (
              <div className="space-y-6">
                <ResultCard result={result} queried={queried} />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setView("form")}
                    className="border-border transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Search again
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
