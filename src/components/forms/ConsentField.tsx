"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import type { FormField } from "@/types";
import { Button } from "@/components/ui/button";
import { useWizardAnswers, useWizardContinue } from "@/components/forms/application-context";
import { useFieldRules } from "@/components/forms/use-field-rules";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard.store";
import {
  acceptedConsentValue,
  activeLocale,
  allRequiredConsentsAccepted,
  bulkConsentRows,
  consentFieldPath,
  consentRowsFromSection,
  consentSummaryShouldClear,
  consentWording,
  CONSENT_CONTINUE_ERROR,
  evaluateConsentContinue,
  hashConsentText,
  isConsentAccepted,
  isConsentRecorded,
  resolveLocalizedCopy,
  type ConsentCheckRow,
} from "@/utils/consent";

const ConsentListContext = createContext<{
  summaryId?: string;
  summaryVisible: boolean;
  onAccepted: () => void;
} | null>(null);

function useConsentRows(fields: FormField[], namePrefix?: string): ConsentCheckRow[] {
  const { watch } = useFormContext();
  const formValues = watch();
  const wizardAnswers = useWizardAnswers();
  const inWizard = useWizardContinue() !== null;
  const wizardFormData = useWizardStore((state) => {
    const id = state.currentDraftId;
    return inWizard && id ? state.drafts[id]?.formData : undefined;
  });
  const scope = (namePrefix ? get(formValues, namePrefix) : formValues) as
    | Record<string, unknown>
    | undefined;
  return consentRowsFromSection(fields, scope ?? {}, formValues, wizardAnswers, wizardFormData);
}

/** Ticks a consent with its locale, then adds the hash of the wording once it is computed. */
function useAcceptConsent() {
  const { getValues, setValue } = useFormContext();
  return useCallback(
    (path: string, field: FormField) => {
      const version = field.consent?.version ?? "";
      const locale = activeLocale();
      const wording = consentWording(field, locale);
      setValue(path, acceptedConsentValue(version, locale), { shouldDirty: true, shouldTouch: true });
      if (!wording) return;
      hashConsentText(wording)
        .then((textHash) => {
          const current = getValues(path) as Record<string, unknown> | undefined;
          if (!isConsentAccepted(current, version) || current?.locale !== locale || current?.textHash) return;
          setValue(path, { ...current, textHash }, { shouldDirty: true });
        })
        .catch(() => {
          // SubtleCrypto is unavailable outside secure contexts; the server hashes the published wording.
        });
    },
    [getValues, setValue]
  );
}

function focusConsent(fieldName: string) {
  document.getElementById(fieldName)?.focus();
}

function safeFullTextUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    return new URL(url).protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function ConsentAcceptButton({
  fields,
  namePrefix,
}: {
  fields: FormField[];
  namePrefix?: string;
}) {
  const { setValue, clearErrors } = useFormContext();
  const list = useContext(ConsentListContext);
  const accept = useAcceptConsent();
  const rows = useConsentRows(fields, namePrefix);
  const bulk = bulkConsentRows(rows);
  if (bulk.length === 0) return null;

  const allAccepted = allRequiredConsentsAccepted(rows);
  const apply = (action: "accept" | "clear") => {
    for (const row of bulk) {
      const path = consentFieldPath(row.key, namePrefix);
      if (action === "clear") {
        setValue(path, null, { shouldDirty: true, shouldTouch: true });
        continue;
      }
      const field = fields.find((item) => item.name === row.key);
      if (!field) continue;
      accept(path, field);
      clearErrors(path);
    }
    if (action === "accept") list?.onAccepted();
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 rounded-lg bg-card px-3.5 font-medium shadow-none transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] max-sm:min-h-11"
      onClick={(event) => {
        event.stopPropagation();
        apply(allAccepted ? "clear" : "accept");
      }}
    >
      {allAccepted ? "Clear required" : "Accept required"}
    </Button>
  );
}

export function ConsentRow({ field, namePrefix }: { field: FormField; namePrefix?: string }) {
  const fieldName = consentFieldPath(field.name, namePrefix);
  const version = field.consent?.version ?? "";
  const { control, clearErrors, formState } = useFormContext();
  const { conditionallyRequired } = useFieldRules(field, namePrefix);
  const list = useContext(ConsentListContext);
  const accept = useAcceptConsent();
  const locale = activeLocale();
  const label = resolveLocalizedCopy(field.consent?.label ?? field.label, locale);
  const text = consentWording(field, locale);
  const fullTextUrl = safeFullTextUrl(field.consent?.fullTextUrl);
  const errorNode = get(formState.errors, fieldName) as { message?: string } | undefined;
  const misconfigured = version.length === 0;
  const error = misconfigured
    ? "This consent can't be accepted right now. Please contact support."
    : typeof errorNode?.message === "string"
      ? errorNode.message
      : undefined;
  const textId = `${fieldName}-text`;
  const errorId = `${fieldName}-error`;
  const recordedId = `${fieldName}-recorded`;
  const required = !!field.validation?.required || conditionallyRequired;

  return (
    <div className="border-b border-border py-3.5 last:border-b-0">
      <Controller
        name={fieldName}
        control={control}
        render={({ field: rhf }) => {
          const recorded = isConsentRecorded(rhf.value, version);
          const locked = !!(field.disabled || field.readonly) || misconfigured || recorded;
          const describedBy = [
            text ? textId : undefined,
            recorded ? recordedId : undefined,
            error ? errorId : undefined,
            list?.summaryVisible ? list.summaryId : undefined,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <>
              <label
                htmlFor={fieldName}
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 rounded-md transition-colors duration-200 ease-out",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  locked && "cursor-not-allowed",
                  locked && !recorded && "opacity-60"
                )}
              >
                <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0">
                  <input
                    type="checkbox"
                    id={fieldName}
                    name={rhf.name}
                    ref={rhf.ref}
                    checked={isConsentAccepted(rhf.value, version)}
                    disabled={locked}
                    aria-invalid={error ? true : undefined}
                    aria-required={required || undefined}
                    aria-describedby={describedBy || undefined}
                    onBlur={rhf.onBlur}
                    onChange={(event) => {
                      if (event.target.checked) {
                        accept(fieldName, field);
                        clearErrors(fieldName);
                        list?.onAccepted();
                      } else {
                        rhf.onChange(null);
                      }
                    }}
                    className="peer h-4 w-4 appearance-none rounded-[4px] border border-input bg-card checked:border-primary checked:bg-primary focus-visible:outline-none disabled:cursor-not-allowed"
                  />
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden h-4 w-4 text-primary-foreground peer-checked:block"
                  >
                    <path
                      d="M3.5 8.2 6.4 11l6.1-6.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight text-foreground">{label}</span>
                    {required ? (
                      <span className="inline-flex items-center rounded-md bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium leading-4 text-danger">
                        Required
                      </span>
                    ) : null}
                    {version ? (
                      <span className="text-xs font-normal text-muted-foreground">v{version}</span>
                    ) : null}
                  </span>
                  {text ? (
                    <span id={textId} className="mt-1 block text-[13px] font-normal leading-5 text-muted-foreground">
                      {text}
                    </span>
                  ) : null}
                </span>
              </label>
              {recorded ? (
                <p id={recordedId} className="mt-1 pl-7 text-xs text-muted-foreground">
                  {field.consent?.withdrawable
                    ? "Recorded. To withdraw this consent, contact support."
                    : "Recorded. This consent can't be withdrawn here."}
                </p>
              ) : null}
            </>
          );
        }}
      />
      {fullTextUrl ? (
        <div className="pb-0.5 pl-7">
          <a
            href={fullTextUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-primary underline-offset-2 transition-colors duration-200 ease-out hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Read full text
          </a>
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 pl-7 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ConsentList({
  fields,
  namePrefix,
  legend,
  showContinue = true,
}: {
  fields: FormField[];
  namePrefix?: string;
  legend: string;
  /** Repeatable entries set this to false so a step never shows one Continue per entry. */
  showContinue?: boolean;
}) {
  const { setError, formState } = useFormContext();
  const rows = useConsentRows(fields, namePrefix);
  const visible = rows.filter((row) => row.visible);
  const [summary, setSummary] = useState<string | null>(null);
  const previousRows = useRef(rows);
  const rowsRef = useRef(rows);
  const seenSubmit = useRef(0);
  const onWizardContinue = useWizardContinue();
  const summaryId = `${namePrefix ?? "consent"}-summary`;
  const progress = useMemo(() => evaluateConsentContinue(rows), [rows]);
  rowsRef.current = rows;

  useEffect(() => {
    if (consentSummaryShouldClear(previousRows.current, rows)) {
      setSummary(null);
    }
    previousRows.current = rows;
  }, [rows]);

  useEffect(() => {
    if (formState.submitCount === 0 || formState.submitCount === seenSubmit.current) return;
    seenSubmit.current = formState.submitCount;
    const result = evaluateConsentContinue(rowsRef.current);
    setSummary(result.ok ? null : CONSENT_CONTINUE_ERROR);
  }, [formState.submitCount]);

  if (visible.length === 0) return null;

  const continueFromList = () => {
    const result = evaluateConsentContinue(rows);
    if (result.ok) {
      setSummary(null);
      onWizardContinue?.();
      return;
    }
    for (const issue of result.fieldErrors) {
      setError(consentFieldPath(issue.key, namePrefix), {
        type: "required",
        message: issue.message,
      });
    }
    setSummary(result.summary);
    if (result.focusKey) focusConsent(consentFieldPath(result.focusKey, namePrefix));
  };

  return (
    <ConsentListContext.Provider
      value={{ summaryId, summaryVisible: !!summary, onAccepted: () => setSummary(null) }}
    >
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{legend}</legend>
        {visible.map((row) => {
          const field = fields.find((item) => item.name === row.key);
          if (!field) return null;
          return <ConsentRow key={row.key} field={field} namePrefix={namePrefix} />;
        })}
        {summary ? (
          <p id={summaryId} role="alert" className="text-sm text-destructive">
            {summary}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {progress.accepted} of {progress.total} accepted
          </p>
          {showContinue && onWizardContinue ? (
            <Button
              type="button"
              size="md"
              className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
              onClick={continueFromList}
            >
              Continue
            </Button>
          ) : null}
        </div>
      </fieldset>
    </ConsentListContext.Provider>
  );
}
