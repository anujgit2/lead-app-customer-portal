"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DesktopSteps,
  MobileStepMenu,
  StepButton,
  StepGlyph,
  StepLabel,
  toStepperSteps,
  type StepperProps,
} from "@/features/loan-application/steppers/shared";

/** Card — each step is a mini card with a number, icon, and label. */
export function CardStepper({
  templates,
  currentStep,
  stepStatuses,
  onStepClick,
}: StepperProps) {
  const steps = toStepperSteps(templates, currentStep, stepStatuses);

  return (
    <div>
      <MobileStepMenu steps={steps} onStepClick={onStepClick} />
      <DesktopSteps count={steps.length} currentStep={currentStep} className="gap-2 max-[900px]:gap-1">
        {steps.map((step) => (
          <StepButton
            key={step.key}
            step={step}
            onStepClick={onStepClick}
            className={cn(
              "h-full min-h-[104px] w-full justify-start rounded-[11px] border border-slate-200 bg-white px-1 pb-2.5 pt-3 shadow-[0_2px_5px_rgba(23,43,77,0.03)] max-[900px]:min-h-24",
              step.state === "active" &&
                "border-primary/35 bg-gradient-to-b from-white to-primary-soft shadow-[0_3px_9px_hsl(var(--primary)/0.07)]",
              step.state === "done" && "border-primary/20"
            )}
          >
            <span
              className={cn(
                "absolute left-1.5 top-1.5 grid h-[21px] w-[21px] place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600",
                step.state === "active" && "bg-primary text-white",
                step.state === "done" && "bg-primary-soft text-primary"
              )}
            >
              {step.state === "done" ? (
                <Check className="h-3 w-3" strokeWidth={2.5} />
              ) : (
                step.index + 1
              )}
            </span>
            <span
              className={cn(
                "mt-1.5 grid h-[31px] place-items-center text-slate-400",
                step.state === "active" && "text-primary"
              )}
            >
              <StepGlyph step={step} className="h-[21px] w-[21px]" />
            </span>
            <StepLabel step={step} className="mt-1.5 text-[11px] leading-tight max-[900px]:text-[10px]" />
          </StepButton>
        ))}
      </DesktopSteps>
    </div>
  );
}
