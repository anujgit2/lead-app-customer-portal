"use client";

import React from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
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
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Desktop step indicator */}
      <div className="hidden sm:flex items-center">
        {templates.map((template, index) => {
          const status = stepStatuses[index];
          const isCurrent = index === currentStep;
          const isCompleted = status?.completed;
          const isPast = index < currentStep;
          const canNavigate = isPast || isCurrent;

          return (
            <React.Fragment key={template.code}>
              <button
                type="button"
                onClick={() => canNavigate && onStepClick?.(index)}
                disabled={!canNavigate}
                className={cn(
                  "flex flex-col items-center gap-1.5 min-w-0 group",
                  canNavigate ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-semibold transition-all duration-200",
                    isCurrent &&
                      "border-primary bg-primary text-white shadow-md shadow-primary/30 scale-110",
                    isCompleted && !isCurrent &&
                      "border-green-500 bg-green-500 text-white",
                    !isCurrent && !isCompleted &&
                      "border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs text-center leading-tight max-w-[80px] transition-colors",
                    isCurrent ? "text-primary font-semibold" :
                    isCompleted ? "text-foreground" :
                    "text-muted-foreground"
                  )}
                >
                  {template.title}
                </span>
              </button>

              {index < templates.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 transition-all duration-500",
                    isPast ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Review step */}
        <>
          <div className={cn("flex-1 h-0.5 mx-1", currentStep >= templates.length ? "bg-green-500" : "bg-muted")} />
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-semibold transition-all",
                currentStep === templates.length
                  ? "border-primary bg-primary text-white shadow-md shadow-primary/30 scale-110"
                  : "border-muted-foreground/30 bg-background text-muted-foreground"
              )}
            >
              <span>{templates.length + 1}</span>
            </div>
            <span
              className={cn(
                "text-xs text-center leading-tight max-w-[80px]",
                currentStep === templates.length
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              Review
            </span>
          </div>
        </>
      </div>
    </div>
  );
}
