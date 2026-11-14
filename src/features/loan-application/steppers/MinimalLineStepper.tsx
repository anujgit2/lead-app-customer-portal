"use client";

import {
  DesktopSteps,
  MobileStepMenu,
  StepButton,
  StepLabel,
  markerClass,
  toStepperSteps,
  type StepperProps,
} from "@/features/loan-application/steppers/shared";

/** Minimal line — numbered circles on a single progress track. Default stepper. */
export function MinimalLineStepper({
  templates,
  currentStep,
  stepStatuses,
  onStepClick,
}: StepperProps) {
  const steps = toStepperSteps(templates, currentStep, stepStatuses);

  return (
    <div>
      <MobileStepMenu steps={steps} onStepClick={onStepClick} />
      <DesktopSteps count={steps.length} currentStep={currentStep} trackTopClass="top-[14px] max-[900px]:top-3">
        {steps.map((step) => (
          <StepButton key={step.key} step={step} onStepClick={onStepClick}>
            <span className={markerClass(step, "minimal")}>{step.index + 1}</span>
            <StepLabel step={step} />
          </StepButton>
        ))}
      </DesktopSteps>
    </div>
  );
}
