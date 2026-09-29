"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormTemplate, WizardStepStatus } from "@/types";

interface WizardProgressProps {
  templates: FormTemplate[];
  currentStep: number;
  stepStatuses: WizardStepStatus[];
  onStepClick?: (index: number) => void;
}

export function WizardProgress({
  templates,
  currentStep,
  stepStatuses,
  onStepClick,
}: WizardProgressProps) {
  const totalSteps = templates.length + 1;

  return (
    <div className="w-full">
      {/* Mobile compact progress */}
      <div className="flex items-center gap-2 sm:hidden mb-2">
        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop step indicator */}
      <div className="hidden sm:block">
        <div
          className="grid items-start"
          style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
        >
          {templates.map((template, index) => {
            const isCurrent = index === currentStep;
            const isCompleted = Boolean(stepStatuses[index]?.completed);
            const canNavigate = index <= currentStep || isCompleted;

            return (
              <button
                key={template.code}
                type="button"
                onClick={() => canNavigate && onStepClick?.(index)}
                disabled={!canNavigate}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-1 transition-all duration-200 ease-out active:scale-[0.98]",
                  canNavigate
                    ? "cursor-pointer hover:-translate-y-0.5"
                    : "cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200 ease-out",
                    isCurrent && "bg-primary shadow-sm shadow-primary/25",
                    isCompleted && !isCurrent && "bg-emerald-500",
                    !isCurrent &&
                      !isCompleted &&
                      "border-2 border-slate-300 bg-white"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-3.5 w-3.5 stroke-[3] text-white" />
                  ) : isCurrent ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "max-w-[110px] text-center text-xs leading-tight transition-colors duration-200",
                    isCurrent
                      ? "font-semibold text-slate-900"
                      : isCompleted
                        ? "font-medium text-slate-700"
                        : "font-normal text-slate-500"
                  )}
                >
                  {template.title}
                </span>
              </button>
            );
          })}

          <div
            aria-current={currentStep === templates.length ? "step" : undefined}
            className="flex min-w-0 flex-col items-center gap-2 px-1 py-1"
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200 ease-out",
                currentStep === templates.length
                  ? "bg-primary shadow-sm shadow-primary/25"
                  : "border-2 border-slate-300 bg-white"
              )}
            >
              {currentStep === templates.length && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
            <span
              className={cn(
                "text-center text-xs leading-tight",
                currentStep === templates.length
                  ? "font-semibold text-slate-900"
                  : "font-normal text-slate-500"
              )}
            >
              Review
            </span>
          </div>
        </div>

        <div className="mt-3 border-t-2 border-slate-200" />
      </div>
    </div>
  );
}
