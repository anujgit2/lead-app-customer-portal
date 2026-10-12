"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormTemplate, WizardStepStatus } from "@/types";

interface WizardProgressProps {
  templates: FormTemplate[];
  currentStep: number;
  stepStatuses: WizardStepStatus[];
  onStepClick?: (index: number) => void;
  /** Always show the step dots, including on small screens. */
  compact?: boolean;
}

export function WizardProgress({
  templates,
  currentStep,
  stepStatuses,
  onStepClick,
  compact = false,
}: WizardProgressProps) {
  const steps = [
    ...templates.map((template, index) => ({
      key: template.code,
      label: template.title,
      index,
    })),
    { key: "review", label: "Review", index: templates.length },
  ];

  return (
    <div className="w-full">
      <div className={cn("mb-2 flex items-center gap-3 sm:hidden", compact && "hidden")}>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div
        className={cn("hidden sm:grid", compact && "grid")}
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label="Application steps"
      >
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isCompleted = index < templates.length && Boolean(stepStatuses[index]?.completed);
          const done = isCompleted && !isCurrent;
          const canNavigate = index <= currentStep || isCompleted;
          const lineFilled = index > 0 && (isCurrent || done || index < currentStep);

          const dot = (
            <span
              className={cn(
                "relative z-[1] grid h-7 w-7 place-items-center rounded-full border-2 border-input bg-card text-xs font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-primary text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.16)]"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
          );

          const label = (
            <span
              className={cn(
                "max-w-[120px] text-center text-[13px] leading-[18px] text-muted-foreground",
                isCurrent && "font-semibold text-foreground"
              )}
            >
              {step.label}
            </span>
          );

          const shell = cn(
            "relative flex min-w-0 flex-col items-center gap-2 px-1 text-center",
            index > 0 &&
              "before:absolute before:left-[calc(-50%+18px)] before:right-[calc(50%+18px)] before:top-[13px] before:h-0.5 before:bg-border",
            lineFilled && "before:bg-primary"
          );

          if (step.key === "review") {
            return (
              <div key={step.key} className={shell} aria-current={isCurrent ? "step" : undefined}>
                {dot}
                {label}
              </div>
            );
          }

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => canNavigate && onStepClick?.(index)}
              disabled={!canNavigate}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(shell, canNavigate ? "cursor-pointer" : "cursor-not-allowed")}
            >
              {dot}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
