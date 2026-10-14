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
      <div
        className="grid"
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
                "relative z-[1] grid h-8 w-8 place-items-center rounded-full border-2 bg-card text-[13px] font-semibold",
                "border-input text-muted-foreground",
                done && "border-primary bg-primary text-primary-foreground",
                isCurrent &&
                  "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_hsl(var(--primary)/0.2)]"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
          );

          const label = (
            <span
              className={cn(
                "max-w-[140px] text-center text-xs leading-[18px] text-muted-foreground sm:text-[13px]",
                isCurrent && "text-[13px] font-semibold text-foreground sm:text-[13.5px]"
              )}
            >
              {step.label}
            </span>
          );

          const shell = cn(
            "relative flex min-w-0 flex-col items-center gap-2 px-1 text-center",
            index > 0 &&
              "before:absolute before:left-[calc(-50%+22px)] before:right-[calc(50%+22px)] before:top-4 before:h-[3px] before:rounded-full before:bg-border",
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
