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

/** Filled pill — wide rounded markers on a progress track. */
export function FilledPillStepper({
  templates,
  currentStep,
  stepStatuses,
  onStepClick,
}: StepperProps) {
  const steps = toStepperSteps(templates, currentStep, stepStatuses);

  return (
    <div>
      <MobileStepMenu steps={steps} onStepClick={onStepClick} />
      <DesktopSteps count={steps.length} currentStep={currentStep} trackTopClass="top-[17px] max-[900px]:top-[15px]">
        {steps.map((step) => (
          <StepButton key={step.key} step={step} onStepClick={onStepClick}>
            <span className={markerClass(step, "pill")}>{step.index + 1}</span>
            <StepLabel step={step} className="mt-3 max-[900px]:mt-2" />
          </StepButton>
        ))}
      </DesktopSteps>
    </div>
  );
}
